"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type ProfileFormState = { error?: string; success?: string };

const GAMERTAG_RE = /^[A-Za-z0-9_]{3,16}$/;

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

  revalidatePath("/dashboard");
  return { success: `Gamertag „${name}“ verknüpft.` };
}

export async function unlinkMinecraftNameAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.user.update({ where: { id: session.user.id }, data: { minecraftName: null } });
  revalidatePath("/dashboard");
}
