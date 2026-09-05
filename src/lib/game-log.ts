import { unstable_rethrow } from "next/navigation";
import "server-only";
import { craftyConfigured, craftyReadJson } from "@/lib/crafty";
import { prisma } from "@/lib/prisma";
import { istGameLogArt, type GameLogEintrag } from "@/lib/game-log-types";
import { getSiteSettings } from "@/lib/settings";

/**
 * Chat, Befehle, Kommen und Gehen vom Spielserver einsammeln.
 *
 * Das KubeJS-Skript insights-log.js schreibt die Ereignisse in
 * kubejs/data/insights.json – einen Ringpuffer mit fortlaufenden Nummern. Hier
 * wird die Datei regelmäßig gelesen und alles übernommen, was neuer ist als
 * das, was schon in der Datenbank steht.
 *
 * Wie oft: aus dem Watchdog (jede Minute) und beim Öffnen der Insights-Seiten.
 * Der Ringpuffer fasst 1000 Ereignisse, deckt also selbst bei lebhaftem Chat
 * viel mehr als eine Minute ab.
 *
 * WOHER DER STAND KOMMT: nicht aus einem gemerkten Zeiger, sondern aus der
 * höchsten bereits gespeicherten Nummer dieses Serverlaufs. Damit ist der Stand
 * nach einem Neustart der Website automatisch richtig, und der eindeutige
 * Index (runId, sourceSeq) verhindert Doppelte auch dann, wenn zwei Abrufe
 * gleichzeitig laufen.
 */

const QUELLDATEI = "kubejs/data/insights.json";
/** Häufiger als alle 10 Sekunden lohnt sich der Abruf nicht. */
const ABSTAND_MS = 10_000;

export type ErfassungsStand = {
  /** Datei gefunden und lesbar? */
  erreichbar: boolean;
  /** Was das Skript über sich selbst sagt (siehe insights-log.js). */
  stage: string | null;
  /** Wann das Skript zuletzt geschrieben hat. */
  generatedAt: string | null;
  /** Ereignisse, die sich im Skript nicht registrieren ließen. */
  fehler: string[];
  /** Im letzten Durchgang übernommen. */
  neu: number;
  /** Ereignisse, die der Ringpuffer verworfen hat, bevor wir sie holen konnten. */
  luecke: number;
  meldung: string | null;
  geprueftAm: string | null;
};

let letzterLauf = 0;
let laeuft = false;
let letzterStand: ErfassungsStand = {
  erreichbar: false,
  stage: null,
  generatedAt: null,
  fehler: [],
  neu: 0,
  luecke: 0,
  meldung: "Noch nicht nachgesehen.",
  geprueftAm: null,
};

export function letzterErfassungsStand(): ErfassungsStand {
  return letzterStand;
}

type RohEintrag = { nr?: unknown; at?: unknown; art?: unknown; name?: unknown; uuid?: unknown; text?: unknown };
type RohDatei = {
  generatedAt?: unknown;
  stage?: unknown;
  runId?: unknown;
  verloren?: unknown;
  fehler?: unknown;
  eintraege?: unknown;
};

function zahl(wert: unknown): number | null {
  const n = typeof wert === "number" ? wert : Number(wert);
  return Number.isFinite(n) ? n : null;
}

function textOderNull(wert: unknown): string | null {
  return typeof wert === "string" && wert.length > 0 ? wert : null;
}

/** Höchste bereits gespeicherte Nummer dieses Serverlaufs. 0 = noch keine. */
async function hoechsteNummer(runId: string): Promise<number> {
  const treffer = await prisma.gameLog.aggregate({
    where: { runId },
    _max: { sourceSeq: true },
  });
  return treffer._max.sourceSeq ?? 0;
}

/** Namen und UUIDs den Website-Accounts zuordnen. */
async function accountsZuordnen(): Promise<{ nachName: Map<string, string>; nachUuid: Map<string, string> }> {
  const nutzer = await prisma.user.findMany({
    where: { OR: [{ NOT: { minecraftName: null } }, { NOT: { minecraftUuid: null } }] },
    select: { id: true, minecraftName: true, minecraftUuid: true },
  });

  const nachName = new Map<string, string>();
  const nachUuid = new Map<string, string>();
  for (const person of nutzer) {
    // Klein geschrieben vergleichen: SQLite vergleicht sonst Zeichen für
    // Zeichen, und im Spiel steht der Name in seiner echten Schreibweise.
    if (person.minecraftName) nachName.set(person.minecraftName.toLowerCase(), person.id);
    if (person.minecraftUuid) nachUuid.set(person.minecraftUuid.toLowerCase(), person.id);
  }
  return { nachName, nachUuid };
}

/**
 * Trägt die UUID am Account nach, sobald sie zum ersten Mal aus dem Spiel kommt.
 * Damit bleibt der Verlauf auch nach einer Namensänderung zugeordnet.
 */
async function uuidNachtragen(userId: string, uuid: string): Promise<void> {
  try {
    await prisma.user.updateMany({
      where: { id: userId, minecraftUuid: null },
      data: { minecraftUuid: uuid },
    });
  } catch (error) {
    console.error("[game-log] UUID konnte nicht nachgetragen werden:", error);
  }
}

/** Holt neue Ereignisse vom Server. Mehrfachaufrufe sind harmlos. */
export async function holeEreignisse(erzwingen = false): Promise<ErfassungsStand> {
  if (!craftyConfigured) {
    letzterStand = { ...letzterStand, erreichbar: false, meldung: "Crafty ist nicht angebunden." };
    return letzterStand;
  }
  if (laeuft) return letzterStand;
  if (!erzwingen && Date.now() - letzterLauf < ABSTAND_MS) return letzterStand;

  laeuft = true;
  try {
    letzterStand = await durchgang();
  } catch (error) {
    unstable_rethrow(error);
    console.error("[game-log] Durchgang fehlgeschlagen:", error);
    letzterStand = {
      ...letzterStand,
      erreichbar: false,
      neu: 0,
      meldung: error instanceof Error ? error.message : String(error),
      geprueftAm: new Date().toISOString(),
    };
  } finally {
    laeuft = false;
    letzterLauf = Date.now();
  }
  return letzterStand;
}

async function durchgang(): Promise<ErfassungsStand> {
  const jetzt = new Date().toISOString();
  const daten = await craftyReadJson<RohDatei>(QUELLDATEI);

  if (!daten) {
    return {
      erreichbar: false,
      stage: null,
      generatedAt: null,
      fehler: [],
      neu: 0,
      luecke: 0,
      meldung: `${QUELLDATEI} ist nicht lesbar. Liegt das Skript auf dem Server und lief seitdem ein Neustart?`,
      geprueftAm: jetzt,
    };
  }

  const runId = textOderNull(daten.runId);
  const stage = textOderNull(daten.stage);
  const generatedAt = textOderNull(daten.generatedAt);
  const fehler = Array.isArray(daten.fehler) ? daten.fehler.map(String) : [];
  const roh = Array.isArray(daten.eintraege) ? (daten.eintraege as RohEintrag[]) : [];

  if (!runId) {
    return {
      erreichbar: false,
      stage,
      generatedAt,
      fehler,
      neu: 0,
      luecke: 0,
      meldung: "Die Datei hat keine Lauf-Kennung – vermutlich eine ältere Fassung des Skripts.",
      geprueftAm: jetzt,
    };
  }

  const bekannt = await hoechsteNummer(runId);

  const neue = roh
    .map((eintrag) => ({
      nr: zahl(eintrag.nr),
      at: textOderNull(eintrag.at),
      art: typeof eintrag.art === "string" ? eintrag.art : "",
      name: typeof eintrag.name === "string" ? eintrag.name : "?",
      uuid: textOderNull(eintrag.uuid),
      text: typeof eintrag.text === "string" ? eintrag.text : "",
    }))
    .filter((eintrag) => eintrag.nr !== null && eintrag.nr > bekannt && istGameLogArt(eintrag.art))
    .sort((a, b) => (a.nr ?? 0) - (b.nr ?? 0));

  // Der Ringpuffer hält nur die letzten 1000 Ereignisse. Fängt das Neue nicht
  // direkt hinter dem Bekannten an, war die Website zu lange nicht da.
  const kleinste = neue.length > 0 ? (neue[0].nr ?? 0) : 0;
  const luecke = kleinste > bekannt + 1 ? kleinste - bekannt - 1 : 0;

  if (neue.length === 0) {
    return {
      erreichbar: true,
      stage,
      generatedAt,
      fehler,
      neu: 0,
      luecke: 0,
      meldung: null,
      geprueftAm: jetzt,
    };
  }

  const { nachName, nachUuid } = await accountsZuordnen();
  const nachzutragen = new Map<string, string>();

  const zeilen = neue.map((eintrag) => {
    const perUuid = eintrag.uuid ? nachUuid.get(eintrag.uuid.toLowerCase()) : undefined;
    const perName = nachName.get(eintrag.name.toLowerCase());
    const userId = perUuid ?? perName ?? null;

    if (userId && !perUuid && eintrag.uuid) nachzutragen.set(userId, eintrag.uuid);

    return {
      runId,
      sourceSeq: eintrag.nr ?? 0,
      kind: eintrag.art,
      playerName: eintrag.name,
      playerUuid: eintrag.uuid,
      userId,
      text: eintrag.text,
      at: eintrag.at ? new Date(eintrag.at) : new Date(),
    };
  });

  const geschrieben = await schreibeGameLogZeilen(zeilen);
  for (const [userId, uuid] of nachzutragen) await uuidNachtragen(userId, uuid);

  if (luecke > 0) {
    console.warn(`[game-log] ${luecke} Ereignisse verpasst – der Ringpuffer war schon weiter.`);
  }

  return {
    erreichbar: true,
    stage,
    generatedAt,
    fehler,
    neu: geschrieben,
    luecke,
    meldung: null,
    geprueftAm: jetzt,
  };
}

/**
 * Eine Zeile, wie sie in die Tabelle geschrieben wird.
 *
 * `runId`+`sourceSeq` sind das Eindeutigkeitsmerkmal für Ereignisse aus dem
 * KubeJS-Skript, `externalId` für Discord-Nachrichten (siehe discord-chat.ts)
 * – jede Quelle nutzt nur ihr eigenes Feld, das andere bleibt `null`. Das ist
 * kein Kompromiss: In einem Unique-Index zählt `null` in SQLite nie als
 * Duplikat, auch nicht gegen ein zweites `null`, also stören sich die beiden
 * Schemata nicht gegenseitig.
 */
export type NeueGameLogZeile = {
  runId?: string | null;
  sourceSeq?: number | null;
  externalId?: string | null;
  kind: string;
  playerName: string;
  playerUuid: string | null;
  userId: string | null;
  text: string;
  at: Date;
};

/**
 * Schreibt den Schwung. Im Normalfall in einem Rutsch; kommt dabei ein
 * Doppelter vor (zwei Abrufe zur selben Zeit), wird zeilenweise nachgeholt und
 * das Doppelte übersprungen.
 *
 * Exportiert, weil discord-chat.ts dieselbe Tabelle mit demselben
 * Duplikat-Schutz beschreibt – nur mit `externalId` statt `runId`/`sourceSeq`
 * als Eindeutigkeitsmerkmal.
 */
export async function schreibeGameLogZeilen(zeilen: NeueGameLogZeile[]): Promise<number> {
  try {
    const ergebnis = await prisma.gameLog.createMany({ data: zeilen });
    return ergebnis.count;
  } catch (error) {
    unstable_rethrow(error);

    let geschrieben = 0;
    for (const zeile of zeilen) {
      try {
        await prisma.gameLog.create({ data: zeile });
        geschrieben += 1;
      } catch {
        // Schon vorhanden – genau dafür ist der eindeutige Index da.
      }
    }
    return geschrieben;
  }
}

// ---------------------------------------------------------------------------
// Lesen
// ---------------------------------------------------------------------------

function alsEintrag(zeile: {
  seq: number;
  kind: string;
  playerName: string;
  playerUuid: string | null;
  userId: string | null;
  text: string;
  at: Date;
}): GameLogEintrag {
  return {
    seq: zeile.seq,
    kind: zeile.kind,
    playerName: zeile.playerName,
    playerUuid: zeile.playerUuid,
    userId: zeile.userId,
    text: zeile.text,
    at: zeile.at.toISOString(),
  };
}

const auswahl = {
  seq: true,
  kind: true,
  playerName: true,
  playerUuid: true,
  userId: true,
  text: true,
  at: true,
} as const;

export type VerlaufFilter = {
  arten?: string[];
  /** Nur dieser Spieler (Name, Groß-/Kleinschreibung egal). */
  name?: string;
  suche?: string;
  take?: number;
  /** Für „ältere laden": nur Einträge vor dieser Nummer. */
  vorSeq?: number;
};

/** Verlauf, neueste zuerst. */
export async function ladeVerlauf(filter: VerlaufFilter = {}): Promise<GameLogEintrag[]> {
  const zeilen = await prisma.gameLog.findMany({
    where: {
      ...(filter.arten && filter.arten.length > 0 ? { kind: { in: filter.arten } } : {}),
      ...(filter.name ? { playerName: filter.name } : {}),
      ...(filter.suche ? { text: { contains: filter.suche } } : {}),
      ...(filter.vorSeq ? { seq: { lt: filter.vorSeq } } : {}),
    },
    orderBy: { seq: "desc" },
    take: Math.min(filter.take ?? 50, 200),
    select: auswahl,
  });
  return zeilen.map(alsEintrag);
}

/**
 * Die Nachricht selbst plus je `radius` Ereignisse davor und danach – von
 * allen Spielern, denn genau darum geht es beim Nachlesen: Was war da los?
 */
export async function ladeKontext(seq: number, radius = 5): Promise<GameLogEintrag[]> {
  const [davor, mitte, danach] = await Promise.all([
    prisma.gameLog.findMany({ where: { seq: { lt: seq } }, orderBy: { seq: "desc" }, take: radius, select: auswahl }),
    prisma.gameLog.findUnique({ where: { seq }, select: auswahl }),
    prisma.gameLog.findMany({ where: { seq: { gt: seq } }, orderBy: { seq: "asc" }, take: radius, select: auswahl }),
  ]);

  if (!mitte) return [];
  return [...davor.reverse(), mitte, ...danach].map(alsEintrag);
}

export type SpielerZahlen = {
  nachrichten: number;
  befehle: number;
  tode: number;
  beitritte: number;
  ersteSichtung: string | null;
  letzteSichtung: string | null;
};

export async function spielerZahlen(name: string): Promise<SpielerZahlen> {
  const [nachrichten, befehle, tode, beitritte, erste, letzte] = await Promise.all([
    // Discord-Nachrichten zaehlen mit - fuer jemanden mit verknuepftem Account
    // laufen sie ohnehin unter demselben Minecraft-Namen (siehe discord-chat.ts).
    prisma.gameLog.count({ where: { playerName: name, kind: { in: ["CHAT", "DISCORD_CHAT"] } } }),
    // Konsolenbefehle zaehlen mit: Bei der Konsole selbst ist es alles, was sie
    // je getan hat, und bei einem Spieler kommt diese Art gar nicht vor.
    prisma.gameLog.count({ where: { playerName: name, kind: { in: ["COMMAND", "COMMAND_CONSOLE"] } } }),
    prisma.gameLog.count({ where: { playerName: name, kind: "DEATH" } }),
    prisma.gameLog.count({ where: { playerName: name, kind: "JOIN" } }),
    prisma.gameLog.findFirst({ where: { playerName: name }, orderBy: { seq: "asc" }, select: { at: true } }),
    prisma.gameLog.findFirst({ where: { playerName: name }, orderBy: { seq: "desc" }, select: { at: true } }),
  ]);

  return {
    nachrichten,
    befehle,
    tode,
    beitritte,
    ersteSichtung: erste?.at.toISOString() ?? null,
    letzteSichtung: letzte?.at.toISOString() ?? null,
  };
}

/** Alle Namen, von denen etwas vorliegt – für die Spielerliste im Kontrollraum. */
export async function bekannteSpieler(): Promise<string[]> {
  const zeilen = await prisma.gameLog.findMany({
    distinct: ["playerName"],
    orderBy: { seq: "desc" },
    select: { playerName: true },
    take: 500,
  });
  return zeilen.map((z) => z.playerName);
}

// ---------------------------------------------------------------------------
// Aufräumen
// ---------------------------------------------------------------------------

/** Löscht Einträge, die älter sind als `tage`. `null` löscht alles. */
export async function loescheVerlauf(tage: number | null): Promise<number> {
  const ergebnis =
    tage === null
      ? await prisma.gameLog.deleteMany({})
      : await prisma.gameLog.deleteMany({ where: { at: { lt: new Date(Date.now() - tage * 86_400_000) } } });
  return ergebnis.count;
}

/**
 * Wendet die eingestellte Aufbewahrungsfrist an. 0 heißt „unbegrenzt" – dann
 * passiert nichts.
 */
export async function bereinigeVerlauf(): Promise<number> {
  const einstellungen = await getSiteSettings();
  const tage = einstellungen.gameLogRetentionDays;
  if (!tage || tage <= 0) return 0;

  const geloescht = await loescheVerlauf(tage);
  if (geloescht > 0) console.log(`[game-log] ${geloescht} Einträge älter als ${tage} Tage gelöscht.`);
  return geloescht;
}
