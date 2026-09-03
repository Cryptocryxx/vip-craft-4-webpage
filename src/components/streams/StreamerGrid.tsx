import Image from "next/image";
import { AlertTriangle, ExternalLink, Eye, Gamepad2, Radio, Tv } from "lucide-react";
import { TwitchEmbed } from "@/components/streams/TwitchEmbed";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConsentGate } from "@/components/ui/ConsentGate";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TwitchIcon } from "@/components/ui/TwitchIcon";
import type { Streamer, StreamerList } from "@/lib/streamers";

function twitchUrl(channel: string) {
  return `https://www.twitch.tv/${encodeURIComponent(channel)}`;
}

function StreamerAvatar({ streamer, size }: { streamer: Streamer; size: number }) {
  if (streamer.avatarUrl) {
    return (
      <Image
        src={streamer.avatarUrl}
        alt=""
        width={size}
        height={size}
        className="rounded-full ring-1 ring-brass-500/40"
      />
    );
  }
  if (streamer.minecraftName) {
    return <PlayerHead name={streamer.minecraftName} size={size} />;
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-brass-500/20 text-brass-200"
    >
      <Tv className="size-4" />
    </span>
  );
}

export function StreamerGrid({ data }: { data: StreamerList }) {
  const { streamers, liveStatusAvailable } = data;
  const live = streamers.filter((s) => s.live);
  const offline = streamers.filter((s) => !s.live);

  if (streamers.length === 0) {
    return (
      <Panel variant="blueprint" className="p-10 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-diamond-300/50 bg-diamond-950 text-diamond-200">
          <Tv className="size-6" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-cream">Noch kein Kanal verknüpft</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-cream/65">
          Sobald jemand seinen Twitch-Kanal im Dashboard hinterlegt, taucht er hier auf – und sein Stream erscheint
          automatisch, wenn er live geht.
        </p>
        <Button href="/dashboard" className="mt-6">
          <TwitchIcon className="size-4" /> Kanal verknüpfen
        </Button>
      </Panel>
    );
  }

  return (
    <div className="space-y-16">
      {!liveStatusAvailable && (
        <div className="flex items-start gap-2.5 rounded-xl border border-brass-400/40 bg-brass-500/10 p-4 text-sm text-brass-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            Der Live-Status kann nicht abgefragt werden, weil noch keine Twitch-Zugangsdaten hinterlegt sind. Trage{" "}
            <code className="font-mono">TWITCH_CLIENT_ID</code> und <code className="font-mono">TWITCH_CLIENT_SECRET</code>{" "}
            in der <code className="font-mono">.env</code> ein. Die Kanäle werden bis dahin als offline angezeigt.
          </p>
        </div>
      )}

      <section>
        <SectionHeading
          eyebrow="Jetzt live"
          icon={Radio}
          title={
            live.length > 0
              ? `${live.length} ${live.length === 1 ? "Stream" : "Streams"} live vom Server`
              : "Gerade streamt niemand"
          }
          description="Aus Datenschutzgründen lädt der Twitch-Player erst, wenn du ihn anforderst – danach startet er stumm."
        />
        {live.length === 0 ? (
          <Panel className="p-12 text-center text-cream/60">
            Aktuell ist niemand live. Schau später wieder vorbei oder folge den Kanälen unten.
          </Panel>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {live.map((streamer) => (
              <Panel key={streamer.channel} rivets className="overflow-hidden">
                <div className="m-1.5 overflow-hidden rounded-lg border border-white/10 bg-black">
                  <ConsentGate
                    category="twitch"
                    provider="Twitch"
                    description="Beim Laden des Players werden deine IP-Adresse und Angaben zu deinem Browser an Twitch übertragen. Twitch kann dabei Cookies setzen. Deine Entscheidung merken wir uns lokal in deinem Browser."
                    privacyUrl="https://www.twitch.tv/p/legal/privacy-notice/"
                  >
                    <TwitchEmbed channel={streamer.channel} title={`Twitch-Stream von ${streamer.displayName}`} />
                  </ConsentGate>
                </div>
                <div className="p-4 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="rose">
                      <span className="size-1.5 animate-pulse-soft rounded-full bg-rose-300" /> Live
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-cream/60">
                      <Eye className="size-3.5" /> {streamer.viewers} Zuschauer
                    </span>
                    {streamer.gameName && (
                      <span className="inline-flex items-center gap-1 text-xs text-cream/60">
                        <Gamepad2 className="size-3.5" /> {streamer.gameName}
                      </span>
                    )}
                  </div>
                  {streamer.title && (
                    <h3 className="mt-2 line-clamp-2 text-lg leading-snug font-bold text-cream">{streamer.title}</h3>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm">
                      <StreamerAvatar streamer={streamer} size={24} />
                      <span className="truncate font-semibold text-cream">{streamer.displayName}</span>
                      {streamer.minecraftName && (
                        <span className="hidden truncate font-mono text-xs text-cream/45 sm:inline">
                          {streamer.minecraftName}
                        </span>
                      )}
                    </div>
                    <a
                      href={twitchUrl(streamer.channel)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm shrink-0"
                    >
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
          eyebrow="Alle Kanäle"
          icon={Tv}
          title="Die Sendeplätze des Servers"
          description="Alle verknüpften Twitch-Kanäle aus der Community. Folge ihnen, dann verpasst du keinen Absturz."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...live, ...offline].map((streamer) => (
            <Panel key={streamer.channel} className="flex flex-col p-4">
              <div className="flex items-center gap-3">
                <StreamerAvatar streamer={streamer} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-display font-bold text-cream">{streamer.displayName}</p>
                  <p className="truncate font-mono text-xs text-cream/50">twitch.tv/{streamer.channel}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {streamer.live ? <Badge tone="rose">Live</Badge> : <Badge tone="neutral">Offline</Badge>}
                {streamer.minecraftName && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-cream/60">
                    <PlayerHead name={streamer.minecraftName} size={16} />
                    {streamer.minecraftName}
                  </span>
                )}
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
