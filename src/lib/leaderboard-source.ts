import "server-only";
import { formatDistanceKm, formatHours, formatNumber } from "@/lib/format";
import { getLeaderboards as getMockLeaderboards, type Leaderboard } from "@/lib/mock/leaderboards";
import { loadAllPlayerStats, type PlayerStatsEntry } from "@/lib/stats-source";
import type { ParsedStats } from "@/lib/minecraft-stats";

export type LeaderboardResult = {
  boards: Leaderboard[];
  /** "live" = aus den Statistikdateien des Servers, "mock" = Beispieldaten. */
  source: "live" | "mock";
};

type BoardSpec = {
  id: string;
  title: string;
  description: string;
  unit: string;
  kind: "fame" | "shame";
  icon: Leaderboard["icon"];
  value: (stats: ParsedStats) => number;
  format?: (value: number) => string;
};

/**
 * Nur Kategorien, die Vanilla tatsächlich erfasst. Die Mock-Daten kennen
 * zusätzlich Lava-Tode und Create-Zugkilometer – dafür gibt es in den
 * Statistikdateien keine Entsprechung.
 */
const specs: BoardSpec[] = [
  {
    id: "playtime",
    title: "Meiste Spielzeit",
    description: "Wer wohnt eigentlich auf dem Server?",
    unit: "Stunden",
    kind: "fame",
    icon: "clock",
    value: (s) => s.playtimeHours,
    format: formatHours,
  },
  {
    id: "iron",
    title: "Meistes Eisen abgebaut",
    description: "Rohstoff Nummer eins für jede Create-Fabrik.",
    unit: "Eisenerz",
    kind: "fame",
    icon: "pickaxe",
    value: (s) => s.ironMined,
  },
  {
    id: "mined",
    title: "Meiste Blöcke abgebaut",
    description: "Wer sich am tiefsten gegraben hat.",
    unit: "Blöcke",
    kind: "fame",
    icon: "blocks",
    value: (s) => s.blocksMined,
  },
  {
    id: "andesite",
    title: "Meiste Andesit-Legierung hergestellt",
    description: "Das Rückgrat jeder Create-Maschine.",
    unit: "Stück",
    kind: "fame",
    icon: "cog",
    value: (s) => s.andesiteAlloyCrafted,
  },
  {
    id: "walked",
    title: "Weiteste Strecke zu Fuß",
    description: "Laufen, sprinten, schleichen – alles zusammen.",
    unit: "km",
    kind: "fame",
    icon: "train",
    value: (s) => s.walkedKm,
    format: formatDistanceKm,
  },
  {
    id: "deaths",
    title: "Meiste Tode",
    description: "Aller Anfang ist tödlich.",
    unit: "Tode",
    kind: "shame",
    icon: "skull",
    value: (s) => s.deaths,
  },
  {
    id: "creeper",
    title: "Meiste Tode durch Creeper",
    description: "Ssssss… und die Fabrik ist weg.",
    unit: "Tode",
    kind: "shame",
    icon: "bomb",
    value: (s) => s.deathsByCreeper,
  },
  {
    id: "damage",
    title: "Meister Schaden eingesteckt",
    description: "Gemessen in Herzen. Autsch.",
    unit: "Herzen",
    kind: "shame",
    icon: "flame",
    value: (s) => s.damageTaken,
  },
];

function buildBoard(spec: BoardSpec, players: PlayerStatsEntry[]): Leaderboard {
  const format = spec.format ?? formatNumber;
  const entries = players
    .map((player) => ({ player: player.name, value: spec.value(player.stats) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((entry, index) => ({ rank: index + 1, player: entry.player, value: entry.value, display: format(entry.value) }));

  return {
    id: spec.id,
    title: spec.title,
    description: spec.description,
    unit: spec.unit,
    kind: spec.kind,
    icon: spec.icon,
    entries,
  };
}

/** Leaderboards aus echten Serverdaten, mit Rückfall auf die Beispieldaten. */
export async function getLeaderboardData(kind?: "fame" | "shame"): Promise<LeaderboardResult> {
  const players = await loadAllPlayerStats();

  if (!players || players.length === 0) {
    return { boards: getMockLeaderboards(kind), source: "mock" };
  }

  const boards = specs
    .filter((spec) => (kind ? spec.kind === kind : true))
    .map((spec) => buildBoard(spec, players))
    // Kategorien ohne einen einzigen Wert gar nicht erst anzeigen.
    .filter((board) => board.entries.length > 0);

  if (boards.length === 0) {
    return { boards: getMockLeaderboards(kind), source: "mock" };
  }

  return { boards, source: "live" };
}
