import "server-only";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { istEventType, type CommunityEvent, type EventType } from "@/lib/event-kinds";

/**
 * Termine aus der Datenbank – die, die im Kontrollraum angelegt werden.
 *
 * Die fest im Code stehenden Termine (lib/event-types.ts) bleiben daneben
 * bestehen: Ihre Texte liegen übersetzt in den Sprachdateien, und der
 * Serverstart hängt an einem davon. Zusammengeführt wird beim Abruf.
 */

export type EventEingabe = {
  title: string;
  description: string;
  titleEn: string | null;
  descriptionEn: string | null;
  start: Date;
  end: Date | null;
  location: string;
  host: string;
  type: EventType;
  countdown: boolean;
};

type EventZeile = {
  id: string;
  title: string;
  description: string;
  titleEn: string | null;
  descriptionEn: string | null;
  start: Date;
  end: Date | null;
  location: string;
  host: string;
  type: string;
  countdown: boolean;
};

/**
 * Eine Zeile in der Form, die die Seiten erwarten.
 *
 * Auf Englisch wird die englische Fassung genommen, falls es eine gibt –
 * sonst die deutsche. Ein halb übersetzter Termin ist besser als ein leerer.
 */
function alsCommunityEvent(zeile: EventZeile, englisch: boolean): CommunityEvent {
  return {
    id: zeile.id,
    title: (englisch && zeile.titleEn) || zeile.title,
    description: (englisch && zeile.descriptionEn) || zeile.description,
    start: zeile.start.toISOString(),
    ...(zeile.end ? { end: zeile.end.toISOString() } : {}),
    location: zeile.location,
    host: zeile.host,
    type: istEventType(zeile.type) ? zeile.type : "meeting",
  };
}

/** Alle selbst angelegten Termine, für die öffentlichen Seiten. */
export async function eigeneEvents(): Promise<CommunityEvent[]> {
  const [zeilen, locale] = await Promise.all([
    prisma.event.findMany({ orderBy: { start: "asc" } }),
    getLocale(),
  ]);
  const englisch = locale === "en";
  return zeilen.map((zeile) => alsCommunityEvent(zeile, englisch));
}

/** Der Termin, der den Countdown auf der Startseite treibt – oder null. */
export async function countdownEvent(now: Date = new Date()): Promise<CommunityEvent | null> {
  // Einen Tag nach dem Start bleibt er noch stehen, damit Nachzügler sehen,
  // dass es losgegangen ist (dieselbe Frist wie bisher im Code).
  const einTag = 24 * 60 * 60 * 1000;

  const [zeile, locale] = await Promise.all([
    prisma.event.findFirst({
      where: { countdown: true, start: { gte: new Date(now.getTime() - einTag) } },
      orderBy: { start: "asc" },
    }),
    getLocale(),
  ]);

  return zeile ? alsCommunityEvent(zeile, locale === "en") : null;
}

// ---------------------------------------------------------------------------
// Kontrollraum
// ---------------------------------------------------------------------------

/** Alle Termine für die Verwaltung – ohne Sprachauswahl, beide Fassungen. */
export async function alleEventsRoh(): Promise<EventZeile[]> {
  return prisma.event.findMany({ orderBy: { start: "desc" } });
}

export async function findeEvent(id: string): Promise<EventZeile | null> {
  return prisma.event.findUnique({ where: { id } });
}

export async function legeEventAn(eingabe: EventEingabe): Promise<string> {
  const zeile = await prisma.event.create({ data: eingabe, select: { id: true } });
  return zeile.id;
}

export async function aendereEvent(id: string, eingabe: EventEingabe): Promise<void> {
  await prisma.event.update({ where: { id }, data: eingabe });
}

export async function loescheEvent(id: string): Promise<void> {
  await prisma.event.delete({ where: { id } });
}
