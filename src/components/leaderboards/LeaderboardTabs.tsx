"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  Blocks,
  Bomb,
  Clock,
  Cog,
  Crown,
  Flame,
  Pickaxe,
  Skull,
  TrainFront,
  type LucideIcon,
} from "lucide-react";
import { PlayerHead } from "@/components/ui/PlayerHead";
import type { Leaderboard, LeaderboardIcon } from "@/lib/mock/leaderboards";
import { cn } from "@/lib/utils";

const icons: Record<LeaderboardIcon, LucideIcon> = {
  clock: Clock,
  pickaxe: Pickaxe,
  blocks: Blocks,
  train: TrainFront,
  cog: Cog,
  flame: Flame,
  bomb: Bomb,
  skull: Skull,
  "arrow-down": ArrowDownToLine,
};

const rankStyle: Record<number, string> = {
  1: "text-brass-200",
  2: "text-slate-300",
  3: "text-copper-400",
};

export function LeaderboardTabs({ boards, tone }: { boards: Leaderboard[]; tone: "fame" | "shame" }) {
  const [activeId, setActiveId] = useState(boards[0]?.id);
  const active = boards.find((b) => b.id === activeId) ?? boards[0];

  if (!active) return null;

  const ActiveIcon = icons[active.icon];
  const accent = tone === "fame" ? "brass" : "rose";

  return (
    <div className="panel overflow-hidden">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-white/5 bg-black/20 p-2" role="tablist" aria-label="Kategorien">
        {boards.map((board) => {
          const Icon = icons[board.icon];
          const selected = board.id === active.id;
          return (
            <button
              key={board.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setActiveId(board.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 font-display text-xs font-semibold tracking-wide whitespace-nowrap transition-colors",
                selected
                  ? accent === "brass"
                    ? "border border-brass-500/50 bg-brass-500/15 text-brass-100"
                    : "border border-rose-400/50 bg-rose-500/15 text-rose-100"
                  : "border border-transparent text-cream/60 hover:bg-white/5 hover:text-cream",
              )}
            >
              <Icon className="size-3.5" />
              {board.title}
            </button>
          );
        })}
      </div>

      {/* Inhalt */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-x-auto">
          <table className="table-mech w-full">
            <thead>
              <tr>
                <th className="w-16">#</th>
                <th>Spieler</th>
                <th className="text-right">{active.unit}</th>
              </tr>
            </thead>
            <tbody>
              {active.entries.map((entry) => (
                <tr key={entry.player}>
                  <td className={cn("font-display text-base font-bold", rankStyle[entry.rank] ?? "text-cream/50")}>
                    <span className="inline-flex items-center gap-1">
                      {entry.rank === 1 && <Crown className="size-4" />}
                      {entry.rank}
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-3 font-semibold text-cream">
                      <PlayerHead name={entry.player} size={28} />
                      {entry.player}
                    </span>
                  </td>
                  <td className="text-right font-mono text-cream/90">{entry.display}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="border-t border-white/5 bg-black/15 p-5 lg:border-t-0 lg:border-l">
          <span
            className={cn(
              "flex size-12 items-center justify-center rounded-lg border",
              accent === "brass" ? "border-brass-500/40 bg-brass-500/10 text-brass-200" : "border-rose-400/40 bg-rose-500/10 text-rose-200",
            )}
          >
            <ActiveIcon className="size-6" />
          </span>
          <h3 className="mt-4 text-lg font-bold text-cream">{active.title}</h3>
          <p className="mt-1 text-sm text-cream/60">{active.description}</p>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between border-t border-white/5 pt-2">
              <dt className="text-cream/50">Spitzenreiter</dt>
              <dd className="font-semibold text-cream">{active.entries[0]?.player}</dd>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-2">
              <dt className="text-cream/50">Bestwert</dt>
              <dd className="font-mono text-cream">{active.entries[0]?.display}</dd>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-2">
              <dt className="text-cream/50">Gewertet</dt>
              <dd className="text-cream">{active.entries.length} Spieler</dd>
            </div>
          </dl>
          <p className="mt-5 text-[10px] tracking-wider text-cream/35 uppercase">Quelle: Mock-API · später Plan-Plugin</p>
        </aside>
      </div>
    </div>
  );
}
