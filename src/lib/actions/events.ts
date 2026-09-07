"use server";

import { revalidatePath } from "next/cache";
import { requireTeam } from "@/lib/admin";
import { istEventType } from "@/lib/event-kinds";
import { aendereEvent, legeEventAn, loescheEvent, type EventEingabe } from "@/lib/events";
import { berlinNachDatum } from "@/lib/zeit";

export type EventFormState = { error?: string; success?: string };

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Alles, was am Formular schiefgehen kann, an einer Stelle – Anlegen und
 * Ändern schicken dieselben Felder.
 */
function pruefe(formData: FormData): { ok: true; daten: EventEingabe } | { ok: false; error: string } {
  const title = text(formData, "title");
  const description = text(formData, "description");
  const location = text(formData, "location");
  const host = text(formData, "host");
  const type = text(formData, "type");

  if (title.length < 3 || title.length > 120) return { ok: false, error: "Der Titel muss 3–120 Zeichen lang sein." };
  if (description.length < 10 || description.length > 2000) {
    return { ok: false, error: "Die Beschreibung muss 10–2000 Zeichen lang sein." };
  }
  if (location.length < 2 || location.length > 80) return { ok: false, error: "Der Ort muss 2–80 Zeichen lang sein." };
  if (host.length < 2 || host.length > 80) return { ok: false, error: "Der Veranstalter muss 2–80 Zeichen lang sein." };
  if (!istEventType(type)) return { ok: false, error: "Ungültige Art." };

  const start = berlinNachDatum(text(formData, "start"));
  if (!start) return { ok: false, error: "Ohne Startzeit geht es nicht." };

  const endeRoh = text(formData, "end");
  const end = endeRoh ? berlinNachDatum(endeRoh) : null;
  if (endeRoh && !end) return { ok: false, error: "Die Endzeit sieht nicht wie ein Datum aus." };
  if (end && end.getTime() <= start.getTime()) return { ok: false, error: "Das Ende muss nach dem Start liegen." };

  const titleEn = text(formData, "titleEn");
  const descriptionEn = text(formData, "descriptionEn");
  if (titleEn.length > 120) return { ok: false, error: "Der englische Titel darf höchstens 120 Zeichen haben." };
  if (descriptionEn.length > 2000) {
    return { ok: false, error: "Die englische Beschreibung darf höchstens 2000 Zeichen haben." };
  }

  return {
    ok: true,
    daten: {
      title,
      description,
      titleEn: titleEn || null,
      descriptionEn: descriptionEn || null,
      start,
      end,
      location,
      host,
      type,
      countdown: formData.get("countdown") === "on",
    },
  };
}

/**
 * Nach jeder Änderung neu bauen lassen: Der Termin steht auf der Startseite
 * (Countdown und Menü-Karte), auf der Community-Seite und im Kontrollraum.
 */
function neuBauen(): void {
  revalidatePath("/", "layout");
}

export async function createEventAction(_prev: EventFormState, formData: FormData): Promise<EventFormState> {
  try {
    await requireTeam();
  } catch {
    return { error: "Dafür fehlen dir die Rechte." };
  }

  const geprueft = pruefe(formData);
  if (!geprueft.ok) return { error: geprueft.error };

  await legeEventAn(geprueft.daten);
  neuBauen();
  return { success: `„${geprueft.daten.title}" ist eingetragen.` };
}

export async function updateEventAction(_prev: EventFormState, formData: FormData): Promise<EventFormState> {
  try {
    await requireTeam();
  } catch {
    return { error: "Dafür fehlen dir die Rechte." };
  }

  const id = text(formData, "eventId");
  if (!id) return { error: "Termin fehlt." };

  const geprueft = pruefe(formData);
  if (!geprueft.ok) return { error: geprueft.error };

  try {
    await aendereEvent(id, geprueft.daten);
  } catch {
    return { error: "Diesen Termin gibt es nicht (mehr)." };
  }

  neuBauen();
  return { success: "Gespeichert." };
}

export async function deleteEventAction(id: string): Promise<void> {
  await requireTeam();
  await loescheEvent(id).catch(() => undefined);
  neuBauen();
}
