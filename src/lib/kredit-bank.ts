import "server-only";
import { unstable_rethrow } from "next/navigation";
import { craftyConfigured, craftyReadJson } from "@/lib/crafty";
import { runPlayerCommand } from "@/lib/server-commands";
import { GAMERTAG_RE } from "@/lib/whitelist-types";

/**
 * Die Verbindung der Kredite zum Geld im Spiel.
 *
 * Gebucht wird über das KubeJS-Skript credit.js (`vipkredit abbuchen|gutschreiben`),
 * bestätigt über dessen Quittungsdatei – Crafty meldet nur, dass ein Befehl in
 * der Konsole ankam, nicht dass er gewirkt hat. Dasselbe Verfahren wie beim
 * Kopfgeld (lib/bounties.ts), mit einem Unterschied: Das Skript liest seine
 * Quittungen beim Start wieder ein. Eine Beleg-ID wird dadurch auch nach einem
 * Serverneustart nicht doppelt gebucht, und die Website darf jede unbestätigte
 * Buchung gefahrlos mit derselben ID wiederholen.
 *
 * Als Schnittstelle geschrieben, damit sich der Ablauf in lib/kredite.ts mit
 * einer nachgebauten Bank prüfen lässt, ohne dass ein Befehl auf dem echten
 * Server landet.
 */

export type Buchung = {
  art: "abbuchen" | "gutschreiben";
  uuid: string;
  spurs: number;
  beleg: string;
  /** Steht im Befehlsprotokoll des Kontrollraums. */
  grund: string;
};

/**
 * ok        gebucht
 * zu-wenig  Abbuchung abgelehnt, das Guthaben reichte nicht (es wurde NICHTS gebucht)
 * offen     keine Quittung – ob gebucht wurde, ist unbekannt; später mit derselben ID wiederholen
 */
export type BuchungsErgebnis = { status: "ok" } | { status: "zu-wenig" } | { status: "offen"; detail?: string };

export type KreditAnsage = {
  art: "angebot" | "angenommen" | "abgelehnt" | "abgelaufen" | "beglichen";
  /** Wer die Zeile im Chat bekommt. */
  an: string;
  /** Um wen es geht. */
  von: string;
  spurs: number;
  zinsProzent?: number;
};

export type Akteur = { id: string; name: string | null } | null;

export interface KreditBank {
  bereit(): Promise<boolean>;
  buche(buchung: Buchung, akteur: Akteur): Promise<BuchungsErgebnis>;
  /** Nur eine Nachricht im Spiel – scheitert sie, ist nichts verloren. */
  sage(ansage: KreditAnsage, akteur: Akteur): Promise<void>;
}

const QUITTUNGSDATEI = "kubejs/data/credit.json";
/** Nur was in einen Konsolenbefehl darf: cuid plus Endung (siehe kreditBeleg). */
const BELEG_RE = /^[a-z0-9]{20,40}-[a-z]{3}\d*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Quittung = { belegId?: string; ok?: boolean; grund?: string | null };
type QuittungsDatei = { ready?: boolean; script?: number; receipts?: Quittung[] };

async function leseQuittungen(): Promise<QuittungsDatei | null> {
  if (!craftyConfigured) return null;
  try {
    return await craftyReadJson<QuittungsDatei>(QUITTUNGSDATEI);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

async function findeQuittung(beleg: string): Promise<Quittung | null> {
  const datei = await leseQuittungen();
  return datei?.receipts?.find((q) => q.belegId === beleg) ?? null;
}

/** Fragt die Quittungsdatei ein paarmal ab, bis der Beleg auftaucht. */
async function warteAufQuittung(beleg: string): Promise<Quittung | null> {
  for (const wartenMs of [700, 1200, 2000]) {
    await new Promise((fertig) => setTimeout(fertig, wartenMs));
    const treffer = await findeQuittung(beleg);
    if (treffer) return treffer;
  }
  return null;
}

function auswerten(quittung: Quittung): BuchungsErgebnis {
  if (quittung.ok === true) return { status: "ok" };
  // "zu-wenig" und "abgelehnt" (Numismatics' deduct() sagte nein) heißen
  // beide: nichts gebucht.
  return { status: "zu-wenig" };
}

export const kubejsBank: KreditBank = {
  async bereit() {
    const datei = await leseQuittungen();
    return datei?.ready === true;
  },

  async buche(buchung, akteur) {
    if (!BELEG_RE.test(buchung.beleg) || !UUID_RE.test(buchung.uuid) || !Number.isInteger(buchung.spurs) || buchung.spurs <= 0) {
      // Kommt nur bei einem Programmierfehler vor - dann lieber gar nicht buchen.
      throw new Error(`Ungültige Buchung: ${JSON.stringify(buchung)}`);
    }

    // Wiederholung? Dann steht die Quittung vielleicht schon da, und es braucht
    // gar keinen neuen Befehl.
    const vorhanden = await findeQuittung(buchung.beleg);
    if (vorhanden) return auswerten(vorhanden);

    const gesendet = await runPlayerCommand(
      `vipkredit ${buchung.art} ${buchung.uuid} ${buchung.spurs} ${buchung.beleg}`,
      buchung.grund,
      akteur,
    );
    if (!gesendet.ok) return { status: "offen", detail: gesendet.error };

    const quittung = await warteAufQuittung(buchung.beleg);
    return quittung ? auswerten(quittung) : { status: "offen" };
  },

  async sage(ansage, akteur) {
    if (!GAMERTAG_RE.test(ansage.an) || !GAMERTAG_RE.test(ansage.von)) return;
    if (!Number.isInteger(ansage.spurs) || ansage.spurs <= 0) return;
    const zins = ansage.zinsProzent !== undefined ? ` ${Math.trunc(ansage.zinsProzent)}` : "";
    await runPlayerCommand(
      `vipkredit sag ${ansage.art} ${ansage.an} ${ansage.von} ${ansage.spurs}${zins}`,
      `Kredit: ${ansage.art} an ${ansage.an}`,
      akteur,
    );
  },
};
