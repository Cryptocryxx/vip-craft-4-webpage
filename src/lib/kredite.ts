import "server-only";
import { unstable_rethrow } from "next/navigation";
import { kubejsBank, type Akteur, type BuchungsErgebnis, type KreditBank } from "@/lib/kredit-bank";
import {
  faelligSpurs,
  kreditBeleg,
  KREDIT_ANGEBOT_TAGE,
  KREDIT_ERLEDIGT,
  KREDIT_MAX_OFFENE_ANGEBOTE,
  KREDIT_MAX_TAGE_VORAUS,
  KREDIT_UEBERGAENGE,
  leereKredite,
  type KreditEingabe,
  type KreditEnde,
  type KreditStatus,
  type KreditZeile,
  type MeineKredite,
} from "@/lib/kredit-types";
import { SPURS_PER_COG } from "@/lib/currency";
import { eigeneUuid } from "@/lib/minecraft-konto";
import { prisma } from "@/lib/prisma";
import { berlinNachDatum } from "@/lib/zeit";

export * from "@/lib/kredit-types";

/**
 * Kredite zwischen Spielern.
 *
 * GELD FLIESST IMMER ERST, WENN ES BESTÄTIGT IST – und in einer Reihenfolge,
 * in der ein Fehler höchstens verzögert, nie verdoppelt:
 *
 *   Anbieten    Der Betrag wird beim Kreditgeber SOFORT abgebucht und liegt
 *               bis zur Antwort beim Server. So nimmt niemand ein Angebot an,
 *               hinter dem kein Geld mehr steht.
 *   Annehmen    Der Betrag geht an den Kreditnehmer, die Schuld läuft.
 *   Ablehnen,   Der Betrag geht an den Kreditgeber zurück. Angebote, die
 *   Zurückziehen, niemand beantwortet, laufen nach KREDIT_ANGEBOT_TAGE ab.
 *   Ablauf
 *   Begleichen  Betrag plus Zins werden beim Kreditnehmer abgebucht und dann
 *               an den Kreditgeber weitergegeben. Reicht das Geld nicht, bleibt
 *               die Schuld stehen, und nichts ist passiert.
 *
 * Jede Buchung hat eine feste Beleg-ID (kreditBeleg in kredit-types.ts). Kommt
 * keine Quittung, bleibt die Zeile im Übergangszustand stehen, und
 * rechneKrediteAb() wiederholt die Buchung mit DERSELBEN ID, bis sie durch ist.
 * credit.js bucht eine ID nie zweimal – auch nicht nach einem Neustart, weil
 * es seine Quittungen beim Laden wieder einliest.
 *
 * Wer mitmachen darf: Website-Accounts mit verknüpftem Minecraft-Namen, die auf
 * der Whitelist stehen. Annehmen und Begleichen geht nur auf der Website – dort
 * weiß man, wer man ist.
 */

type Nutzer = { id: string; name: string | null; minecraftName: string | null; minecraftUuid: string | null };

const partnerSelect = { id: true, name: true, minecraftName: true, minecraftUuid: true, whitelisted: true } as const;

const TAG_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Anbieten
// ---------------------------------------------------------------------------

export type AnbietenErgebnis =
  | { ok: true; unterwegs: boolean; kreditnehmer: string; cogs: number; faelligSpurs: number }
  | {
      ok: false;
      grund: "skript-fehlt" | "kein-konto" | "partner-fehlt" | "selbst" | "zu-viele" | "datum" | "zu-wenig";
    };

export async function bieteKreditAn(
  kreditgeber: Nutzer & { whitelisted: boolean },
  eingabe: KreditEingabe,
  bank: KreditBank = kubejsBank,
): Promise<AnbietenErgebnis> {
  if (!(await bank.bereit())) return { ok: false, grund: "skript-fehlt" };

  const geberUuid = kreditgeber.whitelisted ? await eigeneUuid(kreditgeber) : null;
  if (!geberUuid || !kreditgeber.minecraftName) return { ok: false, grund: "kein-konto" };

  if (eingabe.borrowerId === kreditgeber.id) return { ok: false, grund: "selbst" };
  const nehmer = await prisma.user.findUnique({ where: { id: eingabe.borrowerId }, select: partnerSelect });
  const nehmerUuid = nehmer?.whitelisted ? await eigeneUuid(nehmer) : null;
  if (!nehmer || !nehmerUuid || !nehmer.minecraftName) return { ok: false, grund: "partner-fehlt" };
  if (nehmerUuid === geberUuid) return { ok: false, grund: "selbst" };

  let rueckzahlungBis: Date | null = null;
  if (eingabe.rueckzahlungBis) {
    // Ende des gewählten Tages nach Berliner Uhr, wie beim Kopfgeld.
    rueckzahlungBis = berlinNachDatum(`${eingabe.rueckzahlungBis}T23:59`);
    const jetzt = Date.now();
    if (
      !rueckzahlungBis ||
      rueckzahlungBis.getTime() <= jetzt ||
      rueckzahlungBis.getTime() > jetzt + KREDIT_MAX_TAGE_VORAUS * TAG_MS
    ) {
      return { ok: false, grund: "datum" };
    }
  }

  const offen = await prisma.loan.count({
    where: { lenderId: kreditgeber.id, status: { in: ["RESERVING", "OFFERED"] } },
  });
  if (offen >= KREDIT_MAX_OFFENE_ANGEBOTE) return { ok: false, grund: "zu-viele" };

  const betragSpurs = eingabe.cogs * SPURS_PER_COG;
  const zeile = await prisma.loan.create({
    data: {
      lenderId: kreditgeber.id,
      lenderName: kreditgeber.minecraftName,
      lenderUuid: geberUuid,
      borrowerId: nehmer.id,
      borrowerName: nehmer.minecraftName,
      borrowerUuid: nehmerUuid,
      principalSpurs: betragSpurs,
      interestPercent: eingabe.zinsProzent,
      dueSpurs: faelligSpurs(betragSpurs, eingabe.zinsProzent),
      repayBy: rueckzahlungBis,
      offerExpiresAt: new Date(Date.now() + KREDIT_ANGEBOT_TAGE * TAG_MS),
      status: "RESERVING",
    },
  });

  const akteur = { id: kreditgeber.id, name: kreditgeber.name };
  const ergebnis = await reserviere(zeile, bank, akteur);

  if (ergebnis === "zu-wenig") return { ok: false, grund: "zu-wenig" };
  return {
    ok: true,
    unterwegs: ergebnis === "offen",
    kreditnehmer: nehmer.minecraftName,
    cogs: eingabe.cogs,
    faelligSpurs: zeile.dueSpurs,
  };
}

type LoanZeile = Awaited<ReturnType<typeof prisma.loan.findUniqueOrThrow>>;

/** Betrag beim Kreditgeber abbuchen. Aus dem Formular und aus dem Hintergrund. */
async function reserviere(zeile: LoanZeile, bank: KreditBank, akteur: Akteur): Promise<"ok" | "zu-wenig" | "offen"> {
  const ergebnis = await bank.buche(
    {
      art: "abbuchen",
      uuid: zeile.lenderUuid,
      spurs: zeile.principalSpurs,
      beleg: kreditBeleg.reservieren(zeile.id),
      grund: `Kredit an ${zeile.borrowerName} angeboten, Betrag reserviert`,
    },
    akteur,
  );

  if (ergebnis.status === "ok") {
    const gewechselt = await wechsle(zeile.id, "RESERVING", { status: "OFFERED", note: null });
    if (gewechselt) {
      await bank.sage(
        {
          art: "angebot",
          an: zeile.borrowerName,
          von: zeile.lenderName,
          spurs: zeile.principalSpurs,
          zinsProzent: zeile.interestPercent,
        },
        akteur,
      );
    }
    return "ok";
  }
  if (ergebnis.status === "zu-wenig") {
    await wechsle(zeile.id, "RESERVING", {
      status: "FAILED",
      note: "Guthaben reichte nicht für die Reservierung",
      closedAt: new Date(),
    });
    return "zu-wenig";
  }
  await merkeFehlversuch(zeile, "Reservierung noch nicht bestätigt", ergebnis);
  return "offen";
}

// ---------------------------------------------------------------------------
// Annehmen, ablehnen, zurückziehen
// ---------------------------------------------------------------------------

export type AntwortErgebnis = { ok: true; unterwegs: boolean } | { ok: false; grund: "nicht-moeglich" };

/** Der Kreditnehmer nimmt an: Betrag geht an ihn, die Schuld läuft. */
export async function nimmKreditAn(
  nutzer: { id: string; name: string | null },
  kreditId: string,
  bank: KreditBank = kubejsBank,
): Promise<AntwortErgebnis> {
  const zeile = await prisma.loan.findUnique({ where: { id: kreditId } });
  if (!zeile || zeile.borrowerId !== nutzer.id || zeile.status !== "OFFERED") return { ok: false, grund: "nicht-moeglich" };
  if (zeile.offerExpiresAt.getTime() <= Date.now()) return { ok: false, grund: "nicht-moeglich" };

  // Bedingter Wechsel als Sperre: Nur einer von zwei gleichzeitigen Klicks kommt durch.
  const gewechselt = await wechsle(zeile.id, "OFFERED", { status: "PAYING_OUT", acceptedAt: new Date() });
  if (!gewechselt) return { ok: false, grund: "nicht-moeglich" };

  const ergebnis = await zahleAus({ ...zeile, status: "PAYING_OUT", attempts: 0 }, bank, { id: nutzer.id, name: nutzer.name });
  return { ok: true, unterwegs: ergebnis === "offen" };
}

async function zahleAus(zeile: LoanZeile, bank: KreditBank, akteur: Akteur): Promise<"ok" | "offen"> {
  const ergebnis = await bank.buche(
    {
      art: "gutschreiben",
      uuid: zeile.borrowerUuid,
      spurs: zeile.principalSpurs,
      beleg: kreditBeleg.auszahlen(zeile.id),
      grund: `Kredit von ${zeile.lenderName} an ${zeile.borrowerName} ausgezahlt`,
    },
    akteur,
  );
  if (ergebnis.status === "ok") {
    const gewechselt = await wechsle(zeile.id, "PAYING_OUT", { status: "ACTIVE", note: null });
    if (gewechselt) {
      await bank.sage({ art: "angenommen", an: zeile.lenderName, von: zeile.borrowerName, spurs: zeile.principalSpurs }, akteur);
    }
    return "ok";
  }
  // Eine Gutschrift kann nicht an zu wenig Geld scheitern – was hier ankommt,
  // ist "offen": später mit derselben Beleg-ID wiederholen.
  await merkeFehlversuch(zeile, "Auszahlung noch nicht bestätigt", ergebnis);
  return "offen";
}

/** Der Kreditnehmer lehnt ab: Reservierung geht an den Kreditgeber zurück. */
export async function lehneKreditAb(
  nutzer: { id: string; name: string | null },
  kreditId: string,
  bank: KreditBank = kubejsBank,
): Promise<AntwortErgebnis> {
  return beendeAngebot(kreditId, "DECLINED", (z) => z.borrowerId === nutzer.id, bank, { id: nutzer.id, name: nutzer.name });
}

/** Der Kreditgeber zieht sein Angebot zurück, solange es niemand angenommen hat. */
export async function zieheKreditZurueck(
  nutzer: { id: string; name: string | null },
  kreditId: string,
  bank: KreditBank = kubejsBank,
): Promise<AntwortErgebnis> {
  return beendeAngebot(kreditId, "WITHDRAWN", (z) => z.lenderId === nutzer.id, bank, { id: nutzer.id, name: nutzer.name });
}

async function beendeAngebot(
  kreditId: string,
  grund: KreditEnde,
  darf: (zeile: LoanZeile) => boolean,
  bank: KreditBank,
  akteur: Akteur,
): Promise<AntwortErgebnis> {
  const zeile = await prisma.loan.findUnique({ where: { id: kreditId } });
  if (!zeile || !darf(zeile) || zeile.status !== "OFFERED") return { ok: false, grund: "nicht-moeglich" };

  const gewechselt = await wechsle(zeile.id, "OFFERED", { status: "REFUNDING", closeReason: grund });
  if (!gewechselt) return { ok: false, grund: "nicht-moeglich" };

  const ergebnis = await erstatte({ ...zeile, status: "REFUNDING", closeReason: grund, attempts: 0 }, bank, akteur);
  return { ok: true, unterwegs: ergebnis === "offen" };
}

async function erstatte(zeile: LoanZeile, bank: KreditBank, akteur: Akteur): Promise<"ok" | "offen"> {
  const grund = (zeile.closeReason ?? "EXPIRED") as KreditEnde;
  const ergebnis = await bank.buche(
    {
      art: "gutschreiben",
      uuid: zeile.lenderUuid,
      spurs: zeile.principalSpurs,
      beleg: kreditBeleg.zurueck(zeile.id),
      grund: `Kreditangebot an ${zeile.borrowerName} beendet (${grund}), Betrag zurück`,
    },
    akteur,
  );
  if (ergebnis.status === "ok") {
    const gewechselt = await wechsle(zeile.id, "REFUNDING", { status: grund, note: null, closedAt: new Date() });
    // Wer selbst zurückgezogen hat, weiß es schon.
    if (gewechselt && grund !== "WITHDRAWN") {
      await bank.sage(
        {
          art: grund === "DECLINED" ? "abgelehnt" : "abgelaufen",
          an: zeile.lenderName,
          von: zeile.borrowerName,
          spurs: zeile.principalSpurs,
        },
        akteur,
      );
    }
    return "ok";
  }
  await merkeFehlversuch(zeile, "Rückbuchung noch nicht bestätigt", ergebnis);
  return "offen";
}

// ---------------------------------------------------------------------------
// Begleichen
// ---------------------------------------------------------------------------

export type BegleichenErgebnis = { ok: true; unterwegs: boolean } | { ok: false; grund: "nicht-moeglich" | "zu-wenig" };

/** Der Kreditnehmer zahlt Betrag plus Zins in einem Rutsch zurück. */
export async function begleicheKredit(
  nutzer: { id: string; name: string | null },
  kreditId: string,
  bank: KreditBank = kubejsBank,
): Promise<BegleichenErgebnis> {
  const zeile = await prisma.loan.findUnique({ where: { id: kreditId } });
  if (!zeile || zeile.borrowerId !== nutzer.id || zeile.status !== "ACTIVE") return { ok: false, grund: "nicht-moeglich" };

  const gewechselt = await wechsle(zeile.id, "ACTIVE", { status: "REPAYING", note: null });
  if (!gewechselt) return { ok: false, grund: "nicht-moeglich" };

  const ergebnis = await tilge({ ...zeile, status: "REPAYING", attempts: 0 }, bank, { id: nutzer.id, name: nutzer.name });
  if (ergebnis === "zu-wenig") return { ok: false, grund: "zu-wenig" };
  return { ok: true, unterwegs: ergebnis === "offen" };
}

async function tilge(zeile: LoanZeile, bank: KreditBank, akteur: Akteur): Promise<"ok" | "zu-wenig" | "offen"> {
  const ergebnis = await bank.buche(
    {
      art: "abbuchen",
      uuid: zeile.borrowerUuid,
      spurs: zeile.dueSpurs,
      beleg: kreditBeleg.tilgen(zeile.id, zeile.repayRound),
      grund: `Kredit von ${zeile.lenderName} wird von ${zeile.borrowerName} beglichen`,
    },
    akteur,
  );

  if (ergebnis.status === "zu-wenig") {
    // Nichts gebucht – die Schuld steht wieder offen. Der nächste Versuch
    // braucht eine neue Beleg-ID, deshalb zählt die Runde hoch.
    await wechsle(zeile.id, "REPAYING", {
      status: "ACTIVE",
      repayRound: zeile.repayRound + 1,
      note: "Zu wenig Geld auf dem Konto, um den Kredit zu begleichen",
    });
    return "zu-wenig";
  }
  if (ergebnis.status === "offen") {
    await merkeFehlversuch(zeile, "Tilgung noch nicht bestätigt", ergebnis);
    return "offen";
  }

  const gewechselt = await wechsle(zeile.id, "REPAYING", { status: "SETTLING", repaidAt: new Date() });
  if (!gewechselt) return "ok";
  // Das Geld des Kreditnehmers ist weg – für ihn ist der Kredit beglichen,
  // auch wenn die Weitergabe noch nachgeholt werden muss.
  await gibWeiter({ ...zeile, status: "SETTLING", attempts: 0 }, bank, akteur);
  return "ok";
}

async function gibWeiter(zeile: LoanZeile, bank: KreditBank, akteur: Akteur): Promise<"ok" | "offen"> {
  const ergebnis = await bank.buche(
    {
      art: "gutschreiben",
      uuid: zeile.lenderUuid,
      spurs: zeile.dueSpurs,
      beleg: kreditBeleg.weitergeben(zeile.id),
      grund: `Kredit an ${zeile.borrowerName} beglichen, Rückzahlung an ${zeile.lenderName}`,
    },
    akteur,
  );
  if (ergebnis.status === "ok") {
    const gewechselt = await wechsle(zeile.id, "SETTLING", { status: "REPAID", note: null, closedAt: new Date() });
    if (gewechselt) {
      await bank.sage({ art: "beglichen", an: zeile.lenderName, von: zeile.borrowerName, spurs: zeile.dueSpurs }, akteur);
    }
    return "ok";
  }
  await merkeFehlversuch(zeile, "Weitergabe an den Kreditgeber noch nicht bestätigt", ergebnis);
  return "offen";
}

// ---------------------------------------------------------------------------
// Im Hintergrund: Abläufe und hängende Buchungen
// ---------------------------------------------------------------------------

/** Nicht bei jedem Seitenaufruf durchrechnen. */
const ABSTAND_MS = 15_000;
/**
 * Übergänge, die jünger sind, gehören vermutlich noch einem laufenden Klick –
 * der wartet gerade selbst auf seine Quittung. Doppelt senden wäre harmlos
 * (gleiche Beleg-ID), aber unnötig.
 */
const SCHONFRIST_MS = 30_000;
let letzterLauf = 0;
let laeuft = false;

/** Nach einem Fehlschlag wächst der Abstand: 2, 4, 8 … Minuten, höchstens eine Stunde. */
function darfVersuchen(attempts: number, lastTryAt: Date | null): boolean {
  if (attempts === 0 || !lastTryAt) return true;
  const minuten = Math.min(2 ** attempts, 60);
  return Date.now() - lastTryAt.getTime() >= minuten * 60_000;
}

/**
 * Lässt abgelaufene Angebote zurückbuchen und holt hängende Buchungen nach.
 * Läuft mit dem Statusabruf mit (api/server-status), etwa im Minutentakt.
 */
export async function rechneKrediteAb(erzwingen = false, bank: KreditBank = kubejsBank): Promise<number> {
  if (!erzwingen && (laeuft || Date.now() - letzterLauf < ABSTAND_MS)) return 0;
  laeuft = true;
  letzterLauf = Date.now();

  try {
    if (!(await bank.bereit())) return 0;
    let veraendert = 0;

    // Abgelaufene Angebote: auf REFUNDING stellen, erstattet wird unten.
    const abgelaufen = await prisma.loan.findMany({
      where: { status: "OFFERED", offerExpiresAt: { lte: new Date() } },
      select: { id: true },
    });
    for (const { id } of abgelaufen) {
      if (await wechsle(id, "OFFERED", { status: "REFUNDING", closeReason: "EXPIRED" })) veraendert += 1;
    }

    const haengend = await prisma.loan.findMany({
      where: {
        status: { in: [...KREDIT_UEBERGAENGE] },
        updatedAt: { lte: new Date(Date.now() - (erzwingen ? 0 : SCHONFRIST_MS)) },
      },
      orderBy: { createdAt: "asc" },
    });

    for (const zeile of haengend) {
      if (!darfVersuchen(zeile.attempts, zeile.lastTryAt)) continue;
      const vorher = zeile.status;
      switch (zeile.status) {
        case "RESERVING":
          await reserviere(zeile, bank, null);
          break;
        case "PAYING_OUT":
          await zahleAus(zeile, bank, null);
          break;
        case "REFUNDING":
          await erstatte(zeile, bank, null);
          break;
        case "REPAYING":
          await tilge(zeile, bank, null);
          break;
        case "SETTLING":
          await gibWeiter(zeile, bank, null);
          break;
      }
      const nachher = await prisma.loan.findUnique({ where: { id: zeile.id }, select: { status: true } });
      if (nachher && nachher.status !== vorher) veraendert += 1;
    }
    return veraendert;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[kredit] Abrechnung fehlgeschlagen:", error);
    return 0;
  } finally {
    laeuft = false;
  }
}

// ---------------------------------------------------------------------------
// Hilfen
// ---------------------------------------------------------------------------

/**
 * Bedingter Statuswechsel: Nur wer die Zeile im erwarteten Zustand antrifft,
 * darf weiter. Zwei gleichzeitige Durchgänge buchen so nie doppelt, und ein
 * Erfolg setzt die Fehlversuche zurück.
 */
async function wechsle(
  id: string,
  von: KreditStatus,
  daten: {
    status: KreditStatus;
    note?: string | null;
    closeReason?: KreditEnde;
    acceptedAt?: Date;
    repaidAt?: Date;
    closedAt?: Date;
    repayRound?: number;
  },
): Promise<boolean> {
  const ergebnis = await prisma.loan.updateMany({
    where: { id, status: von },
    data: { ...daten, attempts: 0, lastTryAt: null },
  });
  return ergebnis.count > 0;
}

async function merkeFehlversuch(zeile: LoanZeile, text: string, ergebnis: BuchungsErgebnis): Promise<void> {
  const detail = ergebnis.status === "offen" && ergebnis.detail ? ` (${ergebnis.detail.slice(0, 120)})` : "";
  await prisma.loan.updateMany({
    where: { id: zeile.id, status: zeile.status },
    data: { note: `${text}, wird wiederholt${detail}`, attempts: zeile.attempts + 1, lastTryAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Anzeige
// ---------------------------------------------------------------------------

function zuZeile(k: LoanZeile, userId: string): KreditZeile {
  return {
    id: k.id,
    ichBinGeber: k.lenderId === userId,
    status: k.status as KreditStatus,
    closeReason: (k.closeReason as KreditEnde | null) ?? null,
    lenderName: k.lenderName,
    borrowerName: k.borrowerName,
    betragSpurs: k.principalSpurs,
    zinsProzent: k.interestPercent,
    faelligSpurs: k.dueSpurs,
    rueckzahlungBis: k.repayBy?.toISOString() ?? null,
    ueberfaellig: (k.status === "ACTIVE" || k.status === "PAYING_OUT") && k.repayBy !== null && k.repayBy.getTime() < Date.now(),
    angebotBis: k.offerExpiresAt.toISOString(),
    erstellt: k.createdAt.toISOString(),
    angenommen: k.acceptedAt?.toISOString() ?? null,
    beglichen: k.repaidAt?.toISOString() ?? null,
    beendet: k.closedAt?.toISOString() ?? null,
    hinweis: hinweisFuer(k),
  };
}

/** Die Notiz ist für den Betrieb gedacht; den Spielern wird nur übersetzt, was sie betrifft. */
function hinweisFuer(k: LoanZeile): KreditZeile["hinweis"] {
  if (k.status === "FAILED") return "reservierung-gescheitert";
  if (k.status === "ACTIVE" && k.repayRound > 0 && k.note) return "zu-wenig";
  if (KREDIT_UEBERGAENGE.includes(k.status as KreditStatus) && k.attempts > 0) return "laeuft";
  return null;
}

/** Alles, was einen Spieler betrifft – als Kreditgeber und als Kreditnehmer. */
export async function meineKredite(userId: string, verlaufLaenge = 20): Promise<MeineKredite> {
  try {
    const alle = await prisma.loan.findMany({
      // Eine Reservierung, die noch läuft, sieht nur der Kreditgeber – die
      // Filter unten lassen sie beim Kreditnehmer ohnehin nirgends auftauchen.
      where: { OR: [{ lenderId: userId }, { borrowerId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const erledigt = new Set<string>(KREDIT_ERLEDIGT);
    return {
      angeboteAnMich: alle.filter((k) => k.borrowerId === userId && k.status === "OFFERED").map((k) => zuZeile(k, userId)),
      schulden: alle
        .filter((k) => k.borrowerId === userId && ["PAYING_OUT", "ACTIVE", "REPAYING", "SETTLING"].includes(k.status))
        .map((k) => zuZeile(k, userId)),
      verliehen: alle.filter((k) => k.lenderId === userId && !erledigt.has(k.status)).map((k) => zuZeile(k, userId)),
      verlauf: alle
        .filter((k) => erledigt.has(k.status) && !(k.status === "FAILED" && k.borrowerId === userId))
        .slice(0, verlaufLaenge)
        .map((k) => zuZeile(k, userId)),
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[kredit] Kredite nicht ladbar:", error);
    return leereKredite;
  }
}

/** Für den Hinweis im Dashboard: Wartet etwas auf mich? */
export async function kreditHinweis(userId: string): Promise<{ angebote: number; schulden: number }> {
  try {
    const [angebote, schulden] = await Promise.all([
      prisma.loan.count({ where: { borrowerId: userId, status: "OFFERED" } }),
      prisma.loan.count({ where: { borrowerId: userId, status: "ACTIVE" } }),
    ]);
    return { angebote, schulden };
  } catch (error) {
    unstable_rethrow(error);
    return { angebote: 0, schulden: 0 };
  }
}

/** Wem man einen Kredit geben kann: freigeschaltete Accounts mit Minecraft-Namen, außer einem selbst. */
export async function kreditPartner(userId: string): Promise<Array<{ id: string; name: string }>> {
  const nutzer = await prisma.user.findMany({
    where: { whitelisted: true, NOT: [{ minecraftName: null }, { id: userId }] },
    select: { id: true, minecraftName: true },
    orderBy: { minecraftName: "asc" },
  });
  return nutzer.flatMap((n) => (n.minecraftName ? [{ id: n.id, name: n.minecraftName }] : []));
}
