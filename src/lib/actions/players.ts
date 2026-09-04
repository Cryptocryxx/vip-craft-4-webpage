"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/admin";
import { findPlayerIp, protokolliere, saveAndRefresh } from "@/lib/players";
import { runPlayerCommand } from "@/lib/server-commands";
import { GAMERTAG_RE } from "@/lib/whitelist-types";

export type PlayerActionState = { error?: string; success?: string };

/** Wartezeit zwischen zwei Aktualisierungen – pro Person, wie gewünscht. */
const SPERRE_MINUTEN = 10;

/**
 * Wer wann zuletzt aktualisiert hat.
 *
 * Bewusst nur im Arbeitsspeicher: Nach einem Neustart der Website darf jeder
 * wieder – das ist harmlos, weil `saveAndRefresh()` zusätzlich eine serverweite
 * Sperre von einer Minute hat. Die schützt den Minecraft-Server, diese hier
 * verteilt nur fair.
 */
const letzteAktualisierung = new Map<string, number>();

function verbleibendeMinuten(schluessel: string): number {
  const zuletzt = letzteAktualisierung.get(schluessel);
  if (zuletzt === undefined) return 0;
  const vergangen = Date.now() - zuletzt;
  const rest = SPERRE_MINUTEN * 60_000 - vergangen;
  return rest > 0 ? Math.ceil(rest / 60_000) : 0;
}

/** Stößt ein Speichern auf dem Server an, damit die Statistiken aktuell werden. */
export async function refreshPlayerStatsAction(): Promise<PlayerActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Dafür musst du eingeloggt sein – sonst ließe sich die Wartezeit nicht zuordnen." };
  }

  const rest = verbleibendeMinuten(session.user.id);
  if (rest > 0) {
    return { error: `Schon aktualisiert. Nächster Versuch in ${rest} ${rest === 1 ? "Minute" : "Minuten"}.` };
  }

  const ergebnis = await saveAndRefresh();
  letzteAktualisierung.set(session.user.id, Date.now());

  revalidatePath("/spieler", "layout");
  return { success: ergebnis.hinweis };
}

// ---------------------------------------------------------------------------
// Kontrollraum
// ---------------------------------------------------------------------------

function pruefeName(name: string): string | null {
  return GAMERTAG_RE.test(name) ? null : "Ungültiger Minecraft-Name.";
}

async function fuehreAus(
  type: "KICK" | "BAN" | "UNBAN",
  name: string,
  befehl: string,
  grund: string,
): Promise<PlayerActionState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Kein Admin-Zugriff." };
  }

  const fehler = pruefeName(name);
  if (fehler) return { error: fehler };

  const ergebnis = await runPlayerCommand(befehl, grund, admin);
  await protokolliere(type, name, grund, admin, ergebnis.ok);

  revalidatePath("/admin/users");
  revalidatePath("/spieler", "layout");

  if (!ergebnis.ok) return { error: `Befehl fehlgeschlagen: ${ergebnis.error}` };

  const meldungen = {
    KICK: `${name} wurde vom Server geworfen.`,
    BAN: `${name} ist jetzt gebannt.`,
    UNBAN: `Der Bann für ${name} wurde aufgehoben.`,
  };
  return { success: meldungen[type] };
}

export async function kickPlayerAction(name: string, grund: string): Promise<PlayerActionState> {
  const text = grund.trim() || "Vom Team entfernt";
  return fuehreAus("KICK", name, `kick ${name} ${text}`, text);
}

export async function banPlayerAction(name: string, grund: string): Promise<PlayerActionState> {
  const text = grund.trim() || "Vom Team gebannt";
  return fuehreAus("BAN", name, `ban ${name} ${text}`, text);
}

export async function unbanPlayerAction(name: string): Promise<PlayerActionState> {
  return fuehreAus("UNBAN", name, `pardon ${name}`, "Bann aufgehoben");
}

/**
 * Zeigt die letzte bekannte IP eines Spielers – und schreibt mit, wer sie
 * abgerufen hat. Eine IP ist ein personenbezogenes Datum; ohne Protokoll
 * wäre das nicht nachvollziehbar (siehe Datenschutzerklärung, Ziffer 5a).
 */
export async function revealPlayerIpAction(name: string): Promise<PlayerActionState & { ip?: string }> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Kein Admin-Zugriff." };
  }

  const fehler = pruefeName(name);
  if (fehler) return { error: fehler };

  const ip = await findPlayerIp(name);
  await protokolliere("IP_VIEW", name, ip ? "IP abgerufen" : "IP abgerufen, keine gefunden", admin, ip !== null);
  revalidatePath("/admin/users");

  if (!ip) {
    return {
      error: `Für ${name} steht keine IP im laufenden Server-Log. Sie erscheint erst, wenn er sich seit dem letzten Serverstart angemeldet hat.`,
    };
  }
  return { success: `Letzte bekannte IP von ${name}`, ip };
}
