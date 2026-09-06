import "server-only";
import { getTranslations } from "next-intl/server";

/**
 * Prüft Minecraft-Namen gegen Mojang.
 *
 * Die öffentliche Namensauflösung braucht keinen Schlüssel: 200 heißt „gibt es",
 * 404 heißt „gibt es nicht". Alles andere (429 bei zu vielen Anfragen, 5xx bei
 * einer Störung) ist keine Aussage über den Namen – dann darf niemand
 * ausgebremst werden, sonst hängt der Whitelist-Antrag an Mojangs Laune.
 *
 * Nebeneffekt, den wir mitnehmen: Mojang liefert die kanonische Schreibweise
 * zurück. Wer „steve_42" eintippt, wird als „Steve_42" gespeichert – wichtig,
 * weil Whitelist-Befehle und Statistikdateien genau diese Schreibweise nutzen.
 */

const API = "https://api.mojang.com/users/profiles/minecraft";

export type NamensPruefung =
  /** Mojang kennt den Namen. `name` ist die offizielle Schreibweise. */
  | { status: "gefunden"; name: string; uuid: string }
  /** Mojang kennt den Namen nicht – hier ist ein Tippfehler wahrscheinlich. */
  | { status: "unbekannt" }
  /** Mojang war nicht erreichbar; wir wissen es schlicht nicht. */
  | { status: "unklar" };

export async function lookupMinecraftName(name: string): Promise<NamensPruefung> {
  const treffer = await einmalFragen(name);

  /*
   * Ein „gibt es nicht" wird nur geglaubt, wenn es zweimal kommt.
   * Mojangs Namensauflösung antwortet unter Last gelegentlich mit 404, obwohl
   * es den Namen gibt – und ein falsches „gibt es nicht" ist hier besonders
   * ärgerlich: Es hindert jemanden daran, den eigenen, korrekten Namen
   * einzutragen. Der zweite Versuch kostet nur im Fehlerfall Zeit.
   */
  if (treffer.status !== "unbekannt") return treffer;

  await new Promise((fertig) => setTimeout(fertig, 300));
  return einmalFragen(name);
}

async function einmalFragen(name: string): Promise<NamensPruefung> {
  let response: Response;
  try {
    response = await fetch(`${API}/${encodeURIComponent(name)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });
  } catch (error) {
    console.error("[mojang] Namensabfrage fehlgeschlagen:", error);
    return { status: "unklar" };
  }

  if (response.status === 404) return { status: "unbekannt" };

  if (!response.ok) {
    console.error(`[mojang] Unerwartete Antwort ${response.status} bei der Namensabfrage.`);
    return { status: "unklar" };
  }

  try {
    const data = (await response.json()) as { id?: string; name?: string };
    if (!data.id || !data.name) return { status: "unklar" };
    return { status: "gefunden", name: data.name, uuid: data.id };
  } catch {
    return { status: "unklar" };
  }
}

/**
 * Bequemer Aufruf für Formulare: gibt entweder die zu speichernde Schreibweise
 * zurück oder eine fertige Fehlermeldung.
 *
 * Bei „unklar" geht der Name unverändert durch. Ein Ausfall bei Mojang soll
 * niemanden daran hindern, seinen Antrag abzuschicken.
 */
export async function pruefeGamertag(
  name: string,
): Promise<{ ok: true; name: string; uuid: string | null } | { ok: false; error: string }> {
  const treffer = await lookupMinecraftName(name);

  if (treffer.status === "unbekannt") {
    const t = await getTranslations("MojangCheck");
    return { ok: false, error: t("notFound", { name }) };
  }

  if (treffer.status === "gefunden") {
    return { ok: true, name: treffer.name, uuid: mitBindestrichen(treffer.uuid) };
  }

  // „unklar": Der Name geht unveraendert durch, eine UUID haben wir dann nicht.
  return { ok: true, name, uuid: null };
}

/**
 * Mojang liefert die UUID OHNE Bindestriche
 * ("2bb0b0533c2b40a6996463d1b7e2629c"), im Spiel und damit auch im
 * Spielprotokoll und bei Numismatics steht sie MIT
 * ("2bb0b053-3c2b-40a6-9964-63d1b7e2629c").
 *
 * Beide Formen nebeneinander in der Datenbank wären ein stiller Fehler: Der
 * Abgleich mit dem Protokoll ginge daneben, und `UUID.fromString` im
 * KubeJS-Skript nimmt ausschließlich die Form mit Bindestrichen an. Deshalb
 * wird hier auf die lange Form vereinheitlicht.
 */
export function mitBindestrichen(uuid: string): string {
  const roh = uuid.replace(/-/g, "").toLowerCase();
  if (roh.length !== 32) return uuid;
  return `${roh.slice(0, 8)}-${roh.slice(8, 12)}-${roh.slice(12, 16)}-${roh.slice(16, 20)}-${roh.slice(20)}`;
}
