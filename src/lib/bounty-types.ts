/**
 * Kopfgelder: Typen, Grenzen und Prüfung der Eingabe.
 *
 * Bewusst ohne Datenbank- und ohne "server-only"-Import, damit das Formular im
 * Browser dieselbe Prüfung benutzen kann wie der Server. Dieselbe Trennung wie
 * bei whitelist-types.ts und event-kinds.ts.
 */
import { GAMERTAG_RE } from "@/lib/whitelist-types";

/**
 * PENDING  – Zeile angelegt, das Geld ist noch nicht abgebucht (Übergang)
 * OPEN     – abgebucht und ausgeschrieben
 * PAYING   – Auszahlung läuft (Übergang)
 * CLAIMED  – ausgezahlt
 * EXPIRED  – abgelaufen, Einsatz zurückerstattet
 */
export const BOUNTY_STATUSES = ["PENDING", "OPEN", "PAYING", "CLAIMED", "EXPIRED"] as const;
export type BountyStatus = (typeof BOUNTY_STATUSES)[number];

/** Kleinster sinnvoller Einsatz. Darunter lohnt sich die Jagd für niemanden. */
export const MIN_COGS = 1;

/**
 * Obergrenze. Nicht, weil der Server es nicht könnte – sondern damit ein
 * Vertipper (10000 statt 100) nicht ein halbes Vermögen einfriert.
 */
export const MAX_COGS = 10_000;

/** So weit darf ein Enddatum höchstens in der Zukunft liegen. */
export const MAX_TAGE_VORAUS = 365;

export type BountyInput = {
  targetName: string;
  cogs: number;
  /** "YYYY-MM-DD" oder null für unbefristet. */
  expiresOn: string | null;
};

type Uebersetzer = (schluessel: string, werte?: Record<string, string | number>) => string;

const DATUM_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Prüft, was aus dem Formular kommt.
 *
 * Der eigene Name ist ausgeschlossen: Ein Kopfgeld auf sich selbst wäre ein
 * Weg, sich von einem Freund Geld überweisen zu lassen, das man vorher selbst
 * eingezahlt hat – und es ergibt auch als Spiel keinen Sinn.
 */
export function validateBountyInput(
  raw: { targetName?: unknown; cogs?: unknown; expiresOn?: unknown },
  eigenerName: string | null,
  t: Uebersetzer,
): { ok: true; data: BountyInput } | { ok: false; error: string } {
  const targetName = typeof raw.targetName === "string" ? raw.targetName.trim() : "";
  if (!GAMERTAG_RE.test(targetName)) {
    return { ok: false, error: t("minecraftNamePattern") };
  }
  if (eigenerName && targetName.toLowerCase() === eigenerName.toLowerCase()) {
    return { ok: false, error: t("bountyOnSelf") };
  }

  const cogs = Number(typeof raw.cogs === "string" ? raw.cogs.trim() : raw.cogs);
  if (!Number.isInteger(cogs) || cogs < MIN_COGS || cogs > MAX_COGS) {
    return { ok: false, error: t("bountyAmount", { min: MIN_COGS, max: MAX_COGS }) };
  }

  const roh = typeof raw.expiresOn === "string" ? raw.expiresOn.trim() : "";
  if (roh.length === 0) {
    return { ok: true, data: { targetName, cogs, expiresOn: null } };
  }
  if (!DATUM_RE.test(roh)) {
    return { ok: false, error: t("bountyDateInvalid") };
  }

  return { ok: true, data: { targetName, cogs, expiresOn: roh } };
}

/**
 * "12.09." – so, wie es im Spiel angekündigt wird.
 *
 * Die Ankündigung kommt aus dem KubeJS-Skript, und das soll nicht rechnen
 * müssen: Es bekommt den fertigen Text mitgeliefert.
 */
export function kurzesDatum(zeitpunkt: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
  }).format(zeitpunkt);
}
