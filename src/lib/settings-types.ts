/**
 * Im Admin-Panel bearbeitbare Server-Einstellungen.
 * Ohne Datenbank-Import, damit Client-Komponenten den Typ nutzen können.
 */
import { siteConfig } from "@/lib/config";

export type SiteSettings = {
  /** Adresse, die im Header-Widget geprüft und über den Join-Button kopiert wird. */
  serverIp: string;
  /** URL der BlueMap-Instanz (wird als iframe eingebettet). */
  mapUrl: string;
  /** Discord-Einladungslink. */
  discordInvite: string;
  /** Nimmt der Server aktuell neue Whitelist-Anträge an? */
  whitelistOpen: boolean;
  /** Text des Ankündigungsbanners über dem Header. */
  announcement: string;
  /** Banner sichtbar? */
  announcementActive: boolean;
  /**
   * Wie lange Chat und Befehle aus dem Spiel aufgehoben werden (Tage).
   * 0 heißt unbegrenzt – dann wird nichts automatisch gelöscht.
   */
  gameLogRetentionDays: number;
};

/** Fallback, solange nichts in der Datenbank steht: die Werte aus der .env. */
export const settingsDefaults: SiteSettings = {
  serverIp: siteConfig.serverIp,
  mapUrl: siteConfig.mapUrl,
  discordInvite: siteConfig.discordInvite,
  whitelistOpen: true,
  announcement: "",
  announcementActive: false,
  gameLogRetentionDays: 0,
};

export const settingKeys = Object.keys(settingsDefaults) as Array<keyof SiteSettings>;
