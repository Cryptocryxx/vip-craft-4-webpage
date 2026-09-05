import "server-only";
import { getTranslations } from "next-intl/server";
import { formatDistanceKm, formatHours, formatNumber } from "@/lib/format";
import type { Leaderboard } from "@/lib/leaderboard-types";
import { loadAllPlayerStats, type PlayerStatsEntry } from "@/lib/stats-source";
import type { ParsedStats } from "@/lib/minecraft-stats";

export type LeaderboardResult = {
  boards: Leaderboard[];
  /** "live" = aus den Statistikdateien des Servers, "unavailable" = keine Daten. */
  source: "live" | "unavailable";
};

type BoardSpec = {
  id: string;
  kind: "fame" | "shame";
  icon: Leaderboard["icon"];
  value: (stats: ParsedStats) => number;
  format?: (value: number) => string;
};

/**
 * Nur Kategorien, die Vanilla tatsächlich in world/stats erfasst.
 * Titel, Beschreibung und Einheit stehen im Namespace "LeaderboardCategories"
 * (verschachtelt unter der jeweiligen `id`), damit sie auf Englisch existieren.
 */
const specs: BoardSpec[] = [
  { id: "playtime", kind: "fame", icon: "clock", value: (s) => s.playtimeHours, format: formatHours },
  { id: "iron", kind: "fame", icon: "pickaxe", value: (s) => s.ironMined },
  { id: "mined", kind: "fame", icon: "blocks", value: (s) => s.blocksMined },
  { id: "andesite", kind: "fame", icon: "cog", value: (s) => s.andesiteAlloyCrafted },
  { id: "walked", kind: "fame", icon: "train", value: (s) => s.walkedKm, format: formatDistanceKm },
  { id: "deaths", kind: "shame", icon: "skull", value: (s) => s.deaths },
  { id: "creeper", kind: "shame", icon: "bomb", value: (s) => s.deathsByCreeper },
  { id: "damage", kind: "shame", icon: "flame", value: (s) => s.damageTaken },
];

function buildBoard(spec: BoardSpec, players: PlayerStatsEntry[], t: Awaited<ReturnType<typeof getTranslations>>): Leaderboard {
  const format = spec.format ?? formatNumber;
  const entries = players
    .map((player) => ({ player: player.name, value: spec.value(player.stats) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((entry, index) => ({ rank: index + 1, player: entry.player, value: entry.value, display: format(entry.value) }));

  return {
    id: spec.id,
    title: t(`${spec.id}.title`),
    description: t(`${spec.id}.description`),
    unit: t(`${spec.id}.unit`),
    kind: spec.kind,
    icon: spec.icon,
    entries,
  };
}

/** Leaderboards aus echten Serverdaten. Ohne Daten bleibt die Liste leer. */
export async function getLeaderboardData(kind?: "fame" | "shame"): Promise<LeaderboardResult> {
  const [players, t] = await Promise.all([loadAllPlayerStats(), getTranslations("LeaderboardCategories")]);

  if (!players || players.length === 0) {
    return { boards: [], source: "unavailable" };
  }

  const boards = specs
    .filter((spec) => (kind ? spec.kind === kind : true))
    .map((spec) => buildBoard(spec, players, t))
    // Kategorien ohne einen einzigen Wert gar nicht erst anzeigen.
    .filter((board) => board.entries.length > 0);

  if (boards.length === 0) {
    return { boards: [], source: "unavailable" };
  }

  return { boards, source: "live" };
}
