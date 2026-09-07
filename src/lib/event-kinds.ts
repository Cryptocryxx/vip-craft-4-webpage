/**
 * Die Bausteine des Kalenders: Arten und die Form eines Termins.
 *
 * Bewusst ohne jeden Import – weder Datenbank noch Übersetzungen. Nur so darf
 * eine Client-Komponente (das Formular im Kontrollraum) die Liste der Arten
 * benutzen: Zöge sie über `event-types.ts` das mit "server-only" markierte
 * `events.ts` mit herein, ließe sich die Seite gar nicht erst bauen.
 */

export const EVENT_TYPES = ["race", "contest", "boss", "workshop", "meeting", "party"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export function istEventType(wert: string): wert is EventType {
  return (EVENT_TYPES as readonly string[]).includes(wert);
}

export type CommunityEvent = {
  id: string;
  title: string;
  description: string;
  /** ISO-Zeitstempel mit Zeitzone, z. B. "2026-09-06T15:00:00+02:00". */
  start: string;
  end?: string;
  location: string;
  host: string;
  type: EventType;
};
