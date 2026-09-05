/**
 * Die Ereignisarten aus dem Spiel und wie sie heißen.
 *
 * Ohne Server-Abhängigkeiten, damit Client-Komponenten dieselben Beschriftungen
 * benutzen wie die Seiten. Geschrieben werden die Werte vom KubeJS-Skript
 * (minecraft/kubejs/server_scripts/insights-log.js), gelesen von lib/game-log.ts.
 */

export const GAME_LOG_ARTEN = ["CHAT", "DISCORD_CHAT", "COMMAND", "COMMAND_CONSOLE", "JOIN", "QUIT", "DEATH"] as const;
export type GameLogArt = (typeof GAME_LOG_ARTEN)[number];

export const gameLogLabel: Record<GameLogArt, string> = {
  CHAT: "Chat",
  DISCORD_CHAT: "Discord",
  COMMAND: "Befehl",
  COMMAND_CONSOLE: "Konsole",
  JOIN: "Beigetreten",
  QUIT: "Gegangen",
  DEATH: "Tod",
};

export function istGameLogArt(wert: string): wert is GameLogArt {
  return (GAME_LOG_ARTEN as readonly string[]).includes(wert);
}

/** Filter für die Übersicht: mehrere Arten unter einem Knopf. */
export const gameLogFilter = {
  alles: { label: "Alles", arten: [...GAME_LOG_ARTEN] },
  chat: { label: "Nur Chat", arten: ["CHAT", "DISCORD_CHAT"] },
  befehle: { label: "Befehle", arten: ["COMMAND", "COMMAND_CONSOLE"] },
  anwesenheit: { label: "Kommen & Gehen", arten: ["JOIN", "QUIT"] },
  tode: { label: "Tode", arten: ["DEATH"] },
} satisfies Record<string, { label: string; arten: GameLogArt[] | string[] }>;

export type GameLogFilterSchluessel = keyof typeof gameLogFilter;

export function istFilterSchluessel(wert: string): wert is GameLogFilterSchluessel {
  return Object.prototype.hasOwnProperty.call(gameLogFilter, wert);
}

/** Eine Zeile, wie sie in den Komponenten ankommt. */
export type GameLogEintrag = {
  seq: number;
  kind: string;
  playerName: string;
  playerUuid: string | null;
  userId: string | null;
  text: string;
  at: string;
};
