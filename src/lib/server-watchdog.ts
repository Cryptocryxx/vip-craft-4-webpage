import "server-only";
import { craftyConfigured, craftyLiveStats, craftyLogLines, craftyServerAction } from "@/lib/crafty";
import {
  getAutoRestart,
  recentDeliberateShutdown,
  recordServerEvent,
} from "@/lib/server-power";
import type { WatchdogStatus } from "@/lib/server-power-types";
import { classifyShutdown, describeVerdict } from "@/lib/shutdown-reason";

/**
 * Beobachtet den Minecraft-Server und startet ihn nach einem Absturz neu.
 *
 * Ablauf pro Durchgang: Zustand bei Crafty abfragen. Solange der Server läuft,
 * passiert nichts. Fällt er von „läuft" auf „aus", wird erst der Grund geklärt –
 * geplanter Stopp oder Absturz – und nur im zweiten Fall neu gestartet.
 *
 * Bewusste Vorsichtsmaßnahmen:
 * ▸ Der allererste Durchgang stellt nur fest, wie der Zustand ist, und handelt
 *   nie. Sonst würde ein Neustart der Website einen absichtlich abgeschalteten
 *   Server wieder hochfahren.
 * ▸ Ist das Log nicht lesbar, bleibt der Server aus. Lieber ein Neustart zu
 *   wenig als einer gegen den Willen der Admins.
 * ▸ Höchstens MAX_RESTARTS_PER_HOUR Versuche pro Stunde, damit ein Server, der
 *   direkt nach dem Start wieder abstürzt, keine Endlosschleife auslöst.
 *
 * Läuft nur, wenn SERVER_WATCHDOG="true" gesetzt ist – also genau auf einem
 * Host. Zwei Instanzen (etwa Entwicklung und Produktivbetrieb) würden sich
 * gegenseitig in die Quere kommen.
 */

const HOUR_MS = 60 * 60 * 1000;
const MAX_RESTARTS_PER_HOUR = 3;
/** Dieses Modpack braucht ein paar Minuten bis „läuft" – so lange geben wir ihm. */
const BOOT_TIMEOUT_MS = 8 * 60 * 1000;

function intervalSeconds(): number {
  const raw = Number(process.env.SERVER_WATCHDOG_INTERVAL_SECONDS);
  if (!Number.isFinite(raw)) return 60;
  return Math.min(900, Math.max(15, Math.round(raw)));
}

export function watchdogProcessEnabled(): boolean {
  return process.env.SERVER_WATCHDOG === "true";
}

type WatchdogState = {
  /** null = noch nichts beobachtet; dann wird grundsätzlich nicht gehandelt. */
  lastRunning: boolean | null;
  /** Zeitpunkte der automatischen Neustarts, für das Stundenlimit. */
  restartTimes: number[];
  /** Wir haben gestartet und warten, bis der Server oben ist. */
  awaitingStartUntil: number | null;
  lastCheckedAt: Date | null;
  lastVerdict: string | null;
  timer: ReturnType<typeof setInterval> | null;
  ticking: boolean;
};

// Über globalThis, damit der Hot Reload in der Entwicklung nicht bei jedem
// Speichern einen zweiten Beobachter hinterlässt.
const globalForWatchdog = globalThis as typeof globalThis & { __vipWatchdog?: WatchdogState };

const state: WatchdogState = (globalForWatchdog.__vipWatchdog ??= {
  lastRunning: null,
  restartTimes: [],
  awaitingStartUntil: null,
  lastCheckedAt: null,
  lastVerdict: null,
  timer: null,
  ticking: false,
});

function note(verdict: string): void {
  state.lastVerdict = verdict;
}

export function getWatchdogStatus(): Omit<WatchdogStatus, "autoRestart"> {
  const now = Date.now();
  return {
    processEnabled: watchdogProcessEnabled(),
    intervalSeconds: intervalSeconds(),
    restartsInWindow: state.restartTimes.filter((time) => now - time < HOUR_MS).length,
    maxRestartsPerHour: MAX_RESTARTS_PER_HOUR,
    lastCheckedAt: state.lastCheckedAt?.toISOString() ?? null,
    lastVerdict: state.lastVerdict,
  };
}

// ---------------------------------------------------------------------------

async function attemptRestart(reason: string): Promise<void> {
  const now = Date.now();
  state.restartTimes = state.restartTimes.filter((time) => now - time < HOUR_MS);

  if (state.restartTimes.length >= MAX_RESTARTS_PER_HOUR) {
    note("Stundenlimit für automatische Neustarts erreicht.");
    await recordServerEvent(
      "AUTO_RESTART_BLOCKED",
      `${reason} Es gab in der letzten Stunde bereits ${MAX_RESTARTS_PER_HOUR} automatische Neustarts – weitere Versuche wurden gestoppt. Bitte von Hand nachsehen.`,
      { success: false },
    );
    return;
  }

  try {
    await craftyServerAction("start_server");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    note(`Neustart fehlgeschlagen: ${message}`);
    await recordServerEvent("AUTO_RESTART", `${reason} Der Startbefehl ging nicht durch: ${message}`, {
      success: false,
    });
    return;
  }

  state.restartTimes.push(now);
  state.awaitingStartUntil = now + BOOT_TIMEOUT_MS;
  note("Neustart abgeschickt, warte auf das Hochfahren.");
  await recordServerEvent(
    "AUTO_RESTART",
    `${reason} Startbefehl abgeschickt (Versuch ${state.restartTimes.length} von ${MAX_RESTARTS_PER_HOUR} in dieser Stunde).`,
  );
}

/** Der Server ist gerade ausgegangen – warum? */
async function handleShutdown(): Promise<void> {
  const deliberate = await recentDeliberateShutdown(15);
  if (deliberate) {
    const who = deliberate.actorName ? ` durch ${deliberate.actorName}` : "";
    const detail =
      deliberate.kind === "RESTART"
        ? `Der Neustart wurde${who} über den Kontrollraum ausgelöst – der Server kommt von allein wieder hoch.`
        : `Der Stopp wurde${who} über den Kontrollraum ausgelöst. Kein Neustart.`;

    note(
      deliberate.kind === "RESTART"
        ? "Neustart kam aus dem Kontrollraum – Server kommt von allein wieder."
        : "Stopp kam aus dem Kontrollraum – kein Neustart.",
    );
    await recordServerEvent("STOP_DETECTED", detail);
    return;
  }

  let lines: string[];
  try {
    lines = await craftyLogLines(true);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    note("Log nicht lesbar – kein Neustart.");
    await recordServerEvent(
      "ERROR",
      `Der Server ist aus, aber das Log war nicht lesbar (${message}). Ohne den Grund zu kennen wird nicht neu gestartet.`,
      { success: false },
    );
    return;
  }

  const verdict = classifyShutdown(lines);
  const explanation = describeVerdict(verdict);

  if (verdict.kind === "stopped") {
    note("Sauber heruntergefahren – kein Neustart.");
    await recordServerEvent("STOP_DETECTED", `${explanation} Kein Neustart nötig.`);
    return;
  }

  await recordServerEvent("CRASH_DETECTED", explanation, { success: false });

  if (!(await getAutoRestart())) {
    note("Absturz erkannt, automatischer Neustart ist aber ausgeschaltet.");
    await recordServerEvent(
      "AUTO_RESTART_BLOCKED",
      "Der automatische Neustart ist im Kontrollraum ausgeschaltet – der Server bleibt aus.",
      { success: false },
    );
    return;
  }

  await attemptRestart("Absturz erkannt.");
}

/**
 * Ein Durchgang. Wird vom Intervall aufgerufen und lässt sich im Kontrollraum
 * auch von Hand auslösen. Wirft nie – Fehler landen im Protokoll.
 */
export async function runWatchdogTick(): Promise<void> {
  if (state.ticking) return;
  state.ticking = true;

  try {
    if (!craftyConfigured) {
      note("Crafty ist nicht konfiguriert.");
      return;
    }

    let stats;
    try {
      stats = await craftyLiveStats();
    } catch (error) {
      // Aussetzer bei Crafty oder im Netz: den bekannten Zustand NICHT ändern,
      // sonst gilt der nächste erfolgreiche Abruf fälschlich als Absturz.
      note(`Zustand nicht abrufbar: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    state.lastCheckedAt = new Date();

    if (stats.updating || stats.importing) {
      note("Crafty arbeitet gerade am Server (Update/Import).");
      return;
    }

    if (stats.running) {
      if (state.awaitingStartUntil !== null) {
        await recordServerEvent("BACK_ONLINE", "Der Server ist nach dem automatischen Neustart wieder oben.");
      }
      state.awaitingStartUntil = null;
      state.lastRunning = true;
      note(`Server läuft (${stats.onlinePlayers} von ${stats.maxPlayers} Spielern online).`);
      return;
    }

    // Ab hier: der Server läuft nicht.
    if (stats.waitingStart) {
      note("Server fährt gerade hoch.");
      return;
    }

    if (state.lastRunning === null) {
      state.lastRunning = false;
      note("Erste Beobachtung: Server ist aus. Es wird nichts unternommen.");
      return;
    }

    if (state.awaitingStartUntil !== null) {
      if (Date.now() < state.awaitingStartUntil) {
        note("Warte darauf, dass der Server hochkommt.");
        return;
      }
      state.awaitingStartUntil = null;
      await attemptRestart("Der letzte Startversuch hat den Server nicht hochgebracht.");
      return;
    }

    if (state.lastRunning === false) {
      note("Server ist aus – Grund ist bereits geklärt.");
      return;
    }

    // Übergang von „läuft" auf „aus".
    state.lastRunning = false;
    await handleShutdown();
  } catch (error) {
    // Letztes Netz: ein Fehler hier darf das Intervall nicht abreißen lassen.
    console.error("[watchdog] Durchgang fehlgeschlagen:", error);
    note(`Durchgang fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    state.ticking = false;
  }
}

/** Startet das Intervall. Mehrfachaufrufe sind harmlos. */
export function startWatchdog(): void {
  if (!watchdogProcessEnabled()) return;
  if (state.timer) return;

  if (!craftyConfigured) {
    console.warn("[watchdog] SERVER_WATCHDOG=true, aber Crafty ist nicht konfiguriert – der Beobachter bleibt aus.");
    return;
  }

  const seconds = intervalSeconds();
  state.timer = setInterval(() => void runWatchdogTick(), seconds * 1000);
  console.log(`[watchdog] Beobachtet den Server alle ${seconds} Sekunden.`);

  void runWatchdogTick();
}
