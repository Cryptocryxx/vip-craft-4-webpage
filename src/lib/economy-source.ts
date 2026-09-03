import { unstable_rethrow } from "next/navigation";
import "server-only";
import { craftyConfigured, craftyReadJson } from "@/lib/crafty";
import { emptyEconomyOverview, type EconomyOverview, type RichPlayer } from "@/lib/economy-types";
import { buildUuidToName, type UserCacheEntry } from "@/lib/minecraft-stats";

/**
 * Liest die Bankkonten aus kubejs/data/numismatics.json (siehe
 * minecraft/kubejs/server_scripts/numismatics-export.js) über den Crafty-Dateizugriff.
 *
 * Gibt es keine Daten, kommt eine leere Übersicht zurück – keine Beispielwerte.
 * Shops stehen nicht mehr hier drin, die haben eine eigene Seite (siehe lib/shops.ts).
 */

type NumismaticsAccount = { id: string; type: string; balanceSpurs: number; label: string | null };
type NumismaticsExport = { generatedAt?: string; stage?: string; accounts?: NumismaticsAccount[] };

const CACHE_TTL_MS = 5 * 60_000;

export type EconomyResult = {
  overview: EconomyOverview;
  /** "live" = echte Bankkonten, "unavailable" = keine Daten verfügbar. */
  source: "live" | "unavailable";
};

type EconomyCache = { result: EconomyResult; fetchedAt: number };
let cache: EconomyCache | null = null;

const unavailable: EconomyResult = { overview: emptyEconomyOverview, source: "unavailable" };

/** Wirtschaftsübersicht aus den Bankkonten, mit 5-Minuten-Cache (teure Crafty-Aufrufe). */
export async function getEconomyData(): Promise<EconomyResult> {
  if (!craftyConfigured) return unavailable;
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.result;

  try {
    const [numismatics, userCache] = await Promise.all([
      craftyReadJson<NumismaticsExport>("kubejs/data/numismatics.json"),
      craftyReadJson<UserCacheEntry[]>("usercache.json"),
    ]);

    if (!numismatics || numismatics.stage !== "ok" || !Array.isArray(numismatics.accounts)) {
      cache = { result: unavailable, fetchedAt: Date.now() };
      return unavailable;
    }

    const uuidToName = buildUuidToName(Array.isArray(userCache) ? userCache : []);
    const accounts = numismatics.accounts;

    const richest: RichPlayer[] = accounts
      .filter((account) => account.type === "PLAYER" && account.balanceSpurs > 0)
      .sort((a, b) => b.balanceSpurs - a.balanceSpurs)
      .slice(0, 10)
      .map((account, index) => ({
        rank: index + 1,
        player: uuidToName.get(account.id.toLowerCase()) ?? account.id.slice(0, 8),
        balanceSpurs: account.balanceSpurs,
      }));

    const result: EconomyResult = {
      overview: {
        summary: {
          totalCirculationSpurs: accounts.reduce((sum, account) => sum + (account.balanceSpurs || 0), 0),
          accountCount: accounts.length,
        },
        richest,
      },
      source: "live",
    };

    cache = { result, fetchedAt: Date.now() };
    return result;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[economy] Bankdaten konnten nicht geladen werden:", error);
    return cache?.result ?? unavailable;
  }
}
