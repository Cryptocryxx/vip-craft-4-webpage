import "server-only";

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
export async function pruefeGamertag(name: string): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const treffer = await lookupMinecraftName(name);

  if (treffer.status === "unbekannt") {
    return { ok: false, error: `Den Minecraft-Namen „${name}“ gibt es nicht. Bitte prüf die Schreibweise.` };
  }

  return { ok: true, name: treffer.status === "gefunden" ? treffer.name : name };
}
