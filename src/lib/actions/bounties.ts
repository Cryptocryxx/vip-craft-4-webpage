"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { setzeKopfgeldAus } from "@/lib/bounties";
import { validateBountyInput } from "@/lib/bounty-types";
import { prisma } from "@/lib/prisma";

export type BountyFormState = { error?: string; success?: string };

/** Kopfgeld aussetzen – der Einsatz wird sofort abgebucht, siehe lib/bounties.ts. */
export async function createBountyAction(_prev: BountyFormState, formData: FormData): Promise<BountyFormState> {
  const [t, tValidation] = await Promise.all([getTranslations("BountyForm"), getTranslations("Validation")]);

  const session = await auth();
  if (!session?.user?.id) return { error: t("notLoggedIn") };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, minecraftName: true, minecraftUuid: true },
  });
  if (!user) return { error: t("notLoggedIn") };

  const geprueft = validateBountyInput(
    {
      targetName: formData.get("targetName"),
      cogs: formData.get("cogs"),
      expiresOn: formData.get("expiresOn"),
    },
    user.minecraftName,
    tValidation,
  );
  if (!geprueft.ok) return { error: geprueft.error };

  const ergebnis = await setzeKopfgeldAus(user, geprueft.data);

  if (ergebnis.ok) {
    revalidatePath("/bounties");
    return { success: t("placed", { cogs: ergebnis.cogs, target: ergebnis.ziel }) };
  }

  switch (ergebnis.grund) {
    case "kein-konto":
      return { error: t("noAccount") };
    case "ziel-unbekannt":
      return { error: t("targetUnknown") };
    case "skript-fehlt":
      return { error: t("serverNotReady") };
    case "zu-wenig":
      return { error: t("notEnoughMoney") };
    case "doppelt":
      return { error: tValidation("bountyOnSelf") };
    default:
      return { error: t("notDelivered") };
  }
}
