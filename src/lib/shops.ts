import "server-only";
import { prisma } from "@/lib/prisma";
import {
  toDimension,
  type BewertungsInput,
  type ShopBewertungen,
  type ShopDTO,
  type ShopInput,
} from "@/lib/shop-types";

export * from "@/lib/shop-types";

const ownerSelect = { id: true, name: true, image: true, minecraftName: true } as const;

type ShopRow = {
  id: string;
  name: string;
  description: string | null;
  sells: string;
  locationX: number;
  locationZ: number;
  dimension: string;
  open: boolean;
  createdAt: Date;
  updatedAt: Date;
  owner: { id: string; name: string | null; image: string | null; minecraftName: string | null };
  ratings?: Array<{
    id: string;
    stars: number;
    comment: string | null;
    createdAt: Date;
    user: { name: string | null; minecraftName: string | null };
  }>;
};

/** Wie viele Kommentare am Laden stehen sollen, ohne die Karte zu sprengen. */
const SICHTBARE_KOMMENTARE = 5;

/**
 * Rechnet die Bewertungen eines Ladens zusammen.
 *
 * Der Schnitt wird ueber ALLE Bewertungen gebildet, die Kommentarliste aber
 * gekuerzt - sonst haenge die Zahl davon ab, wie viele Kommentare gerade
 * angezeigt werden.
 */
function fasseBewertungen(zeilen: NonNullable<ShopRow["ratings"]>): ShopBewertungen {
  if (zeilen.length === 0) return { schnitt: 0, anzahl: 0, letzte: [] };

  const summe = zeilen.reduce((wert, zeile) => wert + zeile.stars, 0);
  return {
    schnitt: Math.round((summe / zeilen.length) * 10) / 10,
    anzahl: zeilen.length,
    letzte: zeilen
      .filter((zeile) => zeile.comment)
      .slice(0, SICHTBARE_KOMMENTARE)
      .map((zeile) => ({
        id: zeile.id,
        stars: zeile.stars,
        comment: zeile.comment,
        createdAt: zeile.createdAt.toISOString(),
        autor: zeile.user.minecraftName ?? zeile.user.name ?? "?",
      })),
  };
}

function toDTO(row: ShopRow): ShopDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sells: row.sells.split(",").map((s) => s.trim()).filter(Boolean),
    locationX: row.locationX,
    locationZ: row.locationZ,
    dimension: toDimension(row.dimension),
    open: row.open,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    owner: row.owner,
    bewertungen: fasseBewertungen(row.ratings ?? []),
  };
}

/** Alle Shops eines Spielers, neueste zuerst. */
export async function listShopsForUser(ownerId: string): Promise<ShopDTO[]> {
  const rows = await prisma.shop.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: ownerSelect },
      ratings: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          stars: true,
          comment: true,
          createdAt: true,
          user: { select: { name: true, minecraftName: true } },
        },
      },
    },
  });
  return rows.map(toDTO);
}

/** Alle Shops – öffentlich sichtbar (sofort live) und für den Kontrollraum dieselbe Liste. */
export async function listShops(): Promise<ShopDTO[]> {
  const rows = await prisma.shop.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: ownerSelect },
      ratings: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          stars: true,
          comment: true,
          createdAt: true,
          user: { select: { name: true, minecraftName: true } },
        },
      },
    },
  });
  return rows.map(toDTO);
}

export async function createShop(ownerId: string, input: ShopInput): Promise<void> {
  await prisma.shop.create({
    data: {
      ownerId,
      name: input.name,
      description: input.description,
      sells: input.sells.join(","),
      locationX: input.locationX,
      locationZ: input.locationZ,
      dimension: input.dimension,
      open: input.open,
    },
  });
}

/** Nur der Besitzer darf bearbeiten. */
export async function updateShop(shopId: string, ownerId: string, input: ShopInput): Promise<void> {
  const result = await prisma.shop.updateMany({
    where: { id: shopId, ownerId },
    data: {
      name: input.name,
      description: input.description,
      sells: input.sells.join(","),
      locationX: input.locationX,
      locationZ: input.locationZ,
      dimension: input.dimension,
      open: input.open,
    },
  });
  if (result.count === 0) throw new Error("Shop nicht gefunden.");
}

/** Nur der Besitzer darf löschen. */
export async function deleteOwnShop(shopId: string, ownerId: string): Promise<void> {
  await prisma.shop.deleteMany({ where: { id: shopId, ownerId } });
}

/** Admins dürfen jeden Shop löschen (Moderation nach der Veröffentlichung). */
export async function adminDeleteShop(shopId: string): Promise<void> {
  await prisma.shop.delete({ where: { id: shopId } });
}

// ---------------------------------------------------------------------------
// Bewertungen
// ---------------------------------------------------------------------------

export type BewertungsErgebnis = { ok: true } | { ok: false; grund: "eigener-laden" | "unbekannt" };

/**
 * Bewertung abgeben oder die eigene aendern.
 *
 * Der eigene Laden ist ausgenommen: Sich selbst fuenf Sterne zu geben waere
 * kostenlos und wuerde den Schnitt entwerten.
 *
 * Ein zweiter Aufruf ueberschreibt die alte Bewertung, statt eine zweite Stimme
 * anzulegen - dafuer sorgt der Unique-Index auf (shopId, userId).
 */
export async function bewerteShop(
  shopId: string,
  userId: string,
  eingabe: BewertungsInput,
): Promise<BewertungsErgebnis> {
  const laden = await prisma.shop.findUnique({ where: { id: shopId }, select: { ownerId: true } });
  if (!laden) return { ok: false, grund: "unbekannt" };
  if (laden.ownerId === userId) return { ok: false, grund: "eigener-laden" };

  await prisma.shopRating.upsert({
    where: { shopId_userId: { shopId, userId } },
    create: { shopId, userId, stars: eingabe.stars, comment: eingabe.comment },
    update: { stars: eingabe.stars, comment: eingabe.comment },
  });
  return { ok: true };
}

/** Was diese Person bisher bewertet hat - fuer die Voreinstellung im Formular. */
export async function eigeneBewertungen(userId: string): Promise<Map<string, number>> {
  const zeilen = await prisma.shopRating.findMany({
    where: { userId },
    select: { shopId: true, stars: true },
  });
  return new Map(zeilen.map((zeile) => [zeile.shopId, zeile.stars]));
}
