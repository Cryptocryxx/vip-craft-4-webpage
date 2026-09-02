import { CalendarClock, Eye, ExternalLink, Radio } from "lucide-react";
import { TwitchEmbed } from "@/components/streams/TwitchEmbed";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TwitchIcon } from "@/components/ui/TwitchIcon";
import type { Streamer } from "@/lib/mock/streamers";

function twitchUrl(channel: string) {
  return `https://www.twitch.tv/${encodeURIComponent(channel)}`;
}

export function StreamerGrid({ streamers }: { streamers: Streamer[] }) {
  const live = streamers.filter((s) => s.live);
  const offline = streamers.filter((s) => !s.live);

  return (
    <div className="space-y-16">
      <section>
        <SectionHeading
          eyebrow="Jetzt live"
          icon={Radio}
          title={live.length > 0 ? `${live.length} ${live.length === 1 ? "Stream" : "Streams"} live vom Server` : "Gerade streamt niemand"}
          description="Streams laufen direkt hier auf der Seite – stumm geschaltet, bis du auf Play drückst."
        />
        {live.length === 0 ? (
          <Panel className="p-12 text-center text-cream/60">
            Aktuell ist niemand live. Schau später wieder vorbei oder wirf einen Blick auf die Stream-Zeiten unten.
          </Panel>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {live.map((streamer) => (
              <Panel key={streamer.channel} rivets className="overflow-hidden">
                <div className="m-1.5 overflow-hidden rounded-lg border border-white/10 bg-black">
                  <TwitchEmbed channel={streamer.channel} title={`Twitch-Stream von ${streamer.displayName}`} />
                </div>
                <div className="p-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Badge tone="rose">
                      <span className="size-1.5 animate-pulse-soft rounded-full bg-rose-300" /> Live
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-cream/60">
                      <Eye className="size-3.5" /> {streamer.viewers} Zuschauer
                    </span>
                  </div>
                  <h3 className="mt-2 line-clamp-2 text-lg leading-snug font-bold text-cream">{streamer.title}</h3>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <PlayerHead name={streamer.minecraftName} size={24} />
                      <span className="font-semibold text-cream">{streamer.displayName}</span>
                      <span className="hidden text-xs text-cream/50 sm:inline">
                        <CalendarClock className="mr-1 inline size-3.5" />
                        {streamer.schedule}
                      </span>
                    </div>
                    <a href={twitchUrl(streamer.channel)} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      <TwitchIcon className="size-3.5" /> Twitch
                    </a>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading
          eyebrow="Alle Streamer"
          icon={TwitchIcon as unknown as typeof Radio}
          title="Die Sendeplätze des Servers"
          description="Wer wann streamt – damit du keinen Zug-Unfall live verpasst."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...live, ...offline].map((streamer) => (
            <Panel key={streamer.channel} className="flex flex-col p-4">
              <div className="flex items-center gap-3">
                <PlayerHead name={streamer.minecraftName} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-display font-bold text-cream">{streamer.displayName}</p>
                  <p className="truncate font-mono text-xs text-cream/50">twitch.tv/{streamer.channel}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {streamer.live ? <Badge tone="rose">Live</Badge> : <Badge tone="neutral">Offline</Badge>}
                <span className="text-xs text-cream/60">{streamer.schedule}</span>
              </div>
              <a
                href={twitchUrl(streamer.channel)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-brass-200 transition-colors hover:text-brass-100"
              >
                Kanal öffnen <ExternalLink className="size-3" />
              </a>
            </Panel>
          ))}
        </div>
      </section>
    </div>
  );
}
