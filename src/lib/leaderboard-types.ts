/**
 * Typen der Ranglisten. Die Einträge baut leaderboard-source.ts aus den
 * Vanilla-Statistikdateien des Servers – hier stehen nur die Formen.
 */

export type LeaderboardIcon =
  | "clock"
  | "pickaxe"
  | "blocks"
  | "train"
  | "cog"
  | "flame"
  | "bomb"
  | "skull"
  | "arrow-down";

export type LeaderboardEntry = {
  rank: number;
  player: string;
  value: number;
  display: string;
};

export type Leaderboard = {
  id: string;
  title: string;
  description: string;
  unit: string;
  kind: "fame" | "shame";
  icon: LeaderboardIcon;
  entries: LeaderboardEntry[];
};
