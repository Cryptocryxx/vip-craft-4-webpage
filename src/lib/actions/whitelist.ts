"use server";

import { revalidatePath } from "next/cache";
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
  const session = await auth();
  if (!session?.user?.id) return { error: "Du musst eingeloggt sein." };

  const pruefung = await refreshMembership(session.user.id);
  revalidatePath("/dashboard");

  switch (pruefung.status) {
    case "mitglied":
      return { success: "Passt – du bist im Discord." };
    case "nicht-mitglied":
      return { error: "Wir sehen dich noch nicht im Discord. Tritt bei und prüf es dann noch einmal." };
    case "neu-anmelden":
      return {
        error:
          "Dafür fehlt uns deine Erlaubnis: Melde dich einmal ab und wieder mit Discord an, dann prüfen wir es von selbst.",
      };
    default:
      return { error: "Das ließ sich gerade nicht klären. Bitte versuch es in ein paar Minuten noch einmal." };
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

  // Erst hier gegen Mojang pruefen: Ein Tippfehler im Namen faellt sonst erst
  // auf, wenn die Whitelist gesetzt ist und der Beitritt trotzdem scheitert.
  // pruefeGamertag liefert ausserdem die offizielle Schreibweise zurueck.
  const geprueft = await pruefeGamertag(parsed.data.minecraftName);
  if (!geprueft.ok) return { error: geprueft.error };

  try {
    await upsertApplication(session.user.id, { ...parsed.data, minecraftName: geprueft.name });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "Dieser Minecraft-Username ist bereits mit einem anderen Discord-Account verknüpft." };
    }
    throw err;
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin", "layout");
  return { success: "Antrag abgeschickt. Das Team schaut ihn sich an." };
}
