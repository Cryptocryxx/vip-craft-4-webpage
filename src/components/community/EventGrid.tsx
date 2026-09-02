import { Clock, GraduationCap, MapPin, PartyPopper, Skull, TrainFront, Trophy, User, Users, type LucideIcon } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { eventTypeLabels, type EventType, type ServerEvent } from "@/lib/mock/events";
import { formatTime, relativeDays } from "@/lib/format";

const typeIcon: Record<EventType, LucideIcon> = {
  race: TrainFront,
  contest: Trophy,
  boss: Skull,
  workshop: GraduationCap,
  meeting: Users,
  party: PartyPopper,
};

const typeTone: Record<EventType, BadgeTone> = {
  race: "diamond",
  contest: "brass",
  boss: "rose",
  workshop: "emerald",
  meeting: "wood",
  party: "copper",
};

const dayFormatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", timeZone: "Europe/Berlin" });
const monthFormatter = new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "Europe/Berlin" });
const weekdayFormatter = new Intl.DateTimeFormat("de-DE", { weekday: "long", timeZone: "Europe/Berlin" });

export function EventGrid({ events, now }: { events: ServerEvent[]; now: Date }) {
  if (events.length === 0) {
    return (
      <Panel className="p-10 text-center text-cream/60">
        Gerade sind keine Events geplant – schau im Discord vorbei, dort entstehen die nächsten.
      </Panel>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {events.map((event, index) => {
        const Icon = typeIcon[event.type];
        const start = new Date(event.start);
        const isNext = index === 0;

        return (
          <Panel
            key={event.id}
            rivets
            className={isNext ? "flex flex-col p-5 ring-1 ring-diamond-400/40 shadow-glow-diamond" : "flex flex-col p-5"}
          >
            <div className="flex items-start gap-4">
              <div className="flex w-16 shrink-0 flex-col items-center rounded-lg border border-brass-500/40 bg-wood-950/70 py-2 font-display">
                <span className="text-[10px] tracking-widest text-brass-300 uppercase">{monthFormatter.format(start).replace(".", "")}</span>
                <span className="text-2xl leading-none font-bold text-cream">{dayFormatter.format(start)}</span>
                <span className="mt-1 text-[10px] text-cream/50">{weekdayFormatter.format(start).slice(0, 2)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={typeTone[event.type]}>
                    <Icon className="size-3" /> {eventTypeLabels[event.type]}
                  </Badge>
                  {isNext && <Badge tone="diamond">Als Nächstes</Badge>}
                </div>
                <h3 className="mt-2 text-lg leading-snug font-bold text-cream">{event.title}</h3>
              </div>
            </div>

            <p className="mt-4 flex-1 text-sm leading-relaxed text-cream/65">{event.description}</p>

            <dl className="mt-4 grid grid-cols-1 gap-1.5 border-t border-white/5 pt-4 text-xs text-cream/70">
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-brass-300" />
                <dt className="sr-only">Zeit</dt>
                <dd>
                  {relativeDays(start, now)} · {formatTime(start)}
                  {event.end ? ` – ${formatTime(event.end)}` : ""}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5 text-brass-300" />
                <dt className="sr-only">Ort</dt>
                <dd>{event.location}</dd>
              </div>
              <div className="flex items-center gap-2">
                <User className="size-3.5 text-brass-300" />
                <dt className="sr-only">Host</dt>
                <dd>Host: {event.host}</dd>
              </div>
            </dl>
          </Panel>
        );
      })}
    </div>
  );
}
