"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { formatCogsLong, SPURS_PER_COG } from "@/lib/currency";
import {
  begleicheKredit,
  bieteKreditAn,
  lehneKreditAb,
  nimmKreditAn,
  pruefeKreditEingabe,
  zieheKreditZurueck,
} from "@/lib/kredite";
import { prisma } from "@/lib/prisma";

/** `at` ändert sich mit jedem erfolgreichen Angebot – daran baut das Formular seine Felder neu auf. */
export type KreditFormState = { error?: string; success?: string; at?: number };

const ID_RE = /^[a-z0-9]{20,40}$/;

async function angemeldet() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, minecraftName: true, minecraftUuid: true, whitelisted: true },
  });
}

function neuLaden() {
  revalidatePath("/economy/kredite");
  revalidatePath("/dashboard");
}

/** Kredit anbieten – der Betrag wird dabei sofort reserviert, siehe lib/kredite.ts. */
export async function bieteKreditAnAction(_prev: KreditFormState, formData: FormData): Promise<KreditFormState> {
  const [t, tValidation] = await Promise.all([getTranslations("Credits"), getTranslations("Validation")]);

  const user = await angemeldet();
  if (!user) return { error: t("notLoggedIn") };

  const geprueft = pruefeKreditEingabe(
    {
      borrowerId: formData.get("borrowerId"),
      cogs: formData.get("cogs"),
      zins: formData.get("zins"),
      rueckzahlungBis: formData.get("rueckzahlungBis"),
    },
    tValidation,
  );
  if (!geprueft.ok) return { error: geprueft.error };

  const ergebnis = await bieteKreditAn(user, geprueft.data);
  if (ergebnis.ok) {
    neuLaden();
    const werte = { name: ergebnis.kreditnehmer, amount: formatCogsLong(ergebnis.cogs * SPURS_PER_COG), due: formatCogsLong(ergebnis.faelligSpurs) };
    return { success: ergebnis.unterwegs ? t("offerPending", werte) : t("offerPlaced", werte), at: Date.now() };
  }

  switch (ergebnis.grund) {
    case "skript-fehlt":
      return { error: t("serverNotReady") };
    case "kein-konto":
      return { error: t("noAccount") };
    case "partner-fehlt":
      return { error: t("borrowerUnavailable") };
    case "selbst":
      return { error: t("notToYourself") };
    case "zu-viele":
      return { error: t("tooManyOffers") };
    case "datum":
      return { error: tValidation("creditDateInvalid") };
    case "zu-wenig":
      return { error: t("notEnoughToLend") };
  }
}

/**
 * Annehmen, ablehnen, zurückziehen, begleichen – ein Formular pro Knopf, die
 * Aktion steht im Knopf selbst. Wer was darf, prüft lib/kredite.ts: Annehmen,
 * Ablehnen und Begleichen nur der Kreditnehmer, Zurückziehen nur der Kreditgeber.
 */
export async function kreditAktionAction(_prev: KreditFormState, formData: FormData): Promise<KreditFormState> {
  const t = await getTranslations("Credits");

  const user = await angemeldet();
  if (!user) return { error: t("notLoggedIn") };

  const id = String(formData.get("id") ?? "");
  const aktion = String(formData.get("aktion") ?? "");
  if (!ID_RE.test(id)) return { error: t("notPossible") };

  const nutzer = { id: user.id, name: user.name };

  if (aktion === "begleichen") {
    const ergebnis = await begleicheKredit(nutzer, id);
    neuLaden();
    if (ergebnis.ok) return { success: ergebnis.unterwegs ? t("repayPending") : t("repaid") };
    return { error: ergebnis.grund === "zu-wenig" ? t("notEnoughToRepay") : t("notPossible") };
  }

  const ausfuehren = { annehmen: nimmKreditAn, ablehnen: lehneKreditAb, zurueckziehen: zieheKreditZurueck }[aktion];
  if (!ausfuehren) return { error: t("notPossible") };

  const ergebnis = await ausfuehren(nutzer, id);
  neuLaden();
  if (!ergebnis.ok) return { error: t("notPossible") };

  const meldung = { annehmen: "accepted", ablehnen: "declined", zurueckziehen: "withdrawn" }[aktion as "annehmen" | "ablehnen" | "zurueckziehen"];
  return { success: ergebnis.unterwegs ? t("bookingPending") : t(meldung) };
}
