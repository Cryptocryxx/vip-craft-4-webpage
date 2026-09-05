"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireTeam } from "@/lib/admin";
import { holeEreignisse, ladeKontext, ladeVerlauf, loescheVerlauf } from "@/lib/game-log";
import type { GameLogEintrag } from "@/lib/game-log-types";

/**
 * Server Actions für Chat und Befehle im Kontrollraum.
 *
 * Lesen darf das ganze Team, löschen nur ein Admin: Ein gelöschter Verlauf
 * kommt nicht zurück, und wer moderiert, soll seine eigenen Spuren nicht
 * verwischen können.
 */

export type VerlaufErgebnis = { eintraege: GameLogEintrag[]; error?: string };
export type VerlaufAktion = { error?: string; success?: string };

/** Die Nachricht mit fünf Ereignissen davor und danach – von allen Spielern. */
export async function ladeKontextAction(seq: number): Promise<VerlaufErgebnis> {
  try {
    await requireTeam();
  } catch {
    return { eintraege: [], error: "Dafür fehlen dir die Rechte." };
  }

  if (!Number.isInteger(seq)) return { eintraege: [], error: "Ungültige Nummer." };
  return { eintraege: await ladeKontext(seq) };
}

/** „Ältere laden" – dieselbe Auswahl, nur weiter zurück. */
export async function ladeAeltereAction(eingabe: {
  arten?: string[];
  name?: string;
  suche?: string;
  vorSeq: number;
}): Promise<VerlaufErgebnis> {
  try {
    await requireTeam();
  } catch {
    return { eintraege: [], error: "Dafür fehlen dir die Rechte." };
  }

  const eintraege = await ladeVerlauf({
    arten: eingabe.arten,
    name: eingabe.name,
    suche: eingabe.suche,
    vorSeq: eingabe.vorSeq,
    take: 50,
  });
  return { eintraege };
}

/** Holt sofort nach, statt auf den nächsten Durchgang zu warten. */
export async function aktualisiereErfassungAction(): Promise<VerlaufAktion> {
  try {
    await requireTeam();
  } catch {
    return { error: "Dafür fehlen dir die Rechte." };
  }

  const stand = await holeEreignisse(true);
  revalidatePath("/admin/chat");
  revalidatePath("/admin/users", "layout");

  if (!stand.erreichbar) return { error: stand.meldung ?? "Der Server hat nichts geliefert." };
  if (stand.neu === 0) return { success: "Nichts Neues." };
  return { success: `${stand.neu} ${stand.neu === 1 ? "Ereignis" : "Ereignisse"} übernommen.` };
}

/**
 * Löscht den Verlauf – entweder alles oder alles, was älter ist als X Tage.
 * Absichtlich nur für Admins.
 */
export async function loescheVerlaufAction(_prev: VerlaufAktion, formData: FormData): Promise<VerlaufAktion> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Das darf nur ein Admin." };
  }

  const roh = String(formData.get("tage") ?? "").trim();
  const tage = roh === "" || roh === "0" ? null : Number(roh);

  if (tage !== null && (!Number.isInteger(tage) || tage < 1)) {
    return { error: "Bitte eine ganze Zahl von Tagen angeben – oder leer lassen für alles." };
  }

  const anzahl = await loescheVerlauf(tage);
  revalidatePath("/admin/chat");
  revalidatePath("/admin/users", "layout");

  if (anzahl === 0) return { success: "Es war nichts zu löschen." };
  return {
    success:
      tage === null
        ? `${anzahl} Einträge gelöscht – der Verlauf ist jetzt leer.`
        : `${anzahl} Einträge gelöscht, die älter als ${tage} Tage waren.`,
  };
}
