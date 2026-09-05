import { getTranslations } from "next-intl/server";

/**
 * Der Event-Kalender.
 *
 * Die Termine werden hier von Hand gepflegt – eine Datenbank oder ein Sync mit
 * den Discord-Events gibt es noch nicht. Ausgedachte Einträge stehen hier keine:
 * Was drinsteht, findet wirklich statt.
 *
 * Titel und Beschreibung stehen in den Übersetzungen (Namespace "Events",
 * verschachtelt unter der jeweiligen `id`) statt fest im Array unten – nur so
 * bekommt ein echtes, im Code gepflegtes Ereignis auch eine englische Fassung.
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

/** Wie die rohen Daten unten, nur ohne Titel/Beschreibung – die kommen erst beim Abruf dazu. */
type EventSeed = Omit<CommunityEvent, "title" | "description">;

const events: EventSeed[] = [
  {
    id: "season4-start",
    start: "2026-09-06T15:00:00+02:00",
    location: "Spawn",
    host: "Team",
    type: "party",
  },
];

async function mitText(seed: EventSeed): Promise<CommunityEvent> {
  const t = await getTranslations("Events");
  return {
    ...seed,
    title: t(`${seed.id}.title`),
    description: t(`${seed.id}.description`),
  };
}

/** Alle Termine, die noch bevorstehen – nächster zuerst. */
export async function getUpcomingEvents(now: Date = new Date()): Promise<CommunityEvent[]> {
  const kommend = events
    .filter((event) => new Date(event.end ?? event.start).getTime() >= now.getTime())
    .sort((a, b) => a.start.localeCompare(b.start));
  return Promise.all(kommend.map(mitText));
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
 *
 * Keinen Titel mehr im Rückgabewert: ServerCountdown texted sich selbst, den
 * Titel des Kalendereintrags hat ohnehin nie jemand angezeigt.
 */
export function getServerStartCountdown(): StartCountdown | null {
  const jetzt = Date.now();
  const start = events.find((event) => event.id === "season4-start");
  if (!start) return null;

  const einTag = 24 * 60 * 60 * 1000;
  if (jetzt - new Date(start.start).getTime() > einTag) return null;

  return { zielIso: start.start, jetzt };
}

/** Alle Termine, auch vergangene. */
export async function getAllEvents(): Promise<CommunityEvent[]> {
  const sortiert = [...events].sort((a, b) => a.start.localeCompare(b.start));
  return Promise.all(sortiert.map(mitText));
}
