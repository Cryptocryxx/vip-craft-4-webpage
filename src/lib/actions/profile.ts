"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type ProfileFormState = { error?: string; success?: string };

const GAMERTAG_RE = /^[A-Za-z0-9_]{3,16}$/;
/** Twitch-Benutzernamen: 4–25 Zeichen, Buchstaben, Zahlen, Unterstrich. */
const TWITCH_RE = /^[A-Za-z0-9_]{4,25}$/;

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

export async function linkMinecraftNameAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Du musst eingeloggt sein." };

  const name = String(formData.get("minecraftName") ?? "").trim();
  if (!GAMERTAG_RE.test(name)) {
    return { error: "Ein Minecraft-Name hat 3–16 Zeichen (Buchstaben, Zahlen, Unterstrich)." };
  }

  try {
    await prisma.user.update({ where: { id: session.user.id }, data: { minecraftName: name } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "Dieser Gamertag ist bereits mit einem anderen Discord-Account verknüpft." };
    }
    throw err;
  }

  // Laufenden Whitelist-Antrag mitziehen, damit das Team den aktuellen Namen sieht.
  await prisma.whitelistApplication.updateMany({
    where: { userId: session.user.id, status: "PENDING" },
    data: { minecraftName: name },
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin", "layout");
  return { success: `Gamertag „${name}“ verknüpft.` };
}

export async function unlinkMinecraftNameAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.user.update({ where: { id: session.user.id }, data: { minecraftName: null } });
  revalidatePath("/dashboard");
}

/**
 * Twitch-Kanal verknüpfen. Erwartet den Benutzernamen aus der Kanal-URL;
 * eine vollständige URL wird der Bequemlichkeit halber ebenfalls akzeptiert.
 */
export async function linkTwitchNameAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Du musst eingeloggt sein." };

  const raw = String(formData.get("twitchName") ?? "").trim();
  const name = raw
    .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^@/, "")
    .trim()
    .toLowerCase();

  if (!TWITCH_RE.test(name)) {
    return { error: "Ein Twitch-Name hat 4–25 Zeichen (Buchstaben, Zahlen, Unterstrich)." };
  }

  try {
    await prisma.user.update({ where: { id: session.user.id }, data: { twitchName: name } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "Dieser Twitch-Kanal ist bereits mit einem anderen Account verknüpft." };
    }
    throw err;
  }

  revalidatePath("/dashboard");
  revalidatePath("/streams");
  revalidatePath("/");
  revalidatePath("/admin", "layout");
  return { success: `Kanal twitch.tv/${name} verknüpft.` };
}

export async function unlinkTwitchNameAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.user.update({ where: { id: session.user.id }, data: { twitchName: null } });
  revalidatePath("/dashboard");
  revalidatePath("/streams");
  revalidatePath("/");
  revalidatePath("/admin", "layout");
}
