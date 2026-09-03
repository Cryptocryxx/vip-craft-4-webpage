/**
 * Typen, Konstanten und Validierung für Spieler-Shops.
 * Bewusst ohne Datenbank-Import, damit Client-Komponenten sie nutzen können.
 *
 * Shops gehen ohne Admin-Freigabe sofort live – Admins können Einträge im
 * Kontrollraum jederzeit entfernen (Moderation nach der Veröffentlichung).
 */

export const DIMENSIONS = ["overworld", "nether", "end"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const dimensionLabels: Record<Dimension, string> = {
  overworld: "Overworld",
  nether: "Nether",
  end: "End",
};

export function toDimension(value: string): Dimension {
  return (DIMENSIONS as readonly string[]).includes(value) ? (value as Dimension) : "overworld";
}

export type ShopOwnerSummary = { id: string; name: string | null; image: string | null; minecraftName: string | null };

export type ShopDTO = {
  id: string;
  name: string;
  description: string | null;
  sells: string[];
  locationX: number;
  locationZ: number;
  dimension: Dimension;
  open: boolean;
  createdAt: string;
  updatedAt: string;
  owner: ShopOwnerSummary;
};

export type ShopInput = {
  name: string;
  description: string | null;
  sells: string[];
  locationX: number;
  locationZ: number;
  dimension: Dimension;
  open: boolean;
};

const COORD_LIMIT = 30_000_000; // Minecrafts Weltgrenze liegt bei ±29.999.984

function parseCoordinate(raw: unknown): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (Math.abs(rounded) > COORD_LIMIT) return null;
  return rounded;
}

export function validateShopInput(raw: {
  name?: unknown;
  description?: unknown;
  sells?: unknown;
  locationX?: unknown;
  locationZ?: unknown;
  dimension?: unknown;
  open?: unknown;
}): { ok: true; data: ShopInput } | { ok: false; error: string } {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const descriptionRaw = typeof raw.description === "string" ? raw.description.trim() : "";
  const sellsRaw = typeof raw.sells === "string" ? raw.sells : "";
  const dimension = typeof raw.dimension === "string" ? raw.dimension : "";

  if (name.length < 2 || name.length > 40) {
    return { ok: false, error: "Der Shop-Name muss 2–40 Zeichen lang sein." };
  }
  if (descriptionRaw.length > 300) {
    return { ok: false, error: "Die Beschreibung darf höchstens 300 Zeichen haben." };
  }

  const sells = sellsRaw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (sells.length === 0) {
    return { ok: false, error: "Trag mindestens einen Artikel ein (mit Komma getrennt)." };
  }
  if (sells.length > 10) {
    return { ok: false, error: "Höchstens 10 Artikel." };
  }
  if (sells.some((item) => item.length > 30)) {
    return { ok: false, error: "Ein Artikelname darf höchstens 30 Zeichen haben." };
  }

  if (!(DIMENSIONS as readonly string[]).includes(dimension)) {
    return { ok: false, error: "Ungültige Dimension." };
  }

  const locationX = parseCoordinate(raw.locationX);
  const locationZ = parseCoordinate(raw.locationZ);
  if (locationX === null || locationZ === null) {
    return { ok: false, error: "X- und Z-Koordinate müssen gültige Zahlen sein." };
  }

  return {
    ok: true,
    data: {
      name,
      description: descriptionRaw.length > 0 ? descriptionRaw : null,
      sells,
      locationX,
      locationZ,
      dimension: dimension as Dimension,
      open: raw.open === true || raw.open === "on",
    },
  };
}
