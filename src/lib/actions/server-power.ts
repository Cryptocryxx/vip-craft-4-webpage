"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { getAutoRestart, getServerLiveState, runPowerCommand, setAutoRestart } from "@/lib/server-power";
import { isPowerCommand, type ServerLiveState, type WatchdogStatus } from "@/lib/server-power-types";
import { getWatchdogStatus, runWatchdogTick } from "@/lib/server-watchdog";

export type PowerFormState = { error?: string; success?: string };

function revalidateServerPage(): void {
  revalidatePath("/admin/server");
}

/** Start, Stopp oder Neustart aus dem Kontrollraum. */
export async function powerAction(command: string): Promise<PowerFormState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Kein Admin-Zugriff." };
  }

  if (!isPowerCommand(command)) return { error: "Unbekannter Befehl." };

  const result = await runPowerCommand(command, admin);
  revalidateServerPage();

  return result.ok ? { success: result.message } : { error: result.error };
}

/** Automatischen Neustart nach Absturz ein- oder ausschalten. */
export async function setAutoRestartAction(enabled: boolean): Promise<PowerFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Kein Admin-Zugriff." };
  }

  await setAutoRestart(enabled);
  revalidateServerPage();

  return {
    success: enabled
      ? "Automatischer Neustart ist an. Stürzt der Server ab, fährt er von allein wieder hoch."
      : "Automatischer Neustart ist aus. Nach einem Absturz bleibt der Server unten.",
  };
}

/**
 * Einen Watchdog-Durchgang von Hand auslösen – praktisch zum Ausprobieren,
 * ohne auf das nächste Intervall zu warten.
 */
export async function checkNowAction(): Promise<PowerFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Kein Admin-Zugriff." };
  }

  await runWatchdogTick();
  revalidateServerPage();
  return { success: "Durchgang erledigt." };
}

/** Live-Zustand für die Anzeige im Kontrollraum (wird per Intervall nachgeladen). */
export async function fetchServerLiveState(): Promise<ServerLiveState> {
  await requireAdmin();
  return getServerLiveState();
}

export async function fetchWatchdogStatus(): Promise<WatchdogStatus> {
  await requireAdmin();
  return { ...getWatchdogStatus(), autoRestart: await getAutoRestart() };
}
