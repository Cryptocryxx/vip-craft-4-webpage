/**
 * Typen rund um Server-Steuerung und Watchdog – ohne Datenbank- oder
 * Crafty-Import, damit auch Client-Komponenten sie benutzen können.
 */
import type { BadgeTone } from "@/components/ui/Badge";

export const SERVER_EVENT_TYPES = [
  "START",
  "STOP",
  "RESTART",
  "STOP_DETECTED",
  "CRASH_DETECTED",
  "AUTO_RESTART",
  "AUTO_RESTART_BLOCKED",
  "BACK_ONLINE",
  "ERROR",
] as const;

export type ServerEventType = (typeof SERVER_EVENT_TYPES)[number];

export const serverEventLabels: Record<ServerEventType, string> = {
  START: "Gestartet",
  STOP: "Gestoppt",
  RESTART: "Neu gestartet",
  STOP_DETECTED: "Sauber heruntergefahren",
  CRASH_DETECTED: "Absturz erkannt",
  AUTO_RESTART: "Automatischer Neustart",
  AUTO_RESTART_BLOCKED: "Neustart abgebrochen",
  BACK_ONLINE: "Wieder online",
  ERROR: "Fehler",
};

export const serverEventTones: Record<ServerEventType, BadgeTone> = {
  START: "emerald",
  STOP: "neutral",
  RESTART: "brass",
  STOP_DETECTED: "neutral",
  CRASH_DETECTED: "rose",
  AUTO_RESTART: "brass",
  AUTO_RESTART_BLOCKED: "rose",
  BACK_ONLINE: "emerald",
  ERROR: "rose",
};

export function isServerEventType(value: string): value is ServerEventType {
  return (SERVER_EVENT_TYPES as readonly string[]).includes(value);
}

/** Was die Steuerung im Kontrollraum anbietet. */
export const POWER_COMMANDS = ["start", "stop", "restart"] as const;
export type PowerCommand = (typeof POWER_COMMANDS)[number];

export function isPowerCommand(value: string): value is PowerCommand {
  return (POWER_COMMANDS as readonly string[]).includes(value);
}

/** Live-Zustand, wie ihn die Kontrollraum-Oberfläche pollt. */
export type ServerLiveState = {
  configured: boolean;
  running: boolean;
  /** Server fährt gerade hoch, wird aktualisiert o. Ä. – Buttons bleiben gesperrt. */
  busy: boolean;
  onlinePlayers: number;
  maxPlayers: number;
  players: string[];
  version: string | null;
  cpu: number;
  memPercent: number;
  memBytes: number;
  worldSize: string | null;
  startedAt: string | null;
  sampledAt: string | null;
  error: string | null;
};

export type WatchdogStatus = {
  /** Läuft der Beobachter in diesem Prozess überhaupt? (Env-Schalter) */
  processEnabled: boolean;
  /** Darf er im Ernstfall neu starten? (Schalter im Kontrollraum) */
  autoRestart: boolean;
  intervalSeconds: number;
  /** Automatische Neustarts in der laufenden Stunde. */
  restartsInWindow: number;
  maxRestartsPerHour: number;
  lastCheckedAt: string | null;
  lastVerdict: string | null;
};
