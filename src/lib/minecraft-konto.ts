import "server-only";
import { lookupMinecraftName, mitBindestrichen } from "@/lib/mojang";
import { prisma } from "@/lib/prisma";
import { GAMERTAG_RE } from "@/lib/whitelist-types";

/**
 * Die Minecraft-UUID eines Website-Accounts, notfalls bei Mojang nachgeschlagen.
 *
 * Wie beim Gehalt: Wer seinen Namen verknüpft hat, aber noch nie im Protokoll
 * auftauchte, hat keine gespeicherte UUID – und bekäme sonst die irreführende
 * Auskunft, sein Account sei nicht verknüpft. Was Mojang liefert, wird gleich
 * am Account gespeichert.
 *
 * Gebraucht überall, wo Geld auf ein Numismatics-Konto geht oder von dort
 * kommt (Kopfgeld, Kredit) – Numismatics führt Konten nur über die UUID.
 */
export async function eigeneUuid(user: {
  id: string;
  minecraftName: string | null;
  minecraftUuid: string | null;
}): Promise<string | null> {
  if (!user.minecraftName || !GAMERTAG_RE.test(user.minecraftName)) return null;
  if (user.minecraftUuid) return mitBindestrichen(user.minecraftUuid);

  const treffer = await lookupMinecraftName(user.minecraftName);
  if (treffer.status !== "gefunden") return null;

  const uuid = mitBindestrichen(treffer.uuid);
  await prisma.user
    .update({ where: { id: user.id }, data: { minecraftUuid: uuid } })
    .catch((error) => console.error("[konto] UUID konnte nicht gespeichert werden:", error));
  return uuid;
}
