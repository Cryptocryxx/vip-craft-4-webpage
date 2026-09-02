/**
 * Mock-Daten für die Wirtschaftsübersicht (Create: Numismatics als Währung).
 * TODO: Später an das Plan-Plugin bzw. die Numismatics-Bank-API anbinden.
 */

export const currency = {
  name: "Spur",
  plural: "Spurs",
  // Numismatics-Münzen: 1 Spur, 8 Bevel, 16 Sprocket, 64 Cog, 512 Crown, 4096 Sun
  coins: [
    { name: "Spur", value: 1 },
    { name: "Bevel", value: 8 },
    { name: "Sprocket", value: 16 },
    { name: "Cog", value: 64 },
    { name: "Crown", value: 512 },
    { name: "Sun", value: 4096 },
  ],
} as const;

export type RichPlayer = {
  rank: number;
  player: string;
  balance: number;
  change24h: number;
};

export type Shop = {
  id: string;
  name: string;
  owner: string;
  location: { x: number; z: number; dimension: "overworld" | "nether" };
  sells: string[];
  open: boolean;
  sales7d: number;
};

export type EconomyOverview = {
  currency: typeof currency;
  summary: { totalCirculation: number; transactions24h: number; activeShops: number };
  richest: RichPlayer[];
  shops: Shop[];
};

const richestRaw: Array<[player: string, balance: number, change24h: number]> = [
  ["Jonas_MC", 184320, 4210],
  ["Lorenz", 156900, -1280],
  ["Mia_builds", 132455, 2890],
  ["TechnoTim", 98770, 610],
  ["Kaya", 87210, 3350],
  ["RedstoneRolf", 64005, -420],
  ["Felix_F", 51880, 1120],
  ["Nadja", 44310, 0],
];

const shops: Shop[] = [
  { id: "bahnhofskiosk", name: "Bahnhofskiosk", owner: "Jonas_MC", location: { x: 128, z: -64, dimension: "overworld" }, sells: ["Zug-Tickets", "Kohle", "Kekse"], open: true, sales7d: 212 },
  { id: "messing-und-mehr", name: "Messing & Mehr", owner: "TechnoTim", location: { x: -210, z: 340, dimension: "overworld" }, sells: ["Messingbarren", "Zahnräder", "Präzisionsmechanismen"], open: true, sales7d: 148 },
  { id: "mias-baumarkt", name: "Mias Baumarkt", owner: "Mia_builds", location: { x: 45, z: 12, dimension: "overworld" }, sells: ["Kupferblöcke", "Fensterrahmen", "Schienen"], open: true, sales7d: 301 },
  { id: "nether-express", name: "Nether-Express", owner: "Kaya", location: { x: 16, z: -8, dimension: "nether" }, sells: ["Blaze-Kuchen", "Quarz", "Netherite-Schrott"], open: false, sales7d: 37 },
  { id: "rolfs-erzhandel", name: "Rolfs Erzhandel", owner: "RedstoneRolf", location: { x: -88, z: -410, dimension: "overworld" }, sells: ["Eisenerz", "Zinkerz", "Andesit"], open: true, sales7d: 96 },
  { id: "elytra-werkstatt", name: "Elytra-Werkstatt", owner: "Lena", location: { x: 512, z: 220, dimension: "overworld" }, sells: ["Elytra-Reparatur", "Raketen", "Phantomhaut"], open: true, sales7d: 59 },
];

export function getEconomyOverview(): EconomyOverview {
  const richest = richestRaw
    .sort((a, b) => b[1] - a[1])
    .map(([player, balance, change24h], index) => ({ rank: index + 1, player, balance, change24h }));

  return {
    currency,
    summary: {
      totalCirculation: 1284320,
      transactions24h: 412,
      activeShops: shops.filter((s) => s.open).length,
    },
    richest,
    shops,
  };
}
