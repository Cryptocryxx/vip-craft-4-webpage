import { Coins, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { COINS, formatCogs, formatCogsLong, formatSpurs, SPURS_PER_COG } from "@/lib/currency";
import type { EconomyOverview as EconomyOverviewData } from "@/lib/economy-types";
import { formatNumber } from "@/lib/format";

type Props = {
  data: EconomyOverviewData;
  source: "live" | "unavailable";
};

export function EconomyOverview({ data, source }: Props) {
  const { summary, richest } = data;

  if (source !== "live" || richest.length === 0) {
    return (
      <Panel className="p-10 text-center">
        <Coins className="mx-auto size-10 text-brass-500/40" />
        <p className="mt-3 font-display text-lg font-bold text-cream">Noch keine Kontodaten</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-cream/60">
          Sobald auf dem Server die ersten Numismatics-Konten Guthaben haben, stehen hier der Umlauf und die reichsten
          Spieler.
        </p>
      </Panel>
    );
  }

  const tiles = [
    { label: "Im Umlauf", value: formatCogsLong(summary.totalCirculationSpurs), icon: Coins },
    { label: "Konten", value: formatNumber(summary.accountCount), icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Panel key={tile.label} className="flex items-center gap-4 p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-brass-500/40 bg-brass-500/10 text-brass-200">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-xs tracking-wider text-cream/50 uppercase">{tile.label}</p>
                <p className="mt-0.5 font-display text-xl font-bold text-cream">{tile.value}</p>
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 bg-black/20 px-5 py-3">
          <h3 className="font-display text-sm font-bold tracking-wide text-brass-200 uppercase">Reichste Spieler</h3>
          <Badge tone="brass">Cog</Badge>
        </div>
        <ol>
          {richest.map((entry) => (
            <li key={entry.player} className="flex items-center gap-3 border-t border-white/5 px-5 py-3 first:border-t-0">
              <span className="w-5 font-display text-sm font-bold text-cream/50">{entry.rank}</span>
              <PlayerHead name={entry.player} size={28} />
              <span className="flex-1 truncate font-semibold text-cream">{entry.player}</span>
              <span className="font-mono text-sm text-cream" title={formatSpurs(entry.balanceSpurs)}>
                {formatCogs(entry.balanceSpurs)}
              </span>
            </li>
          ))}
        </ol>
        <div className="border-t border-white/5 bg-black/15 px-5 py-3 text-xs leading-relaxed text-cream/50">
          <p>
            Gerechnet wird in <span className="text-cream/80">Cog</span> – ein Cog sind {SPURS_PER_COG} Spurs.
          </p>
          <p className="mt-1">
            Münzen:{" "}
            {COINS.map((coin, index) => (
              <span key={coin.name}>
                {index > 0 && " · "}
                <span className="text-cream/70">{coin.name}</span> = {formatNumber(coin.spurs)}
              </span>
            ))}
          </p>
        </div>
        <p className="border-t border-white/5 bg-black/15 px-5 py-2 text-[10px] tracking-wider text-cream/35 uppercase">
          Quelle: Bankkonten des Servers
        </p>
      </Panel>
    </div>
  );
}
