import { unstable_rethrow } from "next/navigation";
import "server-only";
import { craftyConfigured, craftyListDirectory, craftyReadJson } from "@/lib/crafty";
import {
  buildUuidToName,
  parseStats,
  type ParsedStats,
  type RawStatsFile,
  type UserCacheEntry,
} from "@/lib/minecraft-stats";

/**
 * Liest die Vanilla-Statistiken aller Spieler über den Crafty-Dateizugriff.
 * Ohne Crafty-Konfiguration liefert das Modul null, die Aufrufer greifen dann
 * auf die Mock-Daten zurück.
 */

/** Pfad zum Weltordner relativ zum Serververzeichnis (bei Bedarf per .env anpassbar). */
const WORLD_DIR = process.env.CRAFTY_WORLD_DIR ?? "world";
const CACHE_TTL_MS = 5 * 60_000;

export type PlayerStatsEntry = { name: string; uuid: string; stats: ParsedStats };

type Cache = { entries: PlayerStatsEntry[]; fetchedAt: number };
let cache: Cache | null = null;
let lastError: string | null = null;

export function getStatsSourceError(): string | null {
  return lastError;
}

/** Alle Spieler mit Statistikdatei. Null, wenn keine Verbindung möglich ist. */
export async function loadAllPlayerStats(force = false): Promise<PlayerStatsEntry[] | null> {
  if (!craftyConfigured) return null;
  if (!force && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.entries;

  try {
    const userCache = (await craftyReadJson<UserCacheEntry[]>("usercache.json")) ?? [];
    const uuidToName = buildUuidToName(Array.isArray(userCache) ? userCache : []);

    const files = await craftyListDirectory(`${WORLD_DIR}/stats`);
    const statFiles = files
      .map((entry) => entry.name)
      .filter((name): name is string => typeof name === "string" && name.endsWith(".json"));

    const entries: PlayerStatsEntry[] = [];
    for (const fileName of statFiles) {
      const uuid = fileName.replace(/\.json$/i, "");
      const raw = await craftyReadJson<RawStatsFile>(`${WORLD_DIR}/stats/${fileName}`);
      if (!raw?.stats) continue;

      entries.push({
        uuid,
        name: uuidToName.get(uuid.toLowerCase()) ?? uuid.slice(0, 8),
        stats: parseStats(raw),
      });
    }

    lastError = null;
    cache = { entries, fetchedAt: Date.now() };
    return entries;
  } catch (error) {
    unstable_rethrow(error);
    lastError = error instanceof Error ? error.message : String(error);
    console.error("[stats] Statistiken konnten nicht geladen werden:", lastError);
    // Abgelaufene Daten sind besser als gar keine.
    return cache?.entries ?? null;
  }
}

/** Statistiken eines einzelnen Spielers anhand seines Namens. */
export async function loadPlayerStats(minecraftName: string): Promise<PlayerStatsEntry | null> {
  const all = await loadAllPlayerStats();
  if (!all) return null;

  const wanted = minecraftName.toLowerCase();
  return all.find((entry) => entry.name.toLowerCase() === wanted) ?? null;
}

/** Verwirft den Zwischenspeicher, etwa nach einer Änderung im Kontrollraum. */
export function invalidateStatsCache(): void {
  cache = null;
}
