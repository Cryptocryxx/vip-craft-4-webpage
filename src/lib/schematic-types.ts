/**
 * Typen der Schematic-Galerie.
 *
 * Einen echten Datei-Upload gibt es noch nicht (dafür braucht es ein
 * Prisma-Modell plus Speicherort für die .nbt-Dateien). Bis dahin ist die
 * Galerie leer, statt erfundene Blaupausen zum Download anzubieten.
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

const schematics: Schematic[] = [];

export function getSchematics(filter?: { q?: string; tag?: string }): Schematic[] {
  const query = filter?.q?.trim().toLowerCase();
  const tag = filter?.tag?.trim().toLowerCase();

  return schematics.filter((item) => {
    if (tag && !item.tags.some((t) => t.toLowerCase() === tag)) return false;
    if (!query) return true;
    return (
      item.title.toLowerCase().includes(query) ||
      item.author.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.tags.some((t) => t.toLowerCase().includes(query))
    );
  });
}

export function getSchematicById(id: string): Schematic | undefined {
  return schematics.find((item) => item.id === id);
}

export function getAllTags(): string[] {
  return [...new Set(schematics.flatMap((item) => item.tags))].sort();
}
