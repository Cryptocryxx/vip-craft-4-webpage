import "server-only";
import { unstable_rethrow } from "next/navigation";
import { craftyConfigured, craftyReadJson } from "@/lib/crafty";
import { SPURS_PER_COG } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { runPlayerCommand } from "@/lib/server-commands";
import { getSiteSettings } from "@/lib/settings";
import { GAMERTAG_RE } from "@/lib/whitelist-types";

/**
 * Tägliches Gehalt.
 *
 * Einmal pro KALENDERTAG, nicht alle 24 Stunden – so wie abgesprochen: Wer um
 * 23:59 abholt, ist um 0:00 wieder dran. Der Tag wird deshalb als Datum in
 * Europe/Berlin geführt (siehe `heutigerTag`), nicht als Zeitstempel.
 *
 * Ausgezahlt wird auf das Numismatics-Bankkonto im Spiel. Den Weg dorthin
 * öffnet das KubeJS-Skript salary.js: Es nimmt den Konsolenbefehl `vipgehalt`
 * entgegen und schreibt jede Buchung nach kubejs/data/salary.json. Genau diese
 * Quittung wird hier gelesen – erst wenn sie da ist, gilt der Tag als
 * abgeholt. Crafty allein sagt nur, dass der Befehl in der Konsole gelandet
 * ist, nicht dass er etwas bewirkt hat.
 */

const QUITTUNGSDATEI = "kubejs/data/salary.json";

/** Zeitzone des Servers und der Spieler – daran hängt, wann „morgen" beginnt. */
const ZEITZONE = "Europe/Berlin";

type Quittung = { claimId?: string; uuid?: string; spurs?: number; balanceAfter?: number; at?: string };
type QuittungsDatei = {
  generatedAt?: string;
  ready?: boolean;
  errors?: Array<{ at?: string; error?: string }>;
  payouts?: Quittung[];
};

/**
 * Der heutige Tag als "YYYY-MM-DD" in Europe/Berlin.
 *
 * `en-CA` liefert genau dieses Format – bequemer als das Datum aus Teilen
 * zusammenzusetzen, und die Zeitzone macht `Intl` selbst richtig (inklusive
 * Sommerzeit).
 */
export function heutigerTag(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZEITZONE, dateStyle: "short" }).format(now);
}

/** Wie lange es noch bis Mitternacht ist – für „nächste Auszahlung in …". */
export function millisBisMitternacht(now: Date = new Date()): number {
  const teile = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZEITZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(now)
    .split(":")
    .map(Number);

  const [stunde, minute, sekunde] = teile;
  const vergangen = ((stunde % 24) * 60 + minute) * 60 + sekunde;
  return (24 * 60 * 60 - vergangen) * 1000;
}

export type GehaltsStand = {
  /** Ist die Auszahlung überhaupt eingeschaltet? (Einstellung > 0) */
  aktiv: boolean;
  /** Betrag in Cog, wie er in den Einstellungen steht. */
  cogs: number;
  /** Heute schon abgeholt? */
  heuteAbgeholt: boolean;
  /** Millisekunden bis Mitternacht – nur gesetzt, wenn heute schon abgeholt wurde. */
  wartenBisMs: number | null;
};

/** Was das Dashboard über den heutigen Stand wissen muss. */
export async function gehaltsStand(userId: string): Promise<GehaltsStand> {
  const settings = await getSiteSettings();
  const cogs = settings.dailySalaryCogs;

  if (cogs <= 0) {
    return { aktiv: false, cogs: 0, heuteAbgeholt: false, wartenBisMs: null };
  }

  const heute = heutigerTag();
  const vorhanden = await prisma.salaryClaim.findUnique({
    where: { userId_day: { userId, day: heute } },
    select: { id: true },
  });

  return {
    aktiv: true,
    cogs,
    heuteAbgeholt: vorhanden !== null,
    wartenBisMs: vorhanden ? millisBisMitternacht() : null,
  };
}

/** Die Quittungsdatei des Servers, oder null wenn sie nicht lesbar ist. */
async function leseQuittungen(): Promise<QuittungsDatei | null> {
  if (!craftyConfigured) return null;
  try {
    return await craftyReadJson<QuittungsDatei>(QUITTUNGSDATEI);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

export type AuszahlungsErgebnis =
  | { ok: true; cogs: number }
  | { ok: false; grund: "aus" | "kein-konto" | "schon-abgeholt" | "skript-fehlt" | "nicht-angekommen"; detail?: string };

/**
 * Zahlt das Gehalt aus – oder sagt begründet, warum nicht.
 *
 * Reihenfolge mit Absicht: Erst den Tag in der Datenbank belegen, dann zahlen,
 * dann die Quittung prüfen. Der Unique-Index auf (userId, day) ist dabei die
 * eigentliche Sperre gegen Doppelklicks; kommt das Geld anschließend nicht an,
 * wird die Zeile wieder gelöscht. So kann es höchstens einmal zu wenig geben
 * (nachholbar), nie zweimal zu viel.
 */
export async function holeGehalt(user: {
  id: string;
  minecraftName: string | null;
  minecraftUuid: string | null;
  name: string | null;
}): Promise<AuszahlungsErgebnis> {
  const settings = await getSiteSettings();
  const cogs = settings.dailySalaryCogs;
  if (cogs <= 0) return { ok: false, grund: "aus" };

  const { minecraftName, minecraftUuid } = user;
  if (!minecraftName || !minecraftUuid || !GAMERTAG_RE.test(minecraftName)) {
    return { ok: false, grund: "kein-konto" };
  }

  // Läuft das Skript auf dem Server überhaupt? Ohne Quittungsweg wird gar
  // nicht erst gezahlt – sonst verfiele der Tag für nichts.
  const vorher = await leseQuittungen();
  if (!vorher?.ready) {
    const detail = vorher?.errors?.[vorher.errors.length - 1]?.error;
    return { ok: false, grund: "skript-fehlt", detail };
  }

  const heute = heutigerTag();
  const spurs = cogs * SPURS_PER_COG;

  let claimId: string;
  try {
    const zeile = await prisma.salaryClaim.create({
      data: { userId: user.id, day: heute, spurs, minecraftName, minecraftUuid },
      select: { id: true },
    });
    claimId = zeile.id;
  } catch {
    // Einziger realistischer Grund: der Unique-Index hat zugeschlagen.
    return { ok: false, grund: "schon-abgeholt" };
  }

  const befehl = `vipgehalt ${minecraftUuid} ${spurs} ${claimId}`;
  const gesendet = await runPlayerCommand(befehl, `Tägliches Gehalt für ${minecraftName}`, {
    id: user.id,
    name: user.name,
  });

  if (gesendet.ok) {
    // Der Server braucht einen Moment, bis die Quittung auf der Platte steht.
    const quittiert = await warteAufQuittung(claimId);
    if (quittiert) return { ok: true, cogs };
  }

  // Nicht angekommen: Tag wieder freigeben, damit es später erneut geht.
  await prisma.salaryClaim.delete({ where: { id: claimId } }).catch(() => undefined);
  return {
    ok: false,
    grund: "nicht-angekommen",
    detail: gesendet.ok ? undefined : gesendet.error,
  };
}

/** Fragt die Quittungsdatei ein paarmal ab, bis der Beleg auftaucht. */
async function warteAufQuittung(claimId: string): Promise<boolean> {
  for (const wartenMs of [700, 1200, 2000]) {
    await new Promise((fertig) => setTimeout(fertig, wartenMs));
    const datei = await leseQuittungen();
    if (datei?.payouts?.some((beleg) => beleg.claimId === claimId)) return true;
  }
  return false;
}
