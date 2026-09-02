/**
 * Mock-Datenbank für die Schematic-Galerie.
 * TODO: Später durch Prisma-Modell + Datei-Upload (S3/Volume) ersetzen.
 */
export type Schematic = {
  id: string;
  title: string;
  author: string;
  description: string;
  tags: string[];
  size: { x: number; y: number; z: number };
  downloads: number;
  likes: number;
  createdAt: string;
  fileName: string;
  /** Optionaler Screenshot – ohne Bild wird eine generierte Blaupausen-Vorschau angezeigt. */
  image: string | null;
};

const schematics: Schematic[] = [
  {
    id: "andesite-alloy-farm-v3",
    title: "Kompakte Andesit-Alloy-Farm",
    author: "Lorenz",
    description:
      "Vollautomatische Andesit-Legierung aus Cobblestone-Generator, Crushing Wheels und Mixer. Läuft mit 256 SU und passt in einen 9×7×12 Raum.",
    tags: ["farm", "andesit", "kompakt"],
    size: { x: 9, y: 7, z: 12 },
    downloads: 142,
    likes: 38,
    createdAt: "2026-08-20T18:30:00+02:00",
    fileName: "andesite_alloy_farm_v3.nbt",
    image: null,
  },
  {
    id: "signalbahnhof-modular",
    title: "Modularer Bahnhof mit Signalen",
    author: "Jonas_MC",
    description:
      "Zweigleisiger Bahnhof mit Vorsignalen, Anzeigetafel und automatischer Türsteuerung. Erweiterbar um weitere Bahnsteige.",
    tags: ["zug", "bahnhof", "redstone"],
    size: { x: 31, y: 12, z: 18 },
    downloads: 97,
    likes: 41,
    createdAt: "2026-08-23T21:10:00+02:00",
    fileName: "modularer_bahnhof_signale.nbt",
    image: null,
  },
  {
    id: "cobble-gen-2000",
    title: "Cobblestone-Generator 2000/h",
    author: "Mia_builds",
    description:
      "Acht Bohrer an einem Getriebe, Förderbänder direkt in eine Kiste. Braucht nur 64 SU – ideal für den Einstieg.",
    tags: ["farm", "einsteiger", "kompakt"],
    size: { x: 5, y: 4, z: 7 },
    downloads: 264,
    likes: 73,
    createdAt: "2026-08-18T16:00:00+02:00",
    fileName: "cobblegen_2000.nbt",
    image: null,
  },
  {
    id: "windmuehle-boost",
    title: "Windmühle mit 128 SU Boost",
    author: "TechnoTim",
    description:
      "Große Windmühle mit Wolle-Segeln und Getriebeübersetzung. Liefert stabile 16 RPM bei maximalem Drehmoment.",
    tags: ["energie", "windmühle"],
    size: { x: 17, y: 21, z: 17 },
    downloads: 58,
    likes: 19,
    createdAt: "2026-08-26T12:45:00+02:00",
    fileName: "windmuehle_128su.nbt",
    image: null,
  },
  {
    id: "sequenced-assembly-precision",
    title: "Sequenced Assembly: Präzisionsmechanismus",
    author: "Kaya",
    description:
      "Fließband mit Deployer-Kette für Präzisionsmechanismen. Inklusive Rückführung fehlgeschlagener Zwischenschritte.",
    tags: ["assembly", "automation", "messing"],
    size: { x: 14, y: 5, z: 6 },
    downloads: 121,
    likes: 55,
    createdAt: "2026-08-28T19:20:00+02:00",
    fileName: "sequenced_assembly_precision.nbt",
    image: null,
  },
  {
    id: "eisenfarm-crushing",
    title: "Eisenfarm (Sequenced Crushing)",
    author: "RedstoneRolf",
    description:
      "Erz-Verarbeitung mit Crushing Wheels, Waschen und Schmelzen – verdoppelt den Ertrag pro Roheisen.",
    tags: ["farm", "erz", "automation"],
    size: { x: 11, y: 8, z: 15 },
    downloads: 88,
    likes: 27,
    createdAt: "2026-08-30T09:05:00+02:00",
    fileName: "eisenfarm_crushing.nbt",
    image: null,
  },
  {
    id: "frachtwaggon-modular",
    title: "Modularer Fracht-Waggon",
    author: "Felix_F",
    description:
      "Standard-Waggon für unser Streckennetz mit Fässern, Portable Storage Interface und Kupplungen an beiden Enden.",
    tags: ["zug", "waggon", "logistik"],
    size: { x: 9, y: 5, z: 3 },
    downloads: 73,
    likes: 22,
    createdAt: "2026-08-31T20:00:00+02:00",
    fileName: "frachtwaggon_modular.nbt",
    image: null,
  },
  {
    id: "kartoffelkanonen-turm",
    title: "Kartoffelkanonen-Turm (PvE)",
    author: "Nadja",
    description:
      "Verteidigungsturm mit vier automatisch nachladenden Kartoffelkanonen – Hauptattraktion beim Wither-Event.",
    tags: ["pve", "verteidigung", "spaß"],
    size: { x: 7, y: 14, z: 7 },
    downloads: 45,
    likes: 31,
    createdAt: "2026-09-01T17:30:00+02:00",
    fileName: "kartoffelkanonen_turm.nbt",
    image: null,
  },
];

export function getSchematics(filter?: { q?: string; tag?: string }): Schematic[] {
  const q = filter?.q?.trim().toLowerCase();
  const tag = filter?.tag?.trim().toLowerCase();

  return schematics
    .filter((s) => (tag ? s.tags.includes(tag) : true))
    .filter((s) =>
      q
        ? s.title.toLowerCase().includes(q) ||
          s.author.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.includes(q))
        : true,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getSchematicById(id: string): Schematic | undefined {
  return schematics.find((s) => s.id === id);
}

export function getAllTags(): string[] {
  return [...new Set(schematics.flatMap((s) => s.tags))].sort();
}
