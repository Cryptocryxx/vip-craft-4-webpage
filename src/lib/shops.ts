import "server-only";
import { prisma } from "@/lib/prisma";
import { toDimension, type ShopDTO, type ShopInput } from "@/lib/shop-types";

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
};

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
  };
}

/** Alle Shops eines Spielers, neueste zuerst. */
export async function listShopsForUser(ownerId: string): Promise<ShopDTO[]> {
  const rows = await prisma.shop.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    include: { owner: { select: ownerSelect } },
  });
  return rows.map(toDTO);
}

/** Alle Shops – öffentlich sichtbar (sofort live) und für den Kontrollraum dieselbe Liste. */
export async function listShops(): Promise<ShopDTO[]> {
  const rows = await prisma.shop.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: { select: ownerSelect } },
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
