/**
 * Mock-Daten für Hall of Fame / Hall of Shame.
 * TODO: Später aus den Vanilla-Statistikdateien (world/stats/<uuid>.json) aufbauen.
 * Hinweis: Plan (Player Analytics) unterstützt NeoForge nicht.
 */
import { formatDistanceKm, formatHours, formatNumber } from "@/lib/format";

export type LeaderboardIcon = "clock" | "pickaxe" | "blocks" | "train" | "cog" | "flame" | "bomb" | "skull" | "arrow-down";

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

type RawEntries = Array<[player: string, value: number]>;

function board(
  meta: Omit<Leaderboard, "entries">,
  raw: RawEntries,
  format: (value: number) => string = formatNumber,
): Leaderboard {
  const entries = [...raw]
    .sort((a, b) => b[1] - a[1])
    .map(([player, value], index) => ({ rank: index + 1, player, value, display: format(value) }));
  return { ...meta, entries };
}

const leaderboards: Leaderboard[] = [
  board(
    { id: "playtime", title: "Meiste Spielzeit", description: "Wer wohnt eigentlich auf dem Server?", unit: "Stunden", kind: "fame", icon: "clock" },
    [
      ["Lorenz", 312.5], ["Jonas_MC", 288.2], ["Mia_builds", 251.9], ["TechnoTim", 240.4], ["Kaya", 198.7],
      ["Felix_F", 176.3], ["Nadja", 154.0], ["RedstoneRolf", 149.8], ["Lena", 121.6], ["Basti", 98.2],
    ],
    formatHours,
  ),
  board(
    { id: "iron", title: "Meistes Eisen abgebaut", description: "Rohstoff Nummer eins für jede Create-Fabrik.", unit: "Eisenerz", kind: "fame", icon: "pickaxe" },
    [
      ["RedstoneRolf", 48211], ["Jonas_MC", 44870], ["Lorenz", 39104], ["Basti", 31255], ["Kaya", 28930],
      ["Mia_builds", 22417], ["TechnoTim", 21008], ["Felix_F", 17342], ["Lena", 15120], ["Nadja", 12988],
    ],
  ),
  board(
    { id: "blocks", title: "Meiste Blöcke platziert", description: "Baumeister:innen der Season.", unit: "Blöcke", kind: "fame", icon: "blocks" },
    [
      ["Mia_builds", 402118], ["Nadja", 355903], ["Lorenz", 298441], ["Lena", 240377], ["Felix_F", 201655],
      ["Jonas_MC", 188120], ["Kaya", 172004], ["TechnoTim", 143998], ["Basti", 120450], ["RedstoneRolf", 98770],
    ],
  ),
  board(
    { id: "train", title: "Weiteste Zugstrecke gefahren", description: "Kilometer im Create-Zugnetz.", unit: "km", kind: "fame", icon: "train" },
    [
      ["Jonas_MC", 812.4], ["Felix_F", 655.1], ["Lorenz", 540.9], ["Kaya", 421.3], ["Lena", 388.0],
      ["TechnoTim", 301.7], ["Mia_builds", 255.2], ["Basti", 190.6], ["Nadja", 142.9], ["RedstoneRolf", 77.5],
    ],
    formatDistanceKm,
  ),
  board(
    { id: "andesite", title: "Meiste Andesit-Legierung hergestellt", description: "Das Rückgrat jeder Create-Maschine.", unit: "Stück", kind: "fame", icon: "cog" },
    [
      ["TechnoTim", 61230], ["Lorenz", 58004], ["RedstoneRolf", 49871], ["Jonas_MC", 40112], ["Kaya", 33590],
      ["Basti", 27780], ["Felix_F", 20015], ["Mia_builds", 18440], ["Lena", 12009], ["Nadja", 9875],
    ],
  ),
  board(
    { id: "lava", title: "Meiste Tode durch Lava", description: "Der Nether vergisst nichts.", unit: "Tode", kind: "shame", icon: "flame" },
    [
      ["Basti", 47], ["TechnoTim", 39], ["Lena", 31], ["Jonas_MC", 24], ["Kaya", 19],
      ["Nadja", 15], ["Lorenz", 12], ["Felix_F", 9], ["Mia_builds", 6], ["RedstoneRolf", 4],
    ],
  ),
  board(
    { id: "creeper", title: "Meiste Tode durch Creeper", description: "Ssssss… und die Fabrik ist weg.", unit: "Tode", kind: "shame", icon: "bomb" },
    [
      ["Jonas_MC", 33], ["Nadja", 28], ["Basti", 26], ["Lorenz", 21], ["Lena", 18],
      ["Kaya", 14], ["Mia_builds", 11], ["TechnoTim", 10], ["Felix_F", 7], ["RedstoneRolf", 5],
    ],
  ),
  board(
    { id: "crushed", title: "Von eigener Maschine zerquetscht", description: "Crushing Wheels sind keine Rolltreppe.", unit: "Tode", kind: "shame", icon: "skull" },
    [
      ["TechnoTim", 22], ["RedstoneRolf", 19], ["Lorenz", 14], ["Kaya", 12], ["Basti", 11],
      ["Jonas_MC", 8], ["Felix_F", 6], ["Lena", 5], ["Mia_builds", 3], ["Nadja", 2],
    ],
  ),
  board(
    { id: "train-deaths", title: "Vom eigenen Zug überfahren", description: "Rechts vor links gilt nicht auf Schienen.", unit: "Tode", kind: "shame", icon: "train" },
    [
      ["Felix_F", 17], ["Jonas_MC", 15], ["Lena", 9], ["Lorenz", 8], ["Kaya", 7],
      ["Basti", 6], ["Nadja", 4], ["TechnoTim", 3], ["Mia_builds", 2], ["RedstoneRolf", 1],
    ],
  ),
  board(
    { id: "falls", title: "Meiste Sturztode", description: "Elytra-Landungen sind optional.", unit: "Tode", kind: "shame", icon: "arrow-down" },
    [
      ["Lena", 41], ["Nadja", 36], ["Basti", 30], ["Mia_builds", 27], ["Kaya", 22],
      ["Jonas_MC", 20], ["Lorenz", 16], ["Felix_F", 12], ["TechnoTim", 9], ["RedstoneRolf", 6],
    ],
  ),
];

export function getLeaderboards(kind?: "fame" | "shame"): Leaderboard[] {
  return kind ? leaderboards.filter((b) => b.kind === kind) : leaderboards;
}
