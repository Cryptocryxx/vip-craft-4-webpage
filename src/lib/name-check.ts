import "server-only";
import { lookupMinecraftName } from "@/lib/mojang";
import { prisma } from "@/lib/prisma";

/**
 * Prüft nachträglich, ob ein gespeicherter Minecraft-Name überhaupt existiert.
 *
 * Nötig, weil Namen aus der Zeit vor der Eingabeprüfung ungeprüft in der
 * Datenbank stehen. Ein Tippfehler fällt sonst erst auf, wenn jemand vor dem
 * Server steht und nicht hereinkommt – und dann weiß niemand, warum.
 *
 * Das Ergebnis wird gespeichert, damit nicht bei jedem Seitenaufruf bei Mojang
 * angefragt wird. Ein Tag Abstand reicht: Namen ändern sich selten, und wer
 * seinen Namen hier ändert, wird ohnehin sofort geprüft (siehe actions/profile).
 */

const NACHFRAGE_ABSTAND_MS = 24 * 60 * 60 * 1000;

export type NamensStand = {
  /** `null` heißt: kein Name hinterlegt oder noch keine Antwort von Mojang. */
  gueltig: boolean | null;
};

export async function ensureNameChecked(user: {
  id: string;
  minecraftName: string | null;
  minecraftNameValid: boolean | null;
  minecraftNameCheckedAt: Date | null;
}): Promise<NamensStand> {
  if (!user.minecraftName) return { gueltig: null };

  const zuletzt = user.minecraftNameCheckedAt?.getTime() ?? 0;
  if (Date.now() - zuletzt < NACHFRAGE_ABSTAND_MS) return { gueltig: user.minecraftNameValid };

  const treffer = await lookupMinecraftName(user.minecraftName);

  // „unklar" ist keine Aussage – dann bleibt der bisherige Stand stehen, und
  // niemand wird wegen einer Störung bei Mojang angemeckert.
  if (treffer.status === "unklar") return { gueltig: user.minecraftNameValid };

  const gueltig = treffer.status === "gefunden";
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { minecraftNameValid: gueltig, minecraftNameCheckedAt: new Date() },
    });
  } catch (error) {
    console.error("[namen] Prüfergebnis konnte nicht gespeichert werden:", error);
  }

  return { gueltig };
}
