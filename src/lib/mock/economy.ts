/**
 * Mock-Daten für die Wirtschaftsübersicht (Create: Numismatics als Währung).
 * Fallback, solange Crafty nicht konfiguriert ist oder kubejs/data/numismatics.json fehlt –
 * siehe @/lib/economy-source für die echten Daten.
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
};

export type Shop = {
  id: string;
  name: string;
  owner: string;
  location: { x: number; z: number; dimension: "overworld" | "nether" | "end" };
  sells: string[];
  open: boolean;
};

export type EconomyOverview = {
  currency: typeof currency;
  summary: { totalCirculation: number; accountCount: number; activeShops: number };
  richest: RichPlayer[];
  shops: Shop[];
};

const richestRaw: Array<[player: string, balance: number]> = [
  ["Jonas_MC", 184320],
  ["Lorenz", 156900],
  ["Mia_builds", 132455],
  ["TechnoTim", 98770],
  ["Kaya", 87210],
  ["RedstoneRolf", 64005],
  ["Felix_F", 51880],
  ["Nadja", 44310],
];

const shops: Shop[] = [
  { id: "bahnhofskiosk", name: "Bahnhofskiosk", owner: "Jonas_MC", location: { x: 128, z: -64, dimension: "overworld" }, sells: ["Zug-Tickets", "Kohle", "Kekse"], open: true },
  { id: "messing-und-mehr", name: "Messing & Mehr", owner: "TechnoTim", location: { x: -210, z: 340, dimension: "overworld" }, sells: ["Messingbarren", "Zahnräder", "Präzisionsmechanismen"], open: true },
  { id: "mias-baumarkt", name: "Mias Baumarkt", owner: "Mia_builds", location: { x: 45, z: 12, dimension: "overworld" }, sells: ["Kupferblöcke", "Fensterrahmen", "Schienen"], open: true },
  { id: "nether-express", name: "Nether-Express", owner: "Kaya", location: { x: 16, z: -8, dimension: "nether" }, sells: ["Blaze-Kuchen", "Quarz", "Netherite-Schrott"], open: false },
  { id: "rolfs-erzhandel", name: "Rolfs Erzhandel", owner: "RedstoneRolf", location: { x: -88, z: -410, dimension: "overworld" }, sells: ["Eisenerz", "Zinkerz", "Andesit"], open: true },
  { id: "elytra-werkstatt", name: "Elytra-Werkstatt", owner: "Lena", location: { x: 512, z: 220, dimension: "overworld" }, sells: ["Elytra-Reparatur", "Raketen", "Phantomhaut"], open: true },
];

export function getEconomyOverview(): EconomyOverview {
  const richest = richestRaw
    .sort((a, b) => b[1] - a[1])
    .map(([player, balance], index) => ({ rank: index + 1, player, balance }));

  return {
    currency,
    summary: {
      totalCirculation: 1284320,
      accountCount: richest.length,
      activeShops: shops.filter((s) => s.open).length,
    },
    richest,
    shops,
  };
}
