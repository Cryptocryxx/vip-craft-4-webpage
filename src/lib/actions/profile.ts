"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { pruefeGamertag } from "@/lib/mojang";
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
  const t = await getTranslations("LinkMinecraftForm");
  const tValidation = await getTranslations("Validation");

  const session = await auth();
  if (!session?.user?.id) return { error: t("notLoggedIn") };

  const eingabe = String(formData.get("minecraftName") ?? "").trim();
  if (!GAMERTAG_RE.test(eingabe)) {
    return { error: tValidation("minecraftNamePattern") };
  }

  // Gibt es den Namen ueberhaupt? Sonst landet ein Tippfehler in der Whitelist
  // und der Betreffende kommt nicht auf den Server, ohne dass jemand merkt warum.
  const geprueft = await pruefeGamertag(eingabe);
  if (!geprueft.ok) return { error: geprueft.error };
  const name = geprueft.name;

  try {
    await prisma.user.update({ where: { id: session.user.id }, data: { minecraftName: name } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: t("alreadyLinked") };
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
  return { success: t("linked", { name }) };
}

/**
 * Merkt sich, dass jemand den Modpack-Link geöffnet hat.
 *
 * Mehr lässt sich von hier aus nicht wissen: Ob die Datei wirklich ankam und
 * installiert wurde, sieht nur der Rechner davor. Für die Checkliste reicht
 * das – sie soll den Weg zeigen, nicht überwachen.
 */
export async function markModpackDownloadedAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { modpackDownloadedAt: new Date() },
  });
  revalidatePath("/dashboard");
  revalidatePath("/");
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
  const t = await getTranslations("LinkTwitchForm");
  const tValidation = await getTranslations("Validation");

  const session = await auth();
  if (!session?.user?.id) return { error: t("notLoggedIn") };

  const raw = String(formData.get("twitchName") ?? "").trim();
  const name = raw
    .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^@/, "")
    .trim()
    .toLowerCase();

  if (!TWITCH_RE.test(name)) {
    return { error: tValidation("twitchNamePattern") };
  }

  try {
    await prisma.user.update({ where: { id: session.user.id }, data: { twitchName: name } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: t("alreadyLinked") };
    }
    throw err;
  }

  revalidatePath("/dashboard");
  revalidatePath("/streams");
  revalidatePath("/");
  revalidatePath("/admin", "layout");
  return { success: t("linked", { name }) };
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
