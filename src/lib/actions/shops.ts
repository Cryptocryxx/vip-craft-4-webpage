"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { createShop, deleteOwnShop, updateShop, validateShopInput } from "@/lib/shops";

export type ShopFormState = { error?: string; success?: string };

function revalidateShops(): void {
  revalidatePath("/dashboard");
  revalidatePath("/leaderboards");
  revalidatePath("/admin", "layout");
}

function fromFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description"),
    sells: formData.get("sells"),
    locationX: formData.get("locationX"),
    locationZ: formData.get("locationZ"),
    dimension: formData.get("dimension"),
    open: formData.get("open"),
  };
}

/** Neuen Shop eintragen (geht als Antrag in die Prüfung). */
export async function createShopAction(_prev: ShopFormState, formData: FormData): Promise<ShopFormState> {
  const [t, tValidation] = await Promise.all([getTranslations("ShopForm"), getTranslations("Validation")]);

  const session = await auth();
  if (!session?.user?.id) return { error: t("notLoggedIn") };

  const parsed = validateShopInput(fromFormData(formData), tValidation);
  if (!parsed.ok) return { error: parsed.error };

  await createShop(session.user.id, parsed.data);
  revalidateShops();
  return { success: t("created") };
}

/** Eigenen Shop bearbeiten – geht danach wieder in die Prüfung. */
export async function updateShopAction(_prev: ShopFormState, formData: FormData): Promise<ShopFormState> {
  const [t, tValidation] = await Promise.all([getTranslations("ShopForm"), getTranslations("Validation")]);

  const session = await auth();
  if (!session?.user?.id) return { error: t("notLoggedIn") };

  const shopId = String(formData.get("shopId") ?? "");
  if (!shopId) return { error: t("shopMissing") };

  const parsed = validateShopInput(fromFormData(formData), tValidation);
  if (!parsed.ok) return { error: parsed.error };

  try {
    await updateShop(shopId, session.user.id, parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : t("saveFailed") };
  }

  revalidateShops();
  return { success: t("updated") };
}

/** Eigenen Shop löschen. */
export async function deleteShopAction(shopId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Du musst eingeloggt sein.");

  await deleteOwnShop(shopId, session.user.id);
  revalidateShops();
}
