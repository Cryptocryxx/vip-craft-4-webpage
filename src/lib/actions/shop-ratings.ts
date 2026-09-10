"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { bewerteShop } from "@/lib/shops";
import { validateBewertung } from "@/lib/shop-types";

/**
 * `stars` traegt die eben gewaehlte Note zurueck ins Formular.
 *
 * Noetig, weil der Zustand der Komponente eine abgewiesene Eingabe nicht
 * ueberlebt: Ohne das stuende nach einer Ablehnung wieder die ALTE Note da,
 * und wer nur den Kommentar verbessert, speicherte sie unbemerkt erneut.
 */
export type RatingFormState = { error?: string; success?: string; stars?: number };

/** Bewertung für einen Shop abgeben oder die eigene ändern. */
export async function rateShopAction(_prev: RatingFormState, formData: FormData): Promise<RatingFormState> {
  const [t, tValidation] = await Promise.all([getTranslations("ShopRating"), getTranslations("Validation")]);

  const session = await auth();
  if (!session?.user?.id) return { error: t("notLoggedIn") };

  const shopId = String(formData.get("shopId") ?? "");
  if (!shopId) return { error: t("shopMissing") };

  const gewaehlt = Number(formData.get("stars"));
  const zurueck = Number.isInteger(gewaehlt) ? { stars: gewaehlt } : {};

  const geprueft = validateBewertung({ stars: formData.get("stars"), comment: formData.get("comment") }, tValidation);
  if (!geprueft.ok) return { error: geprueft.error, ...zurueck };

  const ergebnis = await bewerteShop(shopId, session.user.id, geprueft.data);
  if (!ergebnis.ok) {
    return { error: ergebnis.grund === "eigener-laden" ? t("ownShop") : t("shopMissing"), ...zurueck };
  }

  revalidatePath("/shops");
  revalidatePath("/dashboard");
  return { success: t("saved"), stars: geprueft.data.stars };
}
