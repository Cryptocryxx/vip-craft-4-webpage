import { Coins, MapPin, Minus, Store, TrendingDown, TrendingUp, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { formatNumber } from "@/lib/format";
import type { EconomyOverview as EconomyOverviewData } from "@/lib/mock/economy";
import { cn } from "@/lib/utils";

function Trend({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-cream/40">
        <Minus className="size-3" /> ±0
      </span>
    );
  }
  const up = value > 0;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", up ? "text-emerald-300" : "text-rose-300")}>
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? "+" : ""}
      {formatNumber(value)}
    </span>
  );
}

export function EconomyOverview({ data }: { data: EconomyOverviewData }) {
  const { summary, richest, shops, currency } = data;

  const tiles = [
    { label: "Im Umlauf", value: `${formatNumber(summary.totalCirculation)} ${currency.plural}`, icon: Coins },
    { label: "Transaktionen (24 h)", value: formatNumber(summary.transactions24h), icon: ArrowLeftRight },
    { label: "Aktive Shops", value: String(summary.activeShops), icon: Store },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Reichste Spieler */}
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 bg-black/20 px-5 py-3">
            <h3 className="font-display text-sm font-bold tracking-wide text-brass-200 uppercase">Reichste Spieler</h3>
            <Badge tone="brass">{currency.plural}</Badge>
          </div>
          <ol>
            {richest.map((entry) => (
              <li key={entry.player} className="flex items-center gap-3 border-t border-white/5 px-5 py-3 first:border-t-0">
                <span className="w-5 font-display text-sm font-bold text-cream/50">{entry.rank}</span>
                <PlayerHead name={entry.player} size={28} />
                <span className="flex-1 truncate font-semibold text-cream">{entry.player}</span>
                <span className="text-right">
                  <span className="block font-mono text-sm text-cream">{formatNumber(entry.balance)}</span>
                  <Trend value={entry.change24h} />
                </span>
              </li>
            ))}
          </ol>
          <div className="border-t border-white/5 bg-black/15 px-5 py-3 text-xs text-cream/50">
            Münzen:{" "}
            {currency.coins.map((coin, index) => (
              <span key={coin.name}>
                {index > 0 && " · "}
                <span className="text-cream/70">{coin.name}</span> = {formatNumber(coin.value)}
              </span>
            ))}
          </div>
        </Panel>

        {/* Shops */}
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 bg-black/20 px-5 py-3">
            <h3 className="font-display text-sm font-bold tracking-wide text-brass-200 uppercase">Aktive Shops</h3>
            <span className="text-xs text-cream/50">{shops.length} eingetragen</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table-mech w-full">
              <thead>
                <tr>
                  <th>Shop</th>
                  <th>Angebot</th>
                  <th>Ort</th>
                  <th className="text-right">7 Tage</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((shop) => (
                  <tr key={shop.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn("size-2 shrink-0 rounded-full", shop.open ? "bg-emerald-400" : "bg-rose-400")}
                          title={shop.open ? "Geöffnet" : "Geschlossen"}
                        />
                        <div>
                          <p className="font-semibold text-cream">{shop.name}</p>
                          <p className="text-xs text-cream/50">von {shop.owner}</p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-56 text-cream/75">{shop.sells.join(", ")}</td>
                    <td className="whitespace-nowrap text-cream/75">
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        <MapPin className="size-3 text-brass-300" />
                        {shop.location.x} / {shop.location.z}
                        {shop.location.dimension === "nether" && <Badge tone="copper">Nether</Badge>}
                      </span>
                    </td>
                    <td className="text-right font-mono text-cream/90">{formatNumber(shop.sales7d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
