import { getTranslations } from "next-intl/server";
import type { CommunityEvent } from "@/lib/event-kinds";
import { countdownEvent, eigeneEvents } from "@/lib/events";

/**
 * Der Event-Kalender.
 *
 * Zwei Quellen, die beim Abruf zusammenlaufen:
 *
 * ▸ Die Liste unten, fest im Code. Ihre Texte stehen übersetzt in den
 *   Sprachdateien (Namespace "Events", verschachtelt unter der jeweiligen
 *   `id`), und der Serverstart hängt an einem dieser Einträge – deshalb
 *   bleibt sie, statt in die Datenbank zu wandern.
 * ▸ Die selbst angelegten Termine aus dem Kontrollraum (lib/events.ts).
 *
 * Ausgedachte Einträge stehen hier keine: Was drinsteht, findet wirklich statt.
 */

/*
 * Arten und Form eines Termins stehen in event-kinds.ts – ohne Imports, damit
 * auch das Formular im Kontrollraum (Client) sie benutzen kann. Hier nur
 * weitergereicht, damit die bisherigen Importe weiter stimmen.
 */
export { EVENT_TYPES, istEventType, type CommunityEvent, type EventType } from "@/lib/event-kinds";

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
  const [ausCode, ausDatenbank] = await Promise.all([Promise.all(events.map(mitText)), eigeneEvents()]);

  return [...ausCode, ...ausDatenbank]
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
  /** Die Uhrzeit, mit der die Seite gebaut wurde – siehe ServerCountdown. */
  jetzt: number;
  /** Worauf gewartet wird, für die Beschriftung. */
  titel: string;
  ort: string;
};

/**
 * Alles, was der Countdown auf der Startseite braucht – oder `null`, wenn
 * gerade kein Termin dafür vorgemerkt ist.
 *
 * Welcher Termin es ist, entscheidet der Haken „Countdown auf der Startseite"
 * im Kontrollraum; bei mehreren gewinnt der nächste. Einen Tag lang bleibt er
 * danach stehen, damit Nachzügler noch sehen, dass es losgegangen ist – danach
 * verschwindet der Abschnitt von selbst.
 *
 * Die aktuelle Uhrzeit wird bewusst hier geholt und nicht in der Seite: Ein
 * `Date.now()` mitten im Rendern ist unrein, und React beanstandet das zu
 * Recht – das Ergebnis würde sich bei jedem erneuten Rendern ändern.
 */
export async function getServerStartCountdown(): Promise<StartCountdown | null> {
  const jetzt = Date.now();
  const termin = await countdownEvent(new Date(jetzt));
  if (!termin) return null;

  return { zielIso: termin.start, jetzt, titel: termin.title, ort: termin.location };
}

/** Alle Termine, auch vergangene. */
export async function getAllEvents(): Promise<CommunityEvent[]> {
  const [ausCode, ausDatenbank] = await Promise.all([Promise.all(events.map(mitText)), eigeneEvents()]);
  return [...ausCode, ...ausDatenbank].sort((a, b) => a.start.localeCompare(b.start));
}
