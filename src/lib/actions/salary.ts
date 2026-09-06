"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { holeGehalt } from "@/lib/salary";

export type SalaryFormState = { error?: string; success?: string };

/** Tägliches Gehalt abholen – einmal pro Kalendertag, siehe lib/salary.ts. */
export async function claimSalaryAction(): Promise<SalaryFormState> {
  const t = await getTranslations("DailySalary");

  const session = await auth();
  if (!session?.user?.id) return { error: t("notLoggedIn") };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, minecraftName: true, minecraftUuid: true },
  });
  if (!user) return { error: t("notLoggedIn") };

  const ergebnis = await holeGehalt(user);

  if (ergebnis.ok) {
    revalidatePath("/dashboard");
    return { success: t("paidOut", { cogs: ergebnis.cogs }) };
  }

  switch (ergebnis.grund) {
    case "aus":
      return { error: t("disabled") };
    case "kein-konto":
      return { error: t("noAccount") };
    case "schon-abgeholt":
      revalidatePath("/dashboard");
      return { error: t("alreadyClaimed") };
    case "skript-fehlt":
      return { error: t("serverNotReady") };
    default:
      return { error: t("notDelivered") };
  }
}
