import "server-only";
import { unstable_rethrow } from "next/navigation";
import { craftyConfigured, craftyReadFile } from "@/lib/crafty";

/**
 * Die echte Whitelist des Minecraft-Servers.
 *
 * Die Website führt in ihrer Datenbank einen eigenen Schalter (`User.whitelisted`)
 * und schickt bei jeder Änderung `whitelist add`/`remove` an die Konsole. Geht so
 * ein Befehl unter – Server aus, Crafty nicht erreichbar, Vormerkung noch offen –
 * laufen beide Stände auseinander, ohne dass es jemandem auffällt.
 *
 * Hier wird deshalb die Quelle selbst gelesen: `whitelist.json` im
 * Serververzeichnis. Minecraft schreibt die Datei sofort bei jedem `whitelist
 * add`/`remove`, sie ist also auch bei laufendem Server aktuell – und bei einem
 * ausgeschalteten Server steht dort weiterhin der zuletzt gültige Stand.
 */

const DATEI = "whitelist.json";

/** Ein Eintrag aus `whitelist.json` – Minecraft schreibt UUID und Schreibweise. */
export type ServerWhitelistEintrag = { uuid?: string; name?: string };

export type ServerWhitelistErgebnis =
  | { ok: true; eintraege: ServerWhitelistEintrag[] }
  | { ok: false; error: string };

/** Liest `whitelist.json` vom Server. Fehler kommen als Text zurück, nicht als Ausnahme. */
export async function leseServerWhitelist(): Promise<ServerWhitelistErgebnis> {
  if (!craftyConfigured) {
    return { ok: false, error: "Crafty ist nicht konfiguriert – die Server-Whitelist lässt sich nicht lesen." };
  }

  try {
    const inhalt: unknown = JSON.parse(await craftyReadFile(DATEI));
    if (!Array.isArray(inhalt)) {
      return { ok: false, error: `${DATEI} hat ein unerwartetes Format.` };
    }
    return { ok: true, eintraege: inhalt as ServerWhitelistEintrag[] };
  } catch (error) {
    // Next signalisiert dynamisches Rendern über geworfene Fehler – nicht schlucken.
    unstable_rethrow(error);
    const grund = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `${DATEI} konnte nicht gelesen werden: ${grund}` };
  }
}

/**
 * Steht dieser Name auf der Server-Whitelist?
 *
 * Verglichen wird ohne Rücksicht auf Groß- und Kleinschreibung: Minecraft nimmt
 * `whitelist add` in jeder Schreibweise an und legt in der Datei die offizielle
 * ab. Bei einem Treffer kommt genau diese Schreibweise zurück – daran fällt auch
 * auf, wenn hier ein Name mit anderer Schreibweise gespeichert ist.
 */
export function findeEintrag(
  eintraege: ServerWhitelistEintrag[],
  minecraftName: string,
): ServerWhitelistEintrag | null {
  const gesucht = minecraftName.trim().toLowerCase();
  if (!gesucht) return null;
  return eintraege.find((eintrag) => (eintrag.name ?? "").toLowerCase() === gesucht) ?? null;
}
