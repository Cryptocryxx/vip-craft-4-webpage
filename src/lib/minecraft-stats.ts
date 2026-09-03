/**
 * Auswertung der Vanilla-Statistikdateien (`world/stats/<uuid>.json`).
 * Minecraft schreibt diese für jeden Spieler ohne Zusatzmod; auch Mods tragen
 * ihre Blöcke und Items dort ein (etwa `create:andesite_alloy`).
 */

export type RawStatsFile = {
  stats?: {
    "minecraft:custom"?: Record<string, number>;
    "minecraft:mined"?: Record<string, number>;
    "minecraft:used"?: Record<string, number>;
    "minecraft:crafted"?: Record<string, number>;
    "minecraft:killed"?: Record<string, number>;
    "minecraft:killed_by"?: Record<string, number>;
    "minecraft:picked_up"?: Record<string, number>;
    "minecraft:dropped"?: Record<string, number>;
  };
  DataVersion?: number;
};

/** Aus den Rohdaten abgeleitete Werte in sinnvollen Einheiten. */
export type ParsedStats = {
  playtimeHours: number;
  deaths: number;
  mobKills: number;
  blocksMined: number;
  /** Näherung: platzierte Blöcke werden von Vanilla nicht erfasst, "benutzte" Block-Items kommen dem am nächsten. */
  blocksPlaced: number;
  ironMined: number;
  andesiteAlloyCrafted: number;
  /** Zu Fuß, sprintend und schleichend zurückgelegte Strecke. */
  walkedKm: number;
  /** Strecke in Minecarts – Create-Züge zählen hier NICHT mit. */
  minecartKm: number;
  deathsByCreeper: number;
  jumps: number;
  damageTaken: number;
};

const TICKS_PER_HOUR = 20 * 60 * 60;
const CM_PER_KM = 100_000;

function sum(record: Record<string, number> | undefined, predicate: (key: string) => boolean): number {
  if (!record) return 0;
  let total = 0;
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "number" && predicate(key)) total += value;
  }
  return total;
}

function pick(record: Record<string, number> | undefined, ...keys: string[]): number {
  if (!record) return 0;
  let total = 0;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") total += value;
  }
  return total;
}

/** Blockartige Items – grobe Näherung für "platzierte Blöcke". */
const NON_BLOCK_HINT = /(sword|pickaxe|axe|shovel|hoe|bow|arrow|helmet|chestplate|leggings|boots|bucket|food|potion|book|ingot|nugget|dust|gem)/;

export function parseStats(raw: RawStatsFile): ParsedStats {
  const custom = raw.stats?.["minecraft:custom"];
  const mined = raw.stats?.["minecraft:mined"];
  const used = raw.stats?.["minecraft:used"];
  const crafted = raw.stats?.["minecraft:crafted"];
  const killedBy = raw.stats?.["minecraft:killed_by"];
  const killed = raw.stats?.["minecraft:killed"];

  const round = (n: number, digits = 1) => Number(n.toFixed(digits));

  const walkCm = pick(
    custom,
    "minecraft:walk_one_cm",
    "minecraft:sprint_one_cm",
    "minecraft:crouch_one_cm",
    "minecraft:walk_on_water_one_cm",
    "minecraft:walk_under_water_one_cm",
  );

  return {
    // "play_time" heißt in älteren Fassungen "play_one_minute" – beide sind Ticks.
    playtimeHours: round(pick(custom, "minecraft:play_time", "minecraft:play_one_minute") / TICKS_PER_HOUR),
    deaths: pick(custom, "minecraft:deaths"),
    mobKills: sum(killed, () => true),
    blocksMined: sum(mined, () => true),
    blocksPlaced: sum(used, (key) => !NON_BLOCK_HINT.test(key)),
    ironMined: pick(mined, "minecraft:iron_ore", "minecraft:deepslate_iron_ore", "minecraft:raw_iron_block"),
    andesiteAlloyCrafted: pick(crafted, "create:andesite_alloy"),
    walkedKm: round(walkCm / CM_PER_KM),
    minecartKm: round(pick(custom, "minecraft:minecart_one_cm") / CM_PER_KM),
    deathsByCreeper: pick(killedBy, "minecraft:creeper"),
    jumps: pick(custom, "minecraft:jump"),
    damageTaken: Math.round(pick(custom, "minecraft:damage_taken") / 10), // Zehntel-Herzen → Herzen
  };
}

/** Einträge aus `usercache.json` des Servers. */
export type UserCacheEntry = { name: string; uuid: string; expiresOn?: string };

/** Baut die Zuordnung Spielername (kleingeschrieben) → UUID auf. */
export function buildNameToUuid(cache: UserCacheEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of cache) {
    if (entry?.name && entry?.uuid) map.set(entry.name.toLowerCase(), entry.uuid);
  }
  return map;
}

/** Umgekehrt: UUID → zuletzt bekannter Name. */
export function buildUuidToName(cache: UserCacheEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of cache) {
    if (entry?.name && entry?.uuid) map.set(entry.uuid.toLowerCase(), entry.name);
  }
  return map;
}
