/**
 * Kredite zwischen Spielern: Zustände, Grenzen, Zinsrechnung und die Prüfung
 * der Eingabe.
 *
 * Bewusst ohne Datenbank- und ohne "server-only"-Import, damit das Formular im
 * Browser dieselbe Rechnung zeigt, die der Server nachher bucht – dieselbe
 * Trennung wie bei bounty-types.ts.
 */
/**
 * Der Lebenslauf eines Kredits. Übergänge (…ING) sind Buchungen, die gerade
 * laufen oder im Hintergrund wiederholt werden, bis sie durch sind.
 *
 *   RESERVING  → OFFERED        Betrag beim Kreditgeber abbuchen (Reservierung)
 *              → FAILED         … reichte nicht
 *   OFFERED    → PAYING_OUT     angenommen: Betrag an den Kreditnehmer
 *              → REFUNDING      abgelehnt, zurückgezogen oder abgelaufen
 *   PAYING_OUT → ACTIVE         Kreditnehmer hat das Geld, die Schuld läuft
 *   ACTIVE     → REPAYING       Kreditnehmer begleicht: Betrag + Zins abbuchen
 *   REPAYING   → SETTLING       abgebucht, jetzt an den Kreditgeber
 *              → ACTIVE         … reichte nicht, Schuld bleibt
 *   SETTLING   → REPAID         erledigt
 *   REFUNDING  → DECLINED | WITHDRAWN | EXPIRED   Reservierung ist zurück
 */
export const KREDIT_STATUS = [
  "RESERVING",
  "OFFERED",
  "PAYING_OUT",
  "ACTIVE",
  "REPAYING",
  "SETTLING",
  "REPAID",
  "REFUNDING",
  "DECLINED",
  "WITHDRAWN",
  "EXPIRED",
  "FAILED",
] as const;
export type KreditStatus = (typeof KREDIT_STATUS)[number];

/** Warum ein Angebot endet – steht in closeReason, solange die Rückbuchung läuft. */
export type KreditEnde = "DECLINED" | "WITHDRAWN" | "EXPIRED";

/** Zustände, in denen im Hintergrund noch eine Buchung aussteht. */
export const KREDIT_UEBERGAENGE: readonly KreditStatus[] = ["RESERVING", "PAYING_OUT", "REFUNDING", "REPAYING", "SETTLING"];

/** Endzustände – hier bewegt sich kein Geld mehr. */
export const KREDIT_ERLEDIGT: readonly KreditStatus[] = ["REPAID", "DECLINED", "WITHDRAWN", "EXPIRED", "FAILED"];

/** Kleinster Kredit. */
export const KREDIT_MIN_COGS = 1;

/**
 * Obergrenze, wie beim Kopfgeld: nicht, weil der Server es nicht könnte,
 * sondern damit ein Vertipper (10000 statt 100) nicht ein Vermögen bindet.
 */
export const KREDIT_MAX_COGS = 10_000;

/** Zins in ganzen Prozent. 50 % ist schon Wucher – mehr gibt es nicht. */
export const KREDIT_MIN_ZINS = 0;
export const KREDIT_MAX_ZINS = 50;

/**
 * So lange kann ein Angebot angenommen werden. Danach geht die Reservierung
 * von selbst zurück – sonst läge das Geld beim Kreditgeber ewig fest, nur weil
 * der andere nie wieder auf die Website schaut.
 */
export const KREDIT_ANGEBOT_TAGE = 7;

/** Wie weit ein Rückzahlungsdatum höchstens in der Zukunft liegen darf. */
export const KREDIT_MAX_TAGE_VORAUS = 365;

/** So viele offene Angebote darf ein Kreditgeber gleichzeitig haben. */
export const KREDIT_MAX_OFFENE_ANGEBOTE = 5;

/**
 * Was insgesamt zurückzuzahlen ist, in Spurs: Betrag plus Zins, auf ganze
 * Spurs aufgerundet – sonst ginge bei krummen Zinsen ein Bruchteil verloren,
 * und zwar immer zulasten des Kreditgebers.
 */
export function faelligSpurs(betragSpurs: number, zinsProzent: number): number {
  return betragSpurs + Math.ceil((betragSpurs * zinsProzent) / 100);
}

export type KreditEingabe = {
  /** Website-Account des Kreditnehmers. */
  borrowerId: string;
  cogs: number;
  zinsProzent: number;
  /** "YYYY-MM-DD" oder null. */
  rueckzahlungBis: string | null;
};

type Uebersetzer = (schluessel: string, werte?: Record<string, string | number>) => string;

const DATUM_RE = /^\d{4}-\d{2}-\d{2}$/;
/** cuid – mehr nimmt das Formular nicht an, damit nichts Fremdes in eine Abfrage gerät. */
const ID_RE = /^[a-z0-9]{20,40}$/;

/** Prüft, was aus dem Formular kommt. */
export function pruefeKreditEingabe(
  roh: { borrowerId?: unknown; cogs?: unknown; zins?: unknown; rueckzahlungBis?: unknown },
  t: Uebersetzer,
): { ok: true; data: KreditEingabe } | { ok: false; error: string } {
  const borrowerId = typeof roh.borrowerId === "string" ? roh.borrowerId.trim() : "";
  if (!ID_RE.test(borrowerId)) return { ok: false, error: t("creditBorrowerMissing") };

  const cogs = Number(typeof roh.cogs === "string" ? roh.cogs.trim() : roh.cogs);
  if (!Number.isInteger(cogs) || cogs < KREDIT_MIN_COGS || cogs > KREDIT_MAX_COGS) {
    return { ok: false, error: t("creditAmount", { min: KREDIT_MIN_COGS, max: KREDIT_MAX_COGS }) };
  }

  const zinsRoh = typeof roh.zins === "string" ? roh.zins.trim().replace(",", ".") : roh.zins;
  const zinsProzent = Number(zinsRoh);
  if (!Number.isInteger(zinsProzent) || zinsProzent < KREDIT_MIN_ZINS || zinsProzent > KREDIT_MAX_ZINS) {
    return { ok: false, error: t("creditInterest", { min: KREDIT_MIN_ZINS, max: KREDIT_MAX_ZINS }) };
  }

  const datum = typeof roh.rueckzahlungBis === "string" ? roh.rueckzahlungBis.trim() : "";
  if (datum.length > 0 && !DATUM_RE.test(datum)) return { ok: false, error: t("creditDateInvalid") };

  return { ok: true, data: { borrowerId, cogs, zinsProzent, rueckzahlungBis: datum.length > 0 ? datum : null } };
}

/**
 * Beleg-IDs der fünf Buchungen eines Kredits.
 *
 * Jede Buchung hat ihre eigene ID, und jede Wiederholung derselben Buchung
 * dieselbe – so bucht das Skript nie doppelt. Nur die Tilgung zählt mit: Scheitert
 * sie an zu wenig Geld, braucht der nächste Versuch eine neue ID.
 */
export const kreditBeleg = {
  reservieren: (id: string) => `${id}-res`,
  auszahlen: (id: string) => `${id}-aus`,
  zurueck: (id: string) => `${id}-rck`,
  tilgen: (id: string, runde: number) => `${id}-tlg${runde}`,
  weitergeben: (id: string) => `${id}-gut`,
};

/** Was die Seiten über einen Kredit wissen – aus Sicht eines der beiden Beteiligten. */
export type KreditZeile = {
  id: string;
  /** Aus wessen Sicht: Bin ich hier derjenige, der verliehen hat? */
  ichBinGeber: boolean;
  status: KreditStatus;
  /** Grund, wenn ein Angebot beendet wurde oder gerade zurückgebucht wird. */
  closeReason: KreditEnde | null;
  lenderName: string;
  borrowerName: string;
  betragSpurs: number;
  zinsProzent: number;
  faelligSpurs: number;
  rueckzahlungBis: string | null;
  /** Läuft noch und das Rückzahlungsdatum ist vorbei – beim Laden berechnet, nicht beim Anzeigen. */
  ueberfaellig: boolean;
  angebotBis: string;
  erstellt: string;
  angenommen: string | null;
  beglichen: string | null;
  beendet: string | null;
  /**
   * Was der Spieler wissen sollte, als Code – übersetzt wird auf der Seite:
   *   laeuft                   eine Buchung hängt und wird von selbst wiederholt
   *   zu-wenig                 der letzte Versuch zu begleichen scheiterte am Guthaben
   *   reservierung-gescheitert das Angebot kam nie zustande (Guthaben reichte nicht)
   */
  hinweis: "laeuft" | "zu-wenig" | "reservierung-gescheitert" | null;
};

export type MeineKredite = {
  /** Angebote an mich, die ich annehmen oder ablehnen kann. */
  angeboteAnMich: KreditZeile[];
  /** Was ich schulde (inklusive laufender Buchungen). */
  schulden: KreditZeile[];
  /** Was ich verliehen habe und noch nicht erledigt ist. */
  verliehen: KreditZeile[];
  /** Erledigtes aus beiden Richtungen, neueste zuerst. */
  verlauf: KreditZeile[];
};

export const leereKredite: MeineKredite = { angeboteAnMich: [], schulden: [], verliehen: [], verlauf: [] };
