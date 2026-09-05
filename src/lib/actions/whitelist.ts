"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { refreshMembership } from "@/lib/discord";
import { pruefeGamertag } from "@/lib/mojang";
import { getSiteSettings } from "@/lib/settings";
import { upsertApplication, validateApplicationInput } from "@/lib/whitelist";

export type ApplicationFormState = { error?: string; success?: string };

/**
 * Discord-Mitgliedschaft neu prüfen – für den Knopf im Dashboard, nachdem
 * jemand dem Server beigetreten ist.
 */
export async function recheckDiscordAction(): Promise<ApplicationFormState> {
  const t = await getTranslations("WhitelistActions");

  const session = await auth();
  if (!session?.user?.id) return { error: t("notLoggedIn") };

  const pruefung = await refreshMembership(session.user.id);
  revalidatePath("/dashboard");

  switch (pruefung.status) {
    case "mitglied":
      return { success: t("discordOk") };
    case "nicht-mitglied":
      return { error: t("discordNotMember") };
    case "neu-anmelden":
      return { error: t("discordNeedsRelogin") };
    default:
      return { error: t("discordUnclear") };
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/** Whitelist-Antrag absenden bzw. aktualisieren. */
export async function submitApplicationAction(
  _prev: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const [t, tValidation] = await Promise.all([getTranslations("WhitelistActions"), getTranslations("Validation")]);

  const session = await auth();
  if (!session?.user?.id) return { error: t("notLoggedIn") };

  const settings = await getSiteSettings();
  if (!settings.whitelistOpen) {
    return { error: t("whitelistClosed") };
  }

  const parsed = validateApplicationInput(
    {
      minecraftName: formData.get("minecraftName"),
      message: formData.get("message"),
    },
    tValidation,
  );
  if (!parsed.ok) return { error: parsed.error };

  // Erst hier gegen Mojang pruefen: Ein Tippfehler im Namen faellt sonst erst
  // auf, wenn die Whitelist gesetzt ist und der Beitritt trotzdem scheitert.
  // pruefeGamertag liefert ausserdem die offizielle Schreibweise zurueck.
  const geprueft = await pruefeGamertag(parsed.data.minecraftName);
  if (!geprueft.ok) return { error: geprueft.error };

  try {
    await upsertApplication(session.user.id, { ...parsed.data, minecraftName: geprueft.name });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: t("alreadyLinked") };
    }
    throw err;
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin", "layout");
  return { success: t("submitted") };
}
