import { unstable_rethrow } from "next/navigation";
import "server-only";
import { craftyConfigured, craftyReadJson } from "@/lib/crafty";
import { buildUuidToName, type UserCacheEntry } from "@/lib/minecraft-stats";
import { currency, getEconomyOverview as getMockEconomyOverview, type EconomyOverview, type RichPlayer, type Shop } from "@/lib/mock/economy";
import { listShops } from "@/lib/shops";

/**
 * Liest die Bankkonten aus kubejs/data/numismatics.json (siehe
 * minecraft/kubejs/server_scripts/numismatics-export.js) über den Crafty-Dateizugriff.
 * Shops kennt Numismatics nicht (keine globale Registry, siehe Rückfragen im Chat) –
 * die kommen stattdessen aus der eigenen Datenbank (Spieler tragen sie selbst ein,
 * siehe @/lib/shops), unabhängig von Crafty und ohne Cache-Verzögerung.
 */

type NumismaticsAccount = { id: string; type: string; balanceSpurs: number; label: string | null };
type NumismaticsExport = { generatedAt?: string; stage?: string; accounts?: NumismaticsAccount[] };

const CACHE_TTL_MS = 5 * 60_000;

export type EconomyResult = { overview: EconomyOverview; source: "live" | "mock"; shopsSource: "live" | "mock" };

type BankData = { richest: RichPlayer[]; totalCirculation: number; accountCount: number; source: "live" | "mock" };

type BankCache = { data: BankData; fetchedAt: number };
let bankCache: BankCache | null = null;

function mockBankData(): BankData {
  const mock = getMockEconomyOverview();
  return {
    richest: mock.richest,
    totalCirculation: mock.summary.totalCirculation,
    accountCount: mock.summary.accountCount,
    source: "mock",
  };
}

/** Reichste Spieler & Umlauf aus den Bankkonten, mit 5-Minuten-Cache (teure Crafty-Aufrufe). */
async function loadBankData(): Promise<BankData> {
  if (!craftyConfigured) return mockBankData();
  if (bankCache && Date.now() - bankCache.fetchedAt < CACHE_TTL_MS) return bankCache.data;

  try {
    const [numismatics, userCache] = await Promise.all([
      craftyReadJson<NumismaticsExport>("kubejs/data/numismatics.json"),
      craftyReadJson<UserCacheEntry[]>("usercache.json"),
    ]);

    if (!numismatics || numismatics.stage !== "ok" || !Array.isArray(numismatics.accounts)) {
      const data = mockBankData();
      bankCache = { data, fetchedAt: Date.now() };
      return data;
    }

    const uuidToName = buildUuidToName(Array.isArray(userCache) ? userCache : []);
    const accounts = numismatics.accounts;
    const totalCirculation = accounts.reduce((sum, account) => sum + (account.balanceSpurs || 0), 0);

    const richest: RichPlayer[] = accounts
      .filter((account) => account.type === "PLAYER" && account.balanceSpurs > 0)
      .sort((a, b) => b.balanceSpurs - a.balanceSpurs)
      .slice(0, 10)
      .map((account, index) => ({
        rank: index + 1,
        player: uuidToName.get(account.id.toLowerCase()) ?? account.id.slice(0, 8),
        balance: account.balanceSpurs,
      }));

    const data: BankData =
      richest.length === 0
        ? mockBankData()
        : { richest, totalCirculation, accountCount: accounts.length, source: "live" };

    bankCache = { data, fetchedAt: Date.now() };
    return data;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[economy] Bankdaten konnten nicht geladen werden:", error);
    return bankCache?.data ?? mockBankData();
  }
}

type ShopsData = { shops: Shop[]; activeShops: number; shopsSource: "live" | "mock" };

/** Shops aus der eigenen Datenbank – immer frisch, kein Cache. */
async function loadShopsData(): Promise<ShopsData> {
  const dbShops = await listShops();

  if (dbShops.length === 0) {
    const mockShops = getMockEconomyOverview().shops;
    return { shops: mockShops, activeShops: mockShops.filter((s) => s.open).length, shopsSource: "mock" };
  }

  const shops: Shop[] = dbShops.map((s) => ({
    id: s.id,
    name: s.name,
    owner: s.owner.minecraftName ?? s.owner.name ?? "Unbekannt",
    location: { x: s.locationX, z: s.locationZ, dimension: s.dimension },
    sells: s.sells,
    open: s.open,
  }));

  return { shops, activeShops: shops.filter((s) => s.open).length, shopsSource: "live" };
}

/** Wirtschaftsübersicht: Bankkonten (Crafty, gecacht) + Shops (eigene DB, live). */
export async function getEconomyData(): Promise<EconomyResult> {
  const [bank, shopsData] = await Promise.all([loadBankData(), loadShopsData()]);

  const overview: EconomyOverview = {
    currency,
    summary: {
      totalCirculation: bank.totalCirculation,
      accountCount: bank.accountCount,
      activeShops: shopsData.activeShops,
    },
    richest: bank.richest,
    shops: shopsData.shops,
  };

  return { overview, source: bank.source, shopsSource: shopsData.shopsSource };
}
