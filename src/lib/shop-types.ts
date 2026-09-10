/**
 * Typen, Konstanten und Validierung für Spieler-Shops.
 * Bewusst ohne Datenbank-Import, damit Client-Komponenten sie nutzen können.
 *
 * Shops gehen ohne Admin-Freigabe sofort live – Admins können Einträge im
 * Kontrollraum jederzeit entfernen (Moderation nach der Veröffentlichung).
 */

import { enthaeltBeleidigung, fuerKonsole } from "@/lib/schimpfwoerter";

/** So viele Sterne gibt es. */
export const MIN_STERNE = 1;
export const MAX_STERNE = 5;

/** So lang darf ein Kommentar sein. */
export const MAX_KOMMENTAR_LAENGE = 200;

export const DIMENSIONS = ["overworld", "nether", "end"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

/**
 * Beschriftungen kommen aus den Übersetzungen, Namespace "ShopTypes"
 * (`useTranslations("ShopTypes")` bzw. `getTranslations("ShopTypes")`) –
 * die Schlüssel sind genau die Werte aus DIMENSIONS.
 */

export function toDimension(value: string): Dimension {
  return (DIMENSIONS as readonly string[]).includes(value) ? (value as Dimension) : "overworld";
}

export type ShopOwnerSummary = { id: string; name: string | null; image: string | null; minecraftName: string | null };

export type ShopBewertung = {
  id: string;
  stars: number;
  comment: string | null;
  createdAt: string;
  /** Minecraft-Name, sonst der Anzeigename - wer bewertet hat, steht dabei. */
  autor: string;
};

export type ShopBewertungen = {
  /** Durchschnitt, auf eine Nachkommastelle. 0, wenn es noch keine gibt. */
  schnitt: number;
  anzahl: number;
  /** Die letzten Kommentare, neueste zuerst. */
  letzte: ShopBewertung[];
};

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
  bewertungen: ShopBewertungen;
};

export type BewertungsInput = { stars: number; comment: string | null };

type BewertungsUebersetzer = (schluessel: string, werte?: Record<string, string | number>) => string;

/**
 * Prueft eine abgegebene Bewertung.
 *
 * Der Kommentar wird ZUERST entschaerft und dann auf Beschimpfungen geprueft -
 * nicht umgekehrt. Sonst kaeme "Idi§ot" durch die Wortliste und stuende
 * hinterher sauber lesbar neben dem Laden.
 */
export function validateBewertung(
  raw: { stars?: unknown; comment?: unknown },
  t: BewertungsUebersetzer,
): { ok: true; data: BewertungsInput } | { ok: false; error: string } {
  const stars = Number(typeof raw.stars === "string" ? raw.stars.trim() : raw.stars);
  if (!Number.isInteger(stars) || stars < MIN_STERNE || stars > MAX_STERNE) {
    return { ok: false, error: t("ratingStars", { min: MIN_STERNE, max: MAX_STERNE }) };
  }

  const roh = typeof raw.comment === "string" ? fuerKonsole(raw.comment, MAX_KOMMENTAR_LAENGE) : "";
  if (roh.length > 0 && enthaeltBeleidigung(roh)) {
    return { ok: false, error: t("ratingRude") };
  }

  return { ok: true, data: { stars, comment: roh.length > 0 ? roh : null } };
}

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

/**
 * `t` ist der Übersetzer für den Namespace "Validation"
 * (`getTranslations("Validation")` in Server Actions) – so bleibt diese
 * Datei ohne next-intl-Import, aber trotzdem übersetzt.
 */
export type ValidationTranslator = (key: string) => string;

export function validateShopInput(
  raw: {
    name?: unknown;
    description?: unknown;
    sells?: unknown;
    locationX?: unknown;
    locationZ?: unknown;
    dimension?: unknown;
    open?: unknown;
  },
  t: ValidationTranslator,
): { ok: true; data: ShopInput } | { ok: false; error: string } {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const descriptionRaw = typeof raw.description === "string" ? raw.description.trim() : "";
  const sellsRaw = typeof raw.sells === "string" ? raw.sells : "";
  const dimension = typeof raw.dimension === "string" ? raw.dimension : "";

  if (name.length < 2 || name.length > 40) {
    return { ok: false, error: t("shopNameLength") };
  }
  if (descriptionRaw.length > 300) {
    return { ok: false, error: t("shopDescriptionTooLong") };
  }

  const sells = sellsRaw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (sells.length === 0) {
    return { ok: false, error: t("itemsRequired") };
  }
  if (sells.length > 10) {
    return { ok: false, error: t("itemsTooMany") };
  }
  if (sells.some((item) => item.length > 30)) {
    return { ok: false, error: t("itemNameTooLong") };
  }

  if (!(DIMENSIONS as readonly string[]).includes(dimension)) {
    return { ok: false, error: t("invalidDimension") };
  }

  const locationX = parseCoordinate(raw.locationX);
  const locationZ = parseCoordinate(raw.locationZ);
  if (locationX === null || locationZ === null) {
    return { ok: false, error: t("invalidCoordinates") };
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
