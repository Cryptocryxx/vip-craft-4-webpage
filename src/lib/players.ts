import { unstable_rethrow } from "next/navigation";
import "server-only";
import { craftyConfigured, craftyLiveStats, craftyLogLines, craftyReadJson, craftySendCommand } from "@/lib/crafty";
import { buildUuidToName, type UserCacheEntry } from "@/lib/minecraft-stats";
import { prisma } from "@/lib/prisma";
import { invalidateStatsCache, loadAllPlayerStats } from "@/lib/stats-source";
import type { ParsedStats } from "@/lib/minecraft-stats";

/**
 * Spielerverzeichnis: wer ist gerade da, wer war schon mal da, und was sagen
 * seine Zahlen.
 *
 * Quellen: die Online-Liste kommt live aus Crafty, die Statistiken aus den
 * Vanilla-Dateien `world/stats/<uuid>.json`, der Kontostand aus dem
 * Numismatics-Export.
 *
 * WICHTIG zur Aktualitaet: Minecraft schreibt die Statistikdatei eines Spielers
 * erst beim Ausloggen oder beim Weltspeichern. Bei jemandem, der gerade online
 * ist, sind die Zahlen also aelter als sein Spielstand. Deshalb gibt es
 * `saveAndRefresh()`.
 */

export type PlayerProfile = {
  name: string;
  uuid: string | null;
  online: boolean;
  stats: ParsedStats | null;
  /** Kontostand in Spurs (Anzeige in Cog, siehe lib/currency.ts). */
  balanceSpurs: number | null;
};

type NumismaticsAccount = { id: string; type: string; balanceSpurs: number };
type NumismaticsExport = { stage?: string; accounts?: NumismaticsAccount[] };

/** Namen, die Crafty als online meldet – unabhaengig davon, ob sie Statistiken haben. */
async function onlineNamen(): Promise<string[]> {
  if (!craftyConfigured) return [];
  try {
    return (await craftyLiveStats()).players;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[players] Online-Liste nicht abrufbar:", error);
    return [];
  }
}

async function kontostaende(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!craftyConfigured) return map;

  try {
    const daten = await craftyReadJson<NumismaticsExport>("kubejs/data/numismatics.json");
    if (daten?.stage !== "ok" || !Array.isArray(daten.accounts)) return map;
    for (const konto of daten.accounts) {
      if (konto.type === "PLAYER") map.set(konto.id.toLowerCase(), konto.balanceSpurs);
    }
  } catch (error) {
    unstable_rethrow(error);
    console.error("[players] Kontostaende nicht lesbar:", error);
  }
  return map;
}

/**
 * Alle bekannten Spieler: alles, was eine Statistikdatei hat, plus alle, die
 * gerade online sind (auch wenn sie noch nie eine geschrieben haben – etwa beim
 * allerersten Besuch).
 */
export async function listPlayers(): Promise<PlayerProfile[]> {
  const [statsEintraege, online, konten, userCacheRoh] = await Promise.all([
    loadAllPlayerStats(),
    onlineNamen(),
    kontostaende(),
    craftyConfigured ? craftyReadJson<UserCacheEntry[]>("usercache.json") : Promise.resolve(null),
  ]);

  const uuidZuName = buildUuidToName(Array.isArray(userCacheRoh) ? userCacheRoh : []);
  const nameZuUuid = new Map<string, string>();
  for (const [uuid, name] of uuidZuName) nameZuUuid.set(name.toLowerCase(), uuid);

  const onlineKlein = new Set(online.map((n) => n.toLowerCase()));
  const profile = new Map<string, PlayerProfile>();

  for (const eintrag of statsEintraege ?? []) {
    profile.set(eintrag.name.toLowerCase(), {
      name: eintrag.name,
      uuid: eintrag.uuid,
      online: onlineKlein.has(eintrag.name.toLowerCase()),
      stats: eintrag.stats,
      balanceSpurs: konten.get(eintrag.uuid.toLowerCase()) ?? null,
    });
  }

  // Wer online ist, aber noch keine Statistikdatei hat, fehlt sonst voellig.
  for (const name of online) {
    if (profile.has(name.toLowerCase())) continue;
    const uuid = nameZuUuid.get(name.toLowerCase()) ?? null;
    profile.set(name.toLowerCase(), {
      name,
      uuid,
      online: true,
      stats: null,
      balanceSpurs: uuid ? (konten.get(uuid.toLowerCase()) ?? null) : null,
    });
  }

  // Online zuerst, danach nach Spielzeit – wer nichts hat, ans Ende.
  return [...profile.values()].sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    return (b.stats?.playtimeHours ?? -1) - (a.stats?.playtimeHours ?? -1);
  });
}

export async function findPlayer(name: string): Promise<PlayerProfile | null> {
  const gesucht = name.toLowerCase();
  return (await listPlayers()).find((p) => p.name.toLowerCase() === gesucht) ?? null;
}

// ---------------------------------------------------------------------------
// Aktualisieren
// ---------------------------------------------------------------------------

/** Kuerzester Abstand zwischen zwei echten Speichervorgaengen, serverweit. */
const GLOBALE_SPERRE_MS = 60_000;
let letztesSpeichern = 0;

export type RefreshErgebnis = { gespeichert: boolean; hinweis: string };

/**
 * Stösst `save-all` auf dem Server an und verwirft danach den Statistik-Cache,
 * damit die naechste Anzeige frische Zahlen liest.
 *
 * Die globale Sperre schuetzt den Server: Ein Speichervorgang schreibt die
 * ganze Welt auf die Platte. Liegt der letzte weniger als eine Minute zurueck,
 * wird nur neu gelesen statt erneut gespeichert – fuer den Aufrufer sieht das
 * gleich aus, nur ohne Last.
 */
export async function saveAndRefresh(): Promise<RefreshErgebnis> {
  if (!craftyConfigured) {
    return { gespeichert: false, hinweis: "Server ist nicht angebunden." };
  }

  const seitLetztem = Date.now() - letztesSpeichern;
  if (seitLetztem < GLOBALE_SPERRE_MS) {
    invalidateStatsCache();
    return { gespeichert: false, hinweis: "Die Daten waren gerade eben schon frisch – neu eingelesen." };
  }

  try {
    await craftySendCommand("save-all");
    letztesSpeichern = Date.now();
  } catch (error) {
    console.error("[players] save-all fehlgeschlagen:", error);
    return { gespeichert: false, hinweis: "Der Server hat den Speicherbefehl nicht angenommen." };
  }

  // Dem Server einen Moment geben, die Dateien tatsaechlich zu schreiben.
  await new Promise((r) => setTimeout(r, 1500));
  invalidateStatsCache();
  await loadAllPlayerStats(true);

  return { gespeichert: true, hinweis: "Server hat gespeichert, Zahlen sind aktuell." };
}

// ---------------------------------------------------------------------------
// Admin-Eingriffe
// ---------------------------------------------------------------------------

export type AuditTyp = "KICK" | "BAN" | "UNBAN" | "IP_VIEW";

export async function protokolliere(
  type: AuditTyp,
  target: string,
  detail: string,
  actor: { id: string; name: string | null } | null,
  success = true,
): Promise<void> {
  try {
    await prisma.playerAudit.create({
      data: { type, target, detail, success, actorId: actor?.id ?? null, actorName: actor?.name ?? null },
    });
  } catch (error) {
    console.error("[players] Protokolleintrag fehlgeschlagen:", error);
  }
}

export async function recentAudits(limit = 30) {
  return prisma.playerAudit.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}

/** Eingriffe an genau diesem Spieler – fuer die Spielerseite im Kontrollraum. */
export async function auditsFuer(name: string, limit = 30) {
  return prisma.playerAudit.findMany({ where: { target: name }, orderBy: { createdAt: "desc" }, take: limit });
}

/**
 * Letzte bekannte IP eines Spielers aus dem Server-Log.
 *
 * Minecraft schreibt sie beim Betreten: `Name[/1.2.3.4:56789] logged in ...`.
 * Gelesen wird nur `latest.log`, also der laufende Serverstart – aeltere
 * Anmeldungen stehen in gzip-Archiven, an die kommen wir ueber die Crafty-API
 * nicht heran. Wer seit dem letzten Neustart nicht da war, hat hier also keine.
 */
export async function findPlayerIp(name: string): Promise<string | null> {
  if (!craftyConfigured) return null;

  let zeilen: string[];
  try {
    zeilen = await craftyLogLines(true);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[players] Log nicht lesbar:", error);
    return null;
  }

  // Nur exakt dieser Spielername, damit "Max" nicht auf "MaxMuster" passt.
  const muster = new RegExp(`\\b${name.replace(/[^A-Za-z0-9_]/g, "")}\\[/([0-9a-fA-F.:]+):\\d+\\]`);
  for (let i = zeilen.length - 1; i >= 0; i -= 1) {
    const treffer = muster.exec(zeilen[i]);
    if (treffer) return treffer[1];
  }
  return null;
}
