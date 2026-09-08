import "server-only";
import { unstable_rethrow } from "next/navigation";
import { craftyConfigured, craftyReadJson, craftyWriteFile } from "@/lib/crafty";
import { kurzesDatum, type BountyInput } from "@/lib/bounty-types";
import { SPURS_PER_COG } from "@/lib/currency";
import { analysiereTod } from "@/lib/death-log";
import { lookupMinecraftName, mitBindestrichen } from "@/lib/mojang";
import { prisma } from "@/lib/prisma";
import { runPlayerCommand } from "@/lib/server-commands";
import { berlinNachDatum } from "@/lib/zeit";
import { GAMERTAG_RE } from "@/lib/whitelist-types";

/**
 * Kopfgelder.
 *
 * Der Einsatz wird SOFORT abgebucht – nicht erst, wenn jemand kassiert. Sonst
 * stünde auf der Seite ein Versprechen, für das im Zweifel kein Geld da ist:
 * Wer zwischendurch alles ausgibt, könnte sonst zehn Kopfgelder ausschreiben
 * und keins bezahlen.
 *
 * Gezahlt wird über das KubeJS-Skript bounty.js, und zwar in beide Richtungen
 * (abbuchen beim Aussetzen, auszahlen beim Kassieren). Beides wird über eine
 * Quittungsdatei bestätigt – Crafty meldet nur, dass der Befehl in der Konsole
 * ankam, nicht dass er gewirkt hat. Dieselbe Vorsichtsmaßnahme wie beim
 * täglichen Gehalt (lib/salary.ts).
 *
 * Wer kassiert, entscheidet das Spielprotokoll: die DEATH-Zeilen, aus denen
 * auch die PvP-Übersicht gebaut ist (lib/death-log.ts). Es zählt der ERSTE
 * Tod des Ziels durch Spielerhand nach dem Aussetzen.
 */

/** Quittungen, geschrieben vom Skript im Spiel. */
const QUITTUNGSDATEI = "kubejs/data/bounty.json";
/** Offene Kopfgelder, geschrieben von HIER – das Skript liest sie beim Login vor. */
const LISTENDATEI = "kubejs/data/bounty-list.json";

type Quittung = {
  belegId?: string;
  art?: string;
  uuid?: string;
  spurs?: number;
  ok?: boolean;
  grund?: string | null;
  balanceAfter?: number;
  at?: string;
};

type QuittungsDatei = {
  generatedAt?: string;
  ready?: boolean;
  errors?: Array<{ at?: string; error?: string }>;
  receipts?: Quittung[];
};

async function leseQuittungen(): Promise<QuittungsDatei | null> {
  if (!craftyConfigured) return null;
  try {
    return await craftyReadJson<QuittungsDatei>(QUITTUNGSDATEI);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

/** Fragt die Quittungsdatei ein paarmal ab, bis der Beleg auftaucht. */
async function warteAufQuittung(belegId: string): Promise<Quittung | null> {
  for (const wartenMs of [700, 1200, 2000]) {
    await new Promise((fertig) => setTimeout(fertig, wartenMs));
    const datei = await leseQuittungen();
    const treffer = datei?.receipts?.find((beleg) => beleg.belegId === belegId);
    if (treffer) return treffer;
  }
  return null;
}

/** Läuft bounty.js auf dem Server? Ohne das wird gar nichts erst angeboten. */
export async function kopfgeldSkriptBereit(): Promise<boolean> {
  const datei = await leseQuittungen();
  return datei?.ready === true;
}

// ---------------------------------------------------------------------------
// Aussetzen
// ---------------------------------------------------------------------------

export type AussetzErgebnis =
  | { ok: true; cogs: number; ziel: string }
  | {
      ok: false;
      grund: "kein-konto" | "ziel-unbekannt" | "skript-fehlt" | "zu-wenig" | "nicht-angekommen" | "doppelt";
      detail?: string;
    };

/**
 * Die eigene Minecraft-UUID, notfalls bei Mojang nachgeschlagen.
 *
 * Wie beim Gehalt: Wer seinen Namen verknüpft hat, aber noch nie im Protokoll
 * auftauchte, hat keine gespeicherte UUID – und bekäme sonst die irreführende
 * Auskunft, sein Account sei nicht verknüpft.
 */
async function eigeneUuid(user: {
  id: string;
  minecraftName: string | null;
  minecraftUuid: string | null;
}): Promise<string | null> {
  if (!user.minecraftName || !GAMERTAG_RE.test(user.minecraftName)) return null;
  if (user.minecraftUuid) return mitBindestrichen(user.minecraftUuid);

  const treffer = await lookupMinecraftName(user.minecraftName);
  if (treffer.status !== "gefunden") return null;

  const uuid = mitBindestrichen(treffer.uuid);
  await prisma.user
    .update({ where: { id: user.id }, data: { minecraftUuid: uuid } })
    .catch((error) => console.error("[kopfgeld] UUID konnte nicht gespeichert werden:", error));
  return uuid;
}

/**
 * Setzt ein Kopfgeld aus und bucht den Einsatz ab.
 *
 * Reihenfolge mit Absicht: erst die Zeile (PENDING), dann die Abbuchung, dann
 * die Quittung. Geht die Abbuchung schief, verschwindet die Zeile wieder – so
 * kann es höchstens ein Kopfgeld zu wenig geben (einfach nochmal), nie eines,
 * das niemand bezahlt hat.
 */
export async function setzeKopfgeldAus(
  user: { id: string; name: string | null; minecraftName: string | null; minecraftUuid: string | null },
  eingabe: BountyInput,
): Promise<AussetzErgebnis> {
  if (!(await kopfgeldSkriptBereit())) return { ok: false, grund: "skript-fehlt" };

  const placerUuid = await eigeneUuid(user);
  if (!placerUuid || !user.minecraftName) return { ok: false, grund: "kein-konto" };

  // Das Ziel muss es geben – sonst läge das Geld auf einem Tippfehler fest.
  const ziel = await lookupMinecraftName(eingabe.targetName);
  if (ziel.status !== "gefunden") return { ok: false, grund: "ziel-unbekannt" };

  const targetName = ziel.name;
  const targetUuid = mitBindestrichen(ziel.uuid);
  if (targetUuid === placerUuid) return { ok: false, grund: "doppelt" };

  // Ende des gewählten Tages, nach der Uhr in Berlin: Wer den 12.09. einträgt,
  // meint "bis der 12. vorbei ist", nicht "bis Mitternacht davor".
  const expiresAt = eingabe.expiresOn ? berlinNachDatum(`${eingabe.expiresOn}T23:59`) : null;

  const spurs = eingabe.cogs * SPURS_PER_COG;

  const zeile = await prisma.bounty.create({
    data: {
      placerId: user.id,
      placerName: user.minecraftName,
      placerUuid,
      targetName,
      targetUuid,
      spurs,
      status: "PENDING",
      expiresAt,
    },
    select: { id: true },
  });

  const gesendet = await runPlayerCommand(
    `vipkopfgeld abbuchen ${placerUuid} ${spurs} ${zeile.id}`,
    `Kopfgeld auf ${targetName} ausgesetzt`,
    { id: user.id, name: user.name },
  );

  const quittung = gesendet.ok ? await warteAufQuittung(zeile.id) : null;

  if (quittung?.ok === true) {
    await prisma.bounty.update({ where: { id: zeile.id }, data: { status: "OPEN" } });
    await schreibeServerListe();
    await sageKopfgeldAn(targetName, eingabe.cogs, expiresAt, { id: user.id, name: user.name });
    return { ok: true, cogs: eingabe.cogs, ziel: targetName };
  }

  await prisma.bounty.delete({ where: { id: zeile.id } }).catch(() => undefined);

  if (quittung?.grund === "zu-wenig") return { ok: false, grund: "zu-wenig" };
  return { ok: false, grund: "nicht-angekommen", detail: gesendet.ok ? undefined : gesendet.error };
}

/**
 * Sagt ein frisch ausgesetztes Kopfgeld allen an, die gerade online sind.
 *
 * Bewusst erst NACH der bestätigten Abbuchung aufgerufen: Eine Ansage für ein
 * Kopfgeld, das an der Bezahlung scheitert, wäre schlimmer als gar keine.
 *
 * Wer offline ist, erfährt es beim nächsten Betreten – dafür liest bounty.js
 * die Liste, die schreibeServerListe() hinterlegt.
 *
 * Das Datum geht fertig formatiert mit ("12.09.", oder "-" für unbefristet):
 * Im Skript soll nicht mit Zeitzonen gerechnet werden. Alle drei Angaben sind
 * Einzelwörter ohne Leerzeichen – der Name kommt kanonisch von Mojang und
 * erfüllt GAMERTAG_RE, der Betrag ist eine geprüfte Zahl. Der Befehl kann
 * dadurch nicht aufgespalten werden.
 *
 * Scheitert die Ansage, bleibt das Kopfgeld trotzdem stehen. Es steht auf der
 * Website und wird beim Betreten angesagt; eine verpasste Zeile im Chat ist
 * kein Grund, das Geld zurückzubuchen.
 */
async function sageKopfgeldAn(
  ziel: string,
  cogs: number,
  expiresAt: Date | null,
  actor: { id: string; name: string | null },
): Promise<void> {
  const frist = expiresAt ? kurzesDatum(expiresAt) : "-";
  await runPlayerCommand(
    `vipkopfgeld melden ${ziel} ${cogs} ${frist}`,
    `Kopfgeld auf ${ziel} im Spiel angekuendigt`,
    actor,
  );
}

// ---------------------------------------------------------------------------
// Abrechnen: auszahlen und ablaufen lassen
// ---------------------------------------------------------------------------

/** Nicht bei jedem Seitenaufruf durchrechnen. */
const ABSTAND_MS = 15_000;
let letzterLauf = 0;
let laeuft = false;

/**
 * Darf dieser Versuch jetzt laufen?
 *
 * Nach einem Fehlschlag wächst der Abstand: 2, 4, 8 … Minuten, gedeckelt bei
 * einer Stunde. Ohne diese Bremse landet eine dauerhaft scheiternde Buchung
 * bei jedem Statusabruf erneut auf der Server-Konsole – alle paar Sekunden ein
 * Befehl, der nichts bewirkt.
 *
 * Aufgegeben wird trotzdem nie. Bei einem Kopfgeld liegt echtes Geld fest:
 * entweder beim Jäger, der es verdient hat, oder beim Ausschreiber, dem es
 * zurücksteht. Es einfach verfallen zu lassen wäre die falsche Art von Ruhe.
 */
function darfVersuchen(attempts: number, lastTryAt: Date | null): boolean {
  if (attempts === 0 || !lastTryAt) return true;
  const minuten = Math.min(2 ** attempts, 60);
  return Date.now() - lastTryAt.getTime() >= minuten * 60_000;
}

/** Fehlschlag festhalten, damit der nächste Versuch später kommt. */
async function merkeFehlversuch(id: string, attempts: number, note: string): Promise<void> {
  await prisma.bounty.update({
    where: { id },
    data: { status: "OPEN", note, attempts: attempts + 1, lastTryAt: new Date() },
  });
}

/** Name → UUID, aus den Accounts und aus dem Spielprotokoll. */
async function uuidFuerNamen(name: string): Promise<string | null> {
  const account = await prisma.user.findMany({
    where: { NOT: { minecraftUuid: null } },
    select: { minecraftName: true, minecraftUuid: true },
  });
  const treffer = account.find((a) => a.minecraftName?.toLowerCase() === name.toLowerCase());
  if (treffer?.minecraftUuid) return mitBindestrichen(treffer.minecraftUuid);

  // Wer nie auf der Website war, steht trotzdem im Protokoll – dort schreibt
  // das KubeJS-Skript die UUID bei jedem Betreten mit.
  const zeile = await prisma.gameLog.findFirst({
    where: { playerName: name, NOT: { playerUuid: null } },
    orderBy: { seq: "desc" },
    select: { playerUuid: true },
  });
  if (zeile?.playerUuid) return mitBindestrichen(zeile.playerUuid);

  const mojang = await lookupMinecraftName(name);
  return mojang.status === "gefunden" ? mitBindestrichen(mojang.uuid) : null;
}

/** Namen, von denen wir wissen, dass es Personen sind – für die Todesanalyse. */
async function spielerNamen(): Promise<Set<string>> {
  const zeilen = await prisma.gameLog.findMany({
    where: { kind: { in: ["JOIN", "QUIT", "CHAT", "DEATH"] } },
    distinct: ["playerName"],
    select: { playerName: true },
    take: 1000,
  });
  return new Set(zeilen.map((z) => z.playerName));
}

/**
 * Zahlt fällige Kopfgelder aus und erstattet abgelaufene zurück.
 *
 * Wird vom Statusabruf mitgezogen (api/server-status), also etwa im Minutentakt.
 * Fehler bleiben folgenlos: Was nicht durchgeht, steht beim nächsten Durchgang
 * wieder da.
 */
export async function rechneKopfgelderAb(erzwingen = false): Promise<number> {
  if (!craftyConfigured) return 0;
  if (!erzwingen && (laeuft || Date.now() - letzterLauf < ABSTAND_MS)) return 0;
  laeuft = true;
  letzterLauf = Date.now();

  try {
    let veraendert = 0;
    veraendert += await lasseAblaufen();
    veraendert += await zahleAus();
    if (veraendert > 0) await schreibeServerListe();
    return veraendert;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[kopfgeld] Abrechnung fehlgeschlagen:", error);
    return 0;
  } finally {
    laeuft = false;
  }
}

/**
 * Abgelaufene Kopfgelder: Einsatz zurück an den Ausschreiber.
 *
 * Das Geld verfallen zu lassen wäre die bequemere Lösung, aber es würde bei
 * jedem Ablauf Geld aus der Wirtschaft löschen – und niemand hätte etwas davon.
 */
async function lasseAblaufen(): Promise<number> {
  const faellig = await prisma.bounty.findMany({
    where: { status: "OPEN", expiresAt: { not: null, lte: new Date() } },
    select: {
      id: true,
      placerId: true,
      placerUuid: true,
      placerName: true,
      spurs: true,
      targetName: true,
      attempts: true,
      lastTryAt: true,
    },
  });

  let erledigt = 0;
  for (const kopfgeld of faellig) {
    if (!darfVersuchen(kopfgeld.attempts, kopfgeld.lastTryAt)) continue;

    // Bedingtes UPDATE als Sperre: Nur wer den Wechsel OPEN → PAYING schafft,
    // darf zahlen. Zwei gleichzeitige Durchgänge erstatten so nicht doppelt.
    const belegt = await prisma.bounty.updateMany({
      where: { id: kopfgeld.id, status: "OPEN" },
      data: { status: "PAYING", note: "ablauf" },
    });
    if (belegt.count === 0) continue;

    const belegId = `refund-${kopfgeld.id}`;
    const gesendet = await runPlayerCommand(
      `vipkopfgeld auszahlen ${kopfgeld.placerUuid} ${kopfgeld.spurs} ${belegId}`,
      `Kopfgeld auf ${kopfgeld.targetName} abgelaufen, Einsatz zurück`,
      null,
    );
    const quittung = gesendet.ok ? await warteAufQuittung(belegId) : null;

    if (quittung?.ok === true) {
      await prisma.bounty.update({
        where: { id: kopfgeld.id },
        data: { status: "EXPIRED", note: "abgelaufen, Einsatz zurueckerstattet" },
      });
      erledigt += 1;
    } else {
      await merkeFehlversuch(kopfgeld.id, kopfgeld.attempts, "Erstattung fehlgeschlagen, wird wiederholt");
    }
  }
  return erledigt;
}

/** Offene Kopfgelder gegen die Todesmeldungen halten. */
async function zahleAus(): Promise<number> {
  const offen = await prisma.bounty.findMany({
    where: { status: "OPEN" },
    select: {
      id: true,
      targetName: true,
      spurs: true,
      expiresAt: true,
      createdAt: true,
      placerName: true,
      attempts: true,
      lastTryAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  if (offen.length === 0) return 0;

  const aeltestes = offen[0].createdAt;
  const [tode, spieler] = await Promise.all([
    prisma.gameLog.findMany({
      where: { kind: "DEATH", at: { gt: aeltestes } },
      orderBy: { seq: "asc" },
      select: { seq: true, playerName: true, text: true, at: true },
      take: 5000,
    }),
    spielerNamen(),
  ]);
  if (tode.length === 0) return 0;

  let erledigt = 0;
  for (const kopfgeld of offen) {
    if (!darfVersuchen(kopfgeld.attempts, kopfgeld.lastTryAt)) continue;

    const treffer = tode.find((zeile) => {
      if (zeile.playerName.toLowerCase() !== kopfgeld.targetName.toLowerCase()) return false;
      if (zeile.at <= kopfgeld.createdAt) return false;
      if (kopfgeld.expiresAt && zeile.at > kopfgeld.expiresAt) return false;

      const ursache = analysiereTod(zeile.text, zeile.playerName, spieler);
      if (ursache.art !== "spieler") return false;
      // Sich selbst zu erledigen zahlt nicht aus – sonst wäre jedes Kopfgeld
      // ein Geschenk an das Ziel.
      return ursache.schluessel.toLowerCase() !== zeile.playerName.toLowerCase();
    });
    if (!treffer) continue;

    const ursache = analysiereTod(treffer.text, treffer.playerName, spieler);
    const jaeger = ursache.schluessel;

    const jaegerUuid = await uuidFuerNamen(jaeger);
    if (!jaegerUuid) {
      // Zählt als Fehlversuch: Sonst liefe die Mojang-Abfrage bei jedem
      // Statusabruf erneut, für einen Namen, den es dort offenbar nicht gibt.
      await merkeFehlversuch(kopfgeld.id, kopfgeld.attempts, `Keine UUID zu ${jaeger} gefunden - Auszahlung steht aus`);
      continue;
    }

    const belegt = await prisma.bounty.updateMany({
      where: { id: kopfgeld.id, status: "OPEN" },
      data: { status: "PAYING", note: null },
    });
    if (belegt.count === 0) continue;

    const gesendet = await runPlayerCommand(
      `vipkopfgeld auszahlen ${jaegerUuid} ${kopfgeld.spurs} ${kopfgeld.id}`,
      `Kopfgeld auf ${kopfgeld.targetName} kassiert von ${jaeger}`,
      null,
    );
    const quittung = gesendet.ok ? await warteAufQuittung(kopfgeld.id) : null;

    if (quittung?.ok === true) {
      await prisma.bounty.update({
        where: { id: kopfgeld.id },
        data: {
          status: "CLAIMED",
          claimedByName: jaeger,
          claimedByUuid: jaegerUuid,
          claimedAt: treffer.at,
          claimedSeq: treffer.seq,
          note: treffer.text,
        },
      });
      erledigt += 1;
    } else {
      await merkeFehlversuch(kopfgeld.id, kopfgeld.attempts, "Auszahlung fehlgeschlagen, wird wiederholt");
    }
  }
  return erledigt;
}

// ---------------------------------------------------------------------------
// Ankündigung im Spiel
// ---------------------------------------------------------------------------

/**
 * Legt die offenen Kopfgelder für das Skript im Spiel ab.
 *
 * Das Datum steht hier schon fertig als "12.09." drin: Rhino soll nicht mit
 * Zeitzonen rechnen müssen, und die Ankündigung soll überall gleich aussehen.
 */
export async function schreibeServerListe(): Promise<void> {
  if (!craftyConfigured) return;
  try {
    const offen = await prisma.bounty.findMany({
      where: { status: { in: ["OPEN", "PAYING"] } },
      select: { targetName: true, targetUuid: true, spurs: true, expiresAt: true },
      orderBy: { spurs: "desc" },
      take: 50,
    });

    const inhalt = {
      generatedAt: new Date().toISOString(),
      entries: offen.map((eintrag) => ({
        target: eintrag.targetName,
        targetUuid: eintrag.targetUuid,
        cogs: Math.round(eintrag.spurs / SPURS_PER_COG),
        until: eintrag.expiresAt ? kurzesDatum(eintrag.expiresAt) : null,
      })),
    };

    await craftyWriteFile(LISTENDATEI, JSON.stringify(inhalt, null, 2));
  } catch (error) {
    unstable_rethrow(error);
    // Folgenlos: Ohne frische Liste sagt das Skript beim Betreten eben den
    // vorigen Stand an. Das Kopfgeld selbst steht in der Datenbank.
    console.error("[kopfgeld] Serverliste konnte nicht geschrieben werden:", error);
  }
}

// ---------------------------------------------------------------------------
// Guthaben
// ---------------------------------------------------------------------------

type NumismaticsExport = {
  stage?: string;
  accounts?: Array<{ id: string; type: string; balanceSpurs: number }>;
};

/**
 * Der eigene Kontostand in ganzen Cog, damit im Formular steht, was zur
 * Verfuegung steht.
 *
 * Nur zur Anzeige: Der Export wird alle paar Minuten geschrieben und kann
 * veraltet sein. Ob das Geld wirklich reicht, entscheidet die Abbuchung im
 * Spiel - und nur die.
 */
export async function guthabenCogs(uuid: string | null): Promise<number | null> {
  if (!uuid || !craftyConfigured) return null;
  try {
    const datei = await craftyReadJson<NumismaticsExport>("kubejs/data/numismatics.json");
    if (!datei || datei.stage !== "ok" || !Array.isArray(datei.accounts)) return null;

    const gesucht = mitBindestrichen(uuid).toLowerCase();
    const konto = datei.accounts.find((a) => a.type === "PLAYER" && a.id.toLowerCase() === gesucht);
    if (!konto) return null;
    return Math.floor(konto.balanceSpurs / SPURS_PER_COG);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Anzeige
// ---------------------------------------------------------------------------

export type KopfgeldZeile = {
  id: string;
  targetName: string;
  cogs: number;
  placerName: string;
  expiresAt: string | null;
  createdAt: string;
  status: string;
  claimedByName: string | null;
  claimedAt: string | null;
  /** Die Todesmeldung, die zur Auszahlung geführt hat. */
  meldung: string | null;
};

function zuZeile(eintrag: {
  id: string;
  targetName: string;
  spurs: number;
  placerName: string;
  expiresAt: Date | null;
  createdAt: Date;
  status: string;
  claimedByName: string | null;
  claimedAt: Date | null;
  note: string | null;
}): KopfgeldZeile {
  return {
    id: eintrag.id,
    targetName: eintrag.targetName,
    cogs: Math.round(eintrag.spurs / SPURS_PER_COG),
    placerName: eintrag.placerName,
    expiresAt: eintrag.expiresAt?.toISOString() ?? null,
    createdAt: eintrag.createdAt.toISOString(),
    status: eintrag.status,
    claimedByName: eintrag.claimedByName,
    claimedAt: eintrag.claimedAt?.toISOString() ?? null,
    meldung: eintrag.status === "CLAIMED" ? eintrag.note : null,
  };
}

const anzeigeFelder = {
  id: true,
  targetName: true,
  spurs: true,
  placerName: true,
  expiresAt: true,
  createdAt: true,
  status: true,
  claimedByName: true,
  claimedAt: true,
  note: true,
} as const;

/** Was gerade zu holen ist – höchster Einsatz zuerst. */
export async function offeneKopfgelder(): Promise<KopfgeldZeile[]> {
  const zeilen = await prisma.bounty.findMany({
    where: { status: { in: ["OPEN", "PAYING"] } },
    select: anzeigeFelder,
    orderBy: [{ spurs: "desc" }, { createdAt: "asc" }],
    take: 100,
  });
  return zeilen.map(zuZeile);
}

/** Was schon gelaufen ist – kassiert oder abgelaufen. */
export async function erledigteKopfgelder(limit = 25): Promise<KopfgeldZeile[]> {
  const zeilen = await prisma.bounty.findMany({
    where: { status: { in: ["CLAIMED", "EXPIRED"] } },
    select: anzeigeFelder,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return zeilen.map(zuZeile);
}

/** Die eigenen Ausschreibungen, für „was habe ich laufen". */
export async function meineKopfgelder(userId: string): Promise<KopfgeldZeile[]> {
  const zeilen = await prisma.bounty.findMany({
    where: { placerId: userId, status: { not: "PENDING" } },
    select: anzeigeFelder,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return zeilen.map(zuZeile);
}
