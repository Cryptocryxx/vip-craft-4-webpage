/**
 * Der Event-Kalender.
 *
 * Die Termine werden hier von Hand gepflegt – eine Datenbank oder ein Sync mit
 * den Discord-Events gibt es noch nicht. Ausgedachte Einträge stehen hier keine:
 * Was drinsteht, findet wirklich statt.
 */

export type EventType = "race" | "contest" | "boss" | "workshop" | "meeting" | "party";

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

export const eventTypeLabels: Record<EventType, string> = {
  race: "Zugrennen",
  contest: "Build-Contest",
  boss: "Boss-Fight",
  workshop: "Workshop",
  meeting: "Community",
  party: "Party",
};

const events: CommunityEvent[] = [
  {
    id: "season4-start",
    title: "Server-Start: Gemeinsame Erkundung",
    description:
      "Der Startschuss für VIP Craft 4. Wir treffen uns alle am Spawn und sehen uns die Welt zum ersten Mal gemeinsam an – wer will, sucht sich direkt einen Platz für seine Basis. Kommt pünktlich, gestartet wird zusammen.",
    start: "2026-09-06T15:00:00+02:00",
    location: "Spawn",
    host: "Team",
    type: "party",
  },
];

/** Alle Termine, die noch bevorstehen – nächster zuerst. */
export function getUpcomingEvents(now: Date = new Date()): CommunityEvent[] {
  return events
    .filter((event) => new Date(event.end ?? event.start).getTime() >= now.getTime())
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Alle Termine, auch vergangene. */
export function getAllEvents(): CommunityEvent[] {
  return [...events].sort((a, b) => a.start.localeCompare(b.start));
}
