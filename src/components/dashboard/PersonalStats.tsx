"use client";

import { useEffect, useState } from "react";
import { Blocks, Clock, Cog, Gauge, Hammer, Pickaxe, RefreshCw, Skull, TrainFront, type LucideIcon } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { formatDistanceKm, formatHours, formatNumber, formatShortDate, timeAgo } from "@/lib/format";
import type { PlayerStats } from "@/lib/mock/player-stats";

type StatsResponse = { linked: false; stats: null } | { linked: true; source: string; stats: PlayerStats } | { error: string };

type Tile = { icon: LucideIcon; label: string; value: string; hint?: string };

function buildTiles(stats: PlayerStats): Tile[] {
  return [
    { icon: Clock, label: "Spielzeit", value: formatHours(stats.playtimeHours) },
    { icon: Pickaxe, label: "Blöcke abgebaut", value: formatNumber(stats.blocksMined) },
    { icon: Blocks, label: "Blöcke platziert", value: formatNumber(stats.blocksPlaced) },
    { icon: Hammer, label: "Eisen abgebaut", value: formatNumber(stats.ironMined) },
    { icon: Skull, label: "Tode", value: formatNumber(stats.deaths), hint: `davon ${stats.lavaDeaths} durch Lava` },
    { icon: TrainFront, label: "Zug-Kilometer", value: formatDistanceKm(stats.trainDistanceKm) },
    { icon: Cog, label: "Andesit-Legierung", value: formatNumber(stats.andesiteAlloyCrafted) },
    { icon: Gauge, label: "Peak Stress", value: `${formatNumber(stats.peakStressUnits)} SU` },
  ];
}

/** Persönliche Ingame-Statistiken – geladen über die Mock-API /api/stats/me. */
export function PersonalStats() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loading = data === null;

  useEffect(() => {
    let cancelled = false;

    fetch("/api/stats/me", { cache: "no-store" })
      .then(async (res) => (await res.json()) as StatsResponse)
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData({ error: "Statistiken konnten nicht geladen werden." });
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function reload() {
    setData(null);
    setReloadKey((k) => k + 1);
  }

  return (
    <Panel rivets className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Deine Stats</p>
          <h2 className="mt-1 text-xl font-bold text-cream">Persönliche Statistiken</h2>
        </div>
        <button type="button" onClick={reload} className="btn btn-ghost btn-sm" title="Neu laden" disabled={loading}>
          <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
        </button>
      </div>

      <div className="mt-5 flex-1">
        {data === null ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : "error" in data ? (
          <p className="text-sm text-rose-300">{data.error}</p>
        ) : !data.linked ? (
          <div className="rounded-lg border border-dashed border-brass-500/40 bg-black/20 p-6 text-center text-sm text-cream/65">
            Verknüpfe zuerst deinen Minecraft-Gamertag im Profil, dann erscheinen hier deine Ingame-Statistiken.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {buildTiles(data.stats).map((tile) => {
                const Icon = tile.icon;
                return (
                  <div key={tile.label} className="rounded-lg border border-white/5 bg-black/20 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] tracking-wider text-cream/50 uppercase">
                      <Icon className="size-3.5 text-brass-300" />
                      {tile.label}
                    </div>
                    <p className="mt-1.5 font-display text-lg leading-none font-bold text-cream">{tile.value}</p>
                    {tile.hint && <p className="mt-1 text-[11px] text-cream/45">{tile.hint}</p>}
                  </div>
                );
              })}
            </div>
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-cream/55">
              <div>
                <dt className="inline">Serverrang: </dt>
                <dd className="inline font-semibold text-cream/80">#{data.stats.rank}</dd>
              </div>
              <div>
                <dt className="inline">Erster Login: </dt>
                <dd className="inline text-cream/80">{formatShortDate(data.stats.firstJoined)}</dd>
              </div>
              <div>
                <dt className="inline">Zuletzt online: </dt>
                <dd className="inline text-cream/80">{timeAgo(data.stats.lastSeen)}</dd>
              </div>
              <div className="ml-auto tracking-wider uppercase">Quelle: {data.source} · später Plan-Plugin</div>
            </dl>
          </>
        )}
      </div>
    </Panel>
  );
}
