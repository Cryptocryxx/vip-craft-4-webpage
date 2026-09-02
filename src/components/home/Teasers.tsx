import Link from "next/link";
import { ArrowRight, CalendarDays, DraftingCompass, Radio } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { formatDate, formatTime, relativeDays } from "@/lib/format";
import { eventTypeLabels, getUpcomingEvents } from "@/lib/mock/events";
import { getSchematics } from "@/lib/mock/schematics";
import { getStreamers } from "@/lib/mock/streamers";

/** Drei kleine Teaser: nächstes Event, neueste Schematic, Live-Streams. */
export function Teasers() {
  const now = new Date();
  const nextEvent = getUpcomingEvents(now)[0];
  const newestSchematic = getSchematics()[0];
  const liveStreamers = getStreamers().filter((s) => s.live);

  return (
    <section className="relative -mt-8 pb-4">
      <Container>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/community" className="group block">
            <Panel className="h-full p-5 transition-colors group-hover:border-brass-400/60">
              <p className="eyebrow">
                <CalendarDays className="size-3.5" /> Nächstes Event
              </p>
              {nextEvent ? (
                <>
                  <p className="mt-3 font-display text-lg leading-snug font-bold text-cream">{nextEvent.title}</p>
                  <p className="mt-1 text-sm text-cream/60">
                    {relativeDays(nextEvent.start, now)} · {formatDate(nextEvent.start)} · {formatTime(nextEvent.start)}
                  </p>
                  <Badge tone="diamond" className="mt-3">
                    {eventTypeLabels[nextEvent.type]}
                  </Badge>
                </>
              ) : (
                <p className="mt-3 text-sm text-cream/60">Aktuell nichts geplant.</p>
              )}
              <span className="mt-4 inline-flex items-center gap-1 text-xs text-brass-200">
                Alle Events <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Panel>
          </Link>

          <Link href="/schematics" className="group block">
            <Panel className="h-full p-5 transition-colors group-hover:border-brass-400/60">
              <p className="eyebrow">
                <DraftingCompass className="size-3.5" /> Neueste Schematic
              </p>
              {newestSchematic && (
                <>
                  <p className="mt-3 font-display text-lg leading-snug font-bold text-cream">{newestSchematic.title}</p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-cream/60">
                    <PlayerHead name={newestSchematic.author} size={18} />
                    {newestSchematic.author} · {newestSchematic.size.x}×{newestSchematic.size.y}×{newestSchematic.size.z}
                  </p>
                </>
              )}
              <span className="mt-4 inline-flex items-center gap-1 text-xs text-brass-200">
                Zur Galerie <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Panel>
          </Link>

          <Link href="/streams" className="group block">
            <Panel className="h-full p-5 transition-colors group-hover:border-brass-400/60">
              <p className="eyebrow">
                <Radio className="size-3.5" /> Live-Streams
              </p>
              <p className="mt-3 font-display text-lg leading-snug font-bold text-cream">
                {liveStreamers.length > 0
                  ? `${liveStreamers.length} ${liveStreamers.length === 1 ? "Streamer ist" : "Streamer sind"} gerade live`
                  : "Gerade niemand live"}
              </p>
              {liveStreamers.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {liveStreamers.slice(0, 4).map((s) => (
                      <PlayerHead key={s.channel} name={s.minecraftName} size={22} className="ring-2 ring-wood-900" />
                    ))}
                  </div>
                  <span className="text-sm text-cream/60">{liveStreamers.map((s) => s.displayName).join(", ")}</span>
                </div>
              )}
              <span className="mt-4 inline-flex items-center gap-1 text-xs text-brass-200">
                Streams ansehen <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Panel>
          </Link>
        </div>
      </Container>
    </section>
  );
}
