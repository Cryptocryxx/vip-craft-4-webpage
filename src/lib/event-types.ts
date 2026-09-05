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

/**
 * Wann der Server startet – oder `null`, wenn kein Start-Termin im Kalender
 * steht. Gebraucht für die Sperre davor: Bis dahin wird niemand ausser Admins
 * wirklich auf die Server-Whitelist geschrieben (siehe lib/whitelist-queue).
 */
export function serverStartZeit(): Date | null {
  const start = events.find((event) => event.id === "season4-start");
  return start ? new Date(start.start) : null;
}

export type StartCountdown = {
  zielIso: string;
  titel: string;
  /** Die Uhrzeit, mit der die Seite gebaut wurde – siehe ServerCountdown. */
  jetzt: number;
};

/**
 * Alles, was der Countdown auf der Startseite braucht – oder `null`, wenn der
 * Start lange genug her ist.
 *
 * Einen Tag lang bleibt er nach dem Start stehen, damit Nachzügler noch sehen,
 * dass es losgegangen ist. Danach verschwindet der Abschnitt von selbst; ein
 * Countdown auf ein vergangenes Datum ist nur noch Ballast.
 *
 * Die aktuelle Uhrzeit wird bewusst hier geholt und nicht in der Seite: Ein
 * `Date.now()` mitten im Rendern ist unrein, und React beanstandet das zu
 * Recht – das Ergebnis würde sich bei jedem erneuten Rendern ändern.
 */
export function getServerStartCountdown(): StartCountdown | null {
  const jetzt = Date.now();
  const start = events.find((event) => event.id === "season4-start");
  if (!start) return null;

  const einTag = 24 * 60 * 60 * 1000;
  if (jetzt - new Date(start.start).getTime() > einTag) return null;

  return { zielIso: start.start, titel: start.title, jetzt };
}

/** Alle Termine, auch vergangene. */
export function getAllEvents(): CommunityEvent[] {
  return [...events].sort((a, b) => a.start.localeCompare(b.start));
}
