import { Bomb, Cog, Flag, Flame, TrainFront, Users, type LucideIcon } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { formatDate } from "@/lib/format";
import type { Milestone, MilestoneKind } from "@/lib/timeline-types";
import { cn } from "@/lib/utils";

const kindIcon: Record<MilestoneKind, LucideIcon> = {
  launch: Flag,
  build: Cog,
  train: TrainFront,
  disaster: Bomb,
  nether: Flame,
  community: Users,
};

const kindStyle: Record<MilestoneKind, string> = {
  launch: "border-diamond-400/60 bg-diamond-950 text-diamond-200 shadow-glow-diamond",
  build: "border-brass-500/60 bg-wood-950 text-brass-200",
  train: "border-brass-500/60 bg-wood-950 text-brass-200",
  disaster: "border-rose-400/60 bg-rose-950/60 text-rose-200",
  nether: "border-copper-400/60 bg-wood-950 text-copper-400",
  community: "border-emerald-400/60 bg-emerald-950/60 text-emerald-200",
};

/** Vertikaler Zeitstrahl – "Die Lore" des Servers. */
export function Timeline({ milestones }: { milestones: Milestone[] }) {
  const sorted = [...milestones].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    return (
      <Panel className="p-10 text-center text-cream/60">
        Die Chronik ist noch leer. Sobald jemand etwas gebaut hat, das in die Geschichtsbücher gehört – oder etwas
        spektakulär in die Luft geflogen ist – steht es hier.
      </Panel>
    );
  }

  return (
    <ol className="relative space-y-8 pl-14 before:absolute before:top-2 before:bottom-2 before:left-[22px] before:w-px before:bg-linear-to-b before:from-diamond-400 before:via-brass-500/60 before:to-transparent">
      {sorted.map((milestone) => {
        const Icon = kindIcon[milestone.kind];
        return (
          <li key={milestone.id} className="relative">
            <span
              className={cn(
                "absolute top-1 -left-14 flex size-11 items-center justify-center rounded-full border-2",
                kindStyle[milestone.kind],
              )}
            >
              <Icon className="size-5" />
            </span>
            <div className="panel p-5">
              <time dateTime={milestone.date} className="eyebrow text-[10px]">
                {formatDate(milestone.date)}
              </time>
              <h3 className="mt-1 text-lg font-bold text-cream">{milestone.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cream/65">{milestone.description}</p>
              {milestone.players && milestone.players.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {milestone.players.map((player) => (
                    <span
                      key={player}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/20 py-0.5 pr-2 pl-0.5 text-xs text-cream/80"
                    >
                      <PlayerHead name={player} size={18} />
                      {player}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
