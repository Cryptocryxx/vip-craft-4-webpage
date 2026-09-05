"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Blocks, Cog, Footprints, Hammer, Heart, Clock, Pickaxe, RefreshCw, Skull, Swords, Bomb, type LucideIcon } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { formatDistanceKm, formatHours, formatNumber } from "@/lib/format";

export type ServerPlayerStats = {
  player: string;
  playtimeHours: number;
  blocksMined: number;
  blocksPlaced: number;
  ironMined: number;
  deaths: number;
  mobKills: number;
  deathsByCreeper: number;
  walkedKm: number;
  andesiteAlloyCrafted: number;
  damageTaken: number;
};

/**
 * `stats` ist auch bei `linked: true` null – naemlich dann, wenn der Server noch
 * keine Statistikdatei fuer den Username hat (frisch verknuepft, noch nie online).
 * Erfundene Beispielwerte gibt es dafuer bewusst nicht mehr.
 */
type StatsResponse =
  | { linked: false; stats: null }
  | { linked: true; source: string; stats: ServerPlayerStats | null }
  | { error: string };

type Tile = { icon: LucideIcon; label: string; value: string; hint?: string };

/** Persönliche Ingame-Statistiken aus den Vanilla-Statistikdateien des Servers. */
export function PersonalStats() {
  const t = useTranslations("PersonalStats");
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
        if (!cancelled) setData({ error: t("loadError") });
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, t]);

  function reload() {
    setData(null);
    setReloadKey((k) => k + 1);
  }

  function buildTiles(stats: ServerPlayerStats): Tile[] {
    return [
      { icon: Clock, label: t("playtime"), value: formatHours(stats.playtimeHours) },
      { icon: Pickaxe, label: t("blocksMined"), value: formatNumber(stats.blocksMined) },
      { icon: Blocks, label: t("blocksPlaced"), value: formatNumber(stats.blocksPlaced), hint: t("approxValue") },
      { icon: Hammer, label: t("ironMined"), value: formatNumber(stats.ironMined) },
      { icon: Skull, label: t("deaths"), value: formatNumber(stats.deaths) },
      { icon: Bomb, label: t("deathsByCreeper"), value: formatNumber(stats.deathsByCreeper) },
      { icon: Swords, label: t("mobKills"), value: formatNumber(stats.mobKills) },
      { icon: Footprints, label: t("walkedDistance"), value: formatDistanceKm(stats.walkedKm) },
      { icon: Cog, label: t("andesiteAlloy"), value: formatNumber(stats.andesiteAlloyCrafted) },
      { icon: Heart, label: t("damageTaken"), value: `${formatNumber(stats.damageTaken)} ♥` },
    ];
  }

  return (
    <Panel rivets className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 className="mt-1 text-xl font-bold text-cream">{t("title")}</h2>
        </div>
        <button type="button" onClick={reload} className="btn btn-ghost btn-sm" title={t("reload")} disabled={loading}>
          <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
        </button>
      </div>

      <div className="mt-5 flex-1">
        {data === null ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : "error" in data ? (
          <p className="text-sm text-rose-300">{data.error}</p>
        ) : !data.linked ? (
          <div className="rounded-lg border border-dashed border-brass-500/40 bg-black/20 p-6 text-center text-sm text-cream/65">
            {t("notLinked")}
          </div>
        ) : data.stats === null ? (
          <div className="rounded-lg border border-dashed border-brass-500/40 bg-black/20 p-6 text-center text-sm text-cream/65">
            {t("noStatsYet")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {buildTiles(data.stats).map((tile) => {
                const Icon = tile.icon;
                return (
                  <div key={tile.label} className="rounded-lg border border-white/5 bg-black/20 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] tracking-wider text-cream/50 uppercase">
                      <Icon className="size-3.5 shrink-0 text-brass-300" />
                      <span className="truncate">{tile.label}</span>
                    </div>
                    <p className="mt-1.5 font-display text-lg leading-none font-bold text-cream">{tile.value}</p>
                    {tile.hint && <p className="mt-1 text-[11px] text-cream/45">{tile.hint}</p>}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-cream/45">{t("source")}</p>
          </>
        )}
      </div>
    </Panel>
  );
}
