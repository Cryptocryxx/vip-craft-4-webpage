import "server-only";
import { craftyConfigured, craftyLiveStats, craftyServerAction, type CraftyPowerAction } from "@/lib/crafty";
import { prisma } from "@/lib/prisma";
import type { PowerCommand, ServerEventType, ServerLiveState } from "@/lib/server-power-types";

/**
 * Start, Stopp und Neustart des Minecraft-Servers – die eine Stelle, über die
 * sowohl der Kontrollraum als auch der Watchdog gehen.
 *
 * Jede Aktion landet als ServerEvent in der Datenbank. Das ist nicht nur fürs
 * Protokoll: der Watchdog liest daraus, ob ein Stopp gewollt war.
 */

type Actor = { id: string; name: string | null } | null;

const commandToAction: Record<PowerCommand, CraftyPowerAction> = {
  start: "start_server",
  stop: "stop_server",
  restart: "restart_server",
};

const commandToEvent: Record<PowerCommand, ServerEventType> = {
  start: "START",
  stop: "STOP",
  restart: "RESTART",
};

export type PowerResult = { ok: true; message: string } | { ok: false; error: string };

/** Schreibt einen Eintrag ins Server-Protokoll. Darf den Ablauf nie blockieren. */
export async function recordServerEvent(
  type: ServerEventType,
  detail: string,
  options: { success?: boolean; actor?: Actor } = {},
): Promise<void> {
  try {
    await prisma.serverEvent.create({
      data: {
        type,
        detail,
        success: options.success ?? true,
        actorId: options.actor?.id ?? null,
        actorName: options.actor?.name ?? null,
      },
    });
  } catch (error) {
    console.error("[server-power] Ereignis konnte nicht protokolliert werden:", error);
  }
}

/**
 * Schickt eine Steuerungsaktion an Crafty.
 *
 * Crafty quittiert sofort und arbeitet den Befehl im Hintergrund ab – ein `ok`
 * heißt also „angenommen", nicht „fertig". Der tatsächliche Zustand kommt
 * anschließend über `getServerLiveState()`.
 */
export async function runPowerCommand(command: PowerCommand, actor: Actor, reason?: string): Promise<PowerResult> {
  if (!craftyConfigured) {
    return { ok: false, error: "Crafty ist nicht konfiguriert – es wurde nichts abgeschickt." };
  }

  const detail = reason ?? "Über den Kontrollraum ausgelöst";

  try {
    await craftyServerAction(commandToAction[command]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordServerEvent(commandToEvent[command], `${detail} – fehlgeschlagen: ${message}`, {
      success: false,
      actor,
    });
    return { ok: false, error: message };
  }

  await recordServerEvent(commandToEvent[command], detail, { actor });

  const messages: Record<PowerCommand, string> = {
    start: "Startbefehl abgeschickt. Bis der Server erreichbar ist, dauert es bei diesem Modpack ein paar Minuten.",
    stop: "Stoppbefehl abgeschickt. Der Server speichert noch und fährt dann herunter.",
    restart: "Neustart abgeschickt. Der Server fährt herunter und kommt von allein wieder hoch.",
  };
  return { ok: true, message: messages[command] };
}

export type DeliberateShutdown = { at: Date; actorName: string | null; kind: "STOP" | "RESTART" };

/** Gab es in den letzten Minuten einen Stopp oder Neustart aus dem Kontrollraum? */
export async function recentDeliberateShutdown(withinMinutes = 15): Promise<DeliberateShutdown | null> {
  const since = new Date(Date.now() - withinMinutes * 60_000);

  try {
    const event = await prisma.serverEvent.findFirst({
      where: { type: { in: ["STOP", "RESTART"] }, success: true, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, actorName: true, type: true },
    });
    if (!event) return null;

    return {
      at: event.createdAt,
      actorName: event.actorName,
      kind: event.type === "RESTART" ? "RESTART" : "STOP",
    };
  } catch (error) {
    console.error("[server-power] Protokoll nicht lesbar:", error);
    return null;
  }
}

/** Aktueller Zustand für die Anzeige – wirft nicht, sondern meldet den Fehler im Objekt. */
export async function getServerLiveState(): Promise<ServerLiveState> {
  const empty: ServerLiveState = {
    configured: craftyConfigured,
    running: false,
    busy: false,
    onlinePlayers: 0,
    maxPlayers: 0,
    players: [],
    version: null,
    cpu: 0,
    memPercent: 0,
    memBytes: 0,
    worldSize: null,
    startedAt: null,
    sampledAt: null,
    error: null,
  };

  if (!craftyConfigured) {
    return { ...empty, error: "Crafty ist nicht konfiguriert." };
  }

  try {
    const stats = await craftyLiveStats();
    return {
      ...empty,
      running: stats.running,
      busy: stats.waitingStart || stats.updating || stats.importing,
      onlinePlayers: stats.onlinePlayers,
      maxPlayers: stats.maxPlayers,
      players: stats.players,
      version: stats.version,
      cpu: stats.cpu,
      memPercent: stats.memPercent,
      memBytes: stats.memBytes,
      worldSize: stats.worldSize,
      startedAt: stats.startedAt,
      sampledAt: stats.sampledAt,
    };
  } catch (error) {
    return { ...empty, error: error instanceof Error ? error.message : String(error) };
  }
}

// ---------------------------------------------------------------------------
// Schalter für den automatischen Neustart
// ---------------------------------------------------------------------------

const AUTO_RESTART_KEY = "autoRestart";

export async function getAutoRestart(): Promise<boolean> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: AUTO_RESTART_KEY }, select: { value: true } });
    // Standard: aus. Wer den Watchdog will, schaltet ihn bewusst ein.
    return row?.value === "true";
  } catch (error) {
    console.error("[server-power] Watchdog-Schalter nicht lesbar:", error);
    return false;
  }
}

export async function setAutoRestart(enabled: boolean): Promise<void> {
  const value = String(enabled);
  await prisma.setting.upsert({
    where: { key: AUTO_RESTART_KEY },
    update: { value },
    create: { key: AUTO_RESTART_KEY, value },
  });
}

/** Die letzten Protokolleinträge für den Kontrollraum. */
export async function recentServerEvents(limit = 25) {
  return prisma.serverEvent.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
