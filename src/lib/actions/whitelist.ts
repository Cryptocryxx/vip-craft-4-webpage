"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getSiteSettings } from "@/lib/settings";
import { upsertApplication, validateApplicationInput } from "@/lib/whitelist";

export type ApplicationFormState = { error?: string; success?: string };

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/** Whitelist-Antrag absenden bzw. aktualisieren. */
export async function submitApplicationAction(
  _prev: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Du musst eingeloggt sein." };

  const settings = await getSiteSettings();
  if (!settings.whitelistOpen) {
    return { error: "Die Whitelist ist gerade geschlossen. Schau später noch einmal vorbei." };
  }

  const parsed = validateApplicationInput({
    minecraftName: formData.get("minecraftName"),
    message: formData.get("message"),
  });
  if (!parsed.ok) return { error: parsed.error };

  try {
    await upsertApplication(session.user.id, parsed.data);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "Dieser Gamertag ist bereits mit einem anderen Discord-Account verknüpft." };
    }
    throw err;
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin", "layout");
  return { success: "Antrag abgeschickt. Das Team schaut ihn sich an." };
}
