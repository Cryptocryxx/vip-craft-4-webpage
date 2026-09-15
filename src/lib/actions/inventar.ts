"use server";

import { requireAdmin } from "@/lib/admin";
import { ladeInventar } from "@/lib/inventar";
import { eingriffeFuer, gibItem, gibZurueck, inventarSkriptBereit, nimmItem } from "@/lib/inventar-aktionen";
import type { InventarEingriff, SpielerInventar } from "@/lib/inventar-types";
import { protokolliere, saveAndRefresh } from "@/lib/players";
import { GAMERTAG_RE } from "@/lib/whitelist-types";

/**
 * Inventar im Kontrollraum – ausschließlich für Admins.
 *
 * Jede Action prüft das selbst (requireAdmin): Dass Moderatoren den Abschnitt
 * nicht sehen, reicht nicht – eine Server-Action lässt sich auch ohne Knopf
 * aufrufen. Jeder Aufruf und jeder Eingriff landet im Spielerprotokoll.
 */

export type InventarLadeZustand = {
  error?: string;
  /** Rückmeldung von save-all, falls frisch gespeichert werden sollte. */
  hinweis?: string;
  inventar?: SpielerInventar;
  eingriffe?: InventarEingriff[];
  skriptBereit?: boolean;
};

export type EingriffZustand = { error?: string; success?: string; eingriffe?: InventarEingriff[] };

const KEIN_ADMIN = "Kein Admin-Zugriff.";

async function admin() {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

export async function ladeInventarAction(name: string, frischSpeichern: boolean): Promise<InventarLadeZustand> {
  const wer = await admin();
  if (!wer) return { error: KEIN_ADMIN };
  if (typeof name !== "string" || !GAMERTAG_RE.test(name)) return { error: "Ungültiger Minecraft-Name." };

  // save-all hat eine eigene serverweite Sperre (eine Minute) – öfter wird
  // nicht gespeichert, nur neu gelesen.
  const hinweis = frischSpeichern ? (await saveAndRefresh()).hinweis : undefined;

  const [ergebnis, skriptBereit] = await Promise.all([ladeInventar(name), inventarSkriptBereit()]);
  if (!ergebnis.ok) {
    await protokolliere("INVENTORY_VIEW", name, `Inventar angesehen – ${ergebnis.fehler}`, wer, false);
    return { error: ergebnis.fehler, hinweis };
  }

  const inventar = ergebnis.inventar;
  await protokolliere("INVENTORY_VIEW", inventar.name, "Inventar angesehen", wer, true);
  return { inventar, eingriffe: await eingriffeFuer(inventar.name), skriptBereit, hinweis };
}

export async function nimmItemAction(name: string, ort: string, itemId: string, anzahl: number): Promise<EingriffZustand> {
  const wer = await admin();
  if (!wer) return { error: KEIN_ADMIN };
  if (![name, ort, itemId].every((wert) => typeof wert === "string") || typeof anzahl !== "number") {
    return { error: "Ungültige Eingabe." };
  }
  if (!GAMERTAG_RE.test(name)) return { error: "Ungültiger Minecraft-Name." };

  const ergebnis = await nimmItem(wer, name, ort, itemId, anzahl);
  return { ...(ergebnis.ok ? { success: ergebnis.meldung } : { error: ergebnis.fehler }), eingriffe: await eingriffeFuer(name) };
}

export async function gibItemAction(name: string, itemId: string, anzahl: number): Promise<EingriffZustand> {
  const wer = await admin();
  if (!wer) return { error: KEIN_ADMIN };
  if (typeof name !== "string" || typeof itemId !== "string" || typeof anzahl !== "number") {
    return { error: "Ungültige Eingabe." };
  }
  if (!GAMERTAG_RE.test(name)) return { error: "Ungültiger Minecraft-Name." };

  const ergebnis = await gibItem(wer, name, itemId, anzahl);
  return { ...(ergebnis.ok ? { success: ergebnis.meldung } : { error: ergebnis.fehler }), eingriffe: await eingriffeFuer(name) };
}

export async function gibZurueckAction(name: string, aktionId: string): Promise<EingriffZustand> {
  const wer = await admin();
  if (!wer) return { error: KEIN_ADMIN };
  if (typeof name !== "string" || typeof aktionId !== "string" || !/^[a-z0-9]{10,40}$/.test(aktionId)) {
    return { error: "Ungültige Eingabe." };
  }
  if (!GAMERTAG_RE.test(name)) return { error: "Ungültiger Minecraft-Name." };

  const ergebnis = await gibZurueck(wer, aktionId);
  return { ...(ergebnis.ok ? { success: ergebnis.meldung } : { error: ergebnis.fehler }), eingriffe: await eingriffeFuer(name) };
}
