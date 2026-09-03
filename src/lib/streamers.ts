import "server-only";
import { prisma } from "@/lib/prisma";
import { getTwitchChannels, twitchConfigured } from "@/lib/twitch";

export type Streamer = {
  userId: string;
  /** Twitch-Login (kleingeschrieben, Teil der Kanal-URL). */
  channel: string;
  /** Anzeigename bei Twitch, sonst der Discord-Name. */
  displayName: string;
  minecraftName: string | null;
  /** Profilbild von Twitch, sonst das Discord-Bild. */
  avatarUrl: string | null;
  live: boolean;
  viewers: number;
  title: string | null;
  gameName: string | null;
  startedAt: string | null;
};

export type StreamerList = {
  streamers: Streamer[];
  /** false = keine Twitch-Zugangsdaten hinterlegt, Live-Status ist unbekannt. */
  liveStatusAvailable: boolean;
};

/**
 * Alle verknüpften Twitch-Kanäle mit ihrem aktuellen Live-Status.
 * Die Kanäle stammen aus den Profilen, der Live-Status aus der Twitch-API.
 */
export async function getStreamers(): Promise<StreamerList> {
  const users = await prisma.user.findMany({
    where: { twitchName: { not: null } },
    select: { id: true, name: true, image: true, minecraftName: true, twitchName: true },
    orderBy: { name: "asc" },
  });

  const logins = users.map((u) => u.twitchName!).filter(Boolean);
  const channels = await getTwitchChannels(logins);

  const streamers = users.map<Streamer>((user) => {
    const login = user.twitchName!.toLowerCase();
    const info = channels.get(login);

    return {
      userId: user.id,
      channel: login,
      displayName: info?.displayName ?? user.name ?? user.twitchName!,
      minecraftName: user.minecraftName,
      avatarUrl: info?.profileImageUrl ?? user.image,
      live: info?.live ?? false,
      viewers: info?.viewers ?? 0,
      title: info?.title ?? null,
      gameName: info?.gameName ?? null,
      startedAt: info?.startedAt ?? null,
    };
  });

  streamers.sort((a, b) => Number(b.live) - Number(a.live) || b.viewers - a.viewers || a.displayName.localeCompare(b.displayName));

  return { streamers, liveStatusAvailable: twitchConfigured };
}

/** Nur die Streamer, die gerade senden – für den Teaser auf der Startseite. */
export async function getLiveStreamers(): Promise<Streamer[]> {
  const { streamers } = await getStreamers();
  return streamers.filter((s) => s.live);
}
