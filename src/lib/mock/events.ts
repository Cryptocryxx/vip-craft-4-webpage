/**
 * Mock-Daten für den Event-Kalender.
 * TODO: Später aus der Datenbank / einem Discord-Event-Sync laden.
 */
export type EventType = "race" | "contest" | "boss" | "workshop" | "meeting" | "party";

export type ServerEvent = {
  id: string;
  title: string;
  description: string;
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

const events: ServerEvent[] = [
  {
    id: "season4-kickoff",
    title: "Season-4-Kickoff & Spawn-Einweihung",
    description: "Offizielle Eröffnung des neuen Spawns mit Feuerwerk, Startkits und einer Führung durch das Bahnhofsviertel.",
    start: "2026-09-05T20:00:00+02:00",
    end: "2026-09-05T22:00:00+02:00",
    location: "Spawn / Hauptbahnhof",
    host: "Team",
    type: "party",
  },
  {
    id: "zugrennen-nord",
    title: "Zugrennen: Spawn → Campus Nord",
    description: "Wer baut den schnellsten Zug? Maximal 3 Waggons, freie Wahl der Antriebe. Siegprämie: 2 Crowns.",
    start: "2026-09-12T19:00:00+02:00",
    location: "Strecke Nord (Gleis 1)",
    host: "Jonas_MC",
    type: "race",
  },
  {
    id: "buildcontest-andesit",
    title: "Build-Contest: Kompakteste Andesit-Farm",
    description: "Kleinstes Volumen bei mindestens 500 Andesit-Legierung pro Stunde. Die Jury misst mit dem Schematic-Tool nach.",
    start: "2026-09-19T18:00:00+02:00",
    end: "2026-09-19T21:00:00+02:00",
    location: "Contest-Plots (Warp: contest)",
    host: "Mia_builds",
    type: "contest",
  },
  {
    id: "wither-kartoffelkanonen",
    title: "Wither-Fight mit Kartoffelkanonen",
    description: "Ein Wither, viele Kartoffelkanonen. Rüstung ist erlaubt, Schwerter nicht. Bringt Kartoffeln mit.",
    start: "2026-09-26T20:00:00+02:00",
    location: "Arena im Nether-Hub",
    host: "Nadja",
    type: "boss",
  },
  {
    id: "create-workshop",
    title: "Uni-LAN: Create-Workshop für Einsteiger",
    description: "Von der Wasserrad-Mühle bis zur ersten Zugstrecke – gemeinsam vor Ort im Hörsaal und auf dem Server.",
    start: "2026-10-03T15:00:00+02:00",
    end: "2026-10-03T19:00:00+02:00",
    location: "Hörsaal 3 + Warp: workshop",
    host: "Lorenz",
    type: "workshop",
  },
  {
    id: "mod-abstimmung",
    title: "Community-Abstimmung: Neue Mods",
    description: "Wir gehen die Top-Vorschläge aus dem Vorschlags-Board durch und stimmen live im Discord ab.",
    start: "2026-10-10T20:00:00+02:00",
    location: "Discord Stage",
    host: "Team",
    type: "meeting",
  },
];

export function getUpcomingEvents(now: Date = new Date()): ServerEvent[] {
  return events
    .filter((e) => new Date(e.end ?? e.start).getTime() >= now.getTime())
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function getAllEvents(): ServerEvent[] {
  return [...events].sort((a, b) => a.start.localeCompare(b.start));
}
