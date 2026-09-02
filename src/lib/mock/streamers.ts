/**
 * Mock-Daten für die Streamer-Seite.
 * TODO: `live`/`viewers`/`title` später über die Twitch Helix API (Get Streams) aktualisieren.
 */
export type Streamer = {
  channel: string;
  displayName: string;
  minecraftName: string;
  title: string;
  live: boolean;
  viewers: number;
  schedule: string;
};

const streamers: Streamer[] = [
  {
    channel: "vipcraft_lorenz",
    displayName: "Lorenz",
    minecraftName: "Lorenz",
    title: "Zugstrecke nach Norden – Signale verkabeln (Create 6)",
    live: true,
    viewers: 42,
    schedule: "Di & Do ab 20 Uhr",
  },
  {
    channel: "mia_builds",
    displayName: "Mia builds",
    minecraftName: "Mia_builds",
    title: "Bahnhofsviertel Detailing – chill build stream",
    live: true,
    viewers: 27,
    schedule: "So ab 16 Uhr",
  },
  {
    channel: "technotim_live",
    displayName: "TechnoTim",
    minecraftName: "TechnoTim",
    title: "Sequenced Assembly vollautomatisch",
    live: false,
    viewers: 0,
    schedule: "Mi ab 19 Uhr",
  },
  {
    channel: "kaya_plays",
    displayName: "Kaya",
    minecraftName: "Kaya",
    title: "Nether-Hub Ausbau",
    live: false,
    viewers: 0,
    schedule: "Unregelmäßig",
  },
];

export function getStreamers(): Streamer[] {
  return [...streamers].sort((a, b) => Number(b.live) - Number(a.live) || b.viewers - a.viewers);
}
