import { getTranslations } from "next-intl/server";
import { ArrowRight, Coins } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { formatCogs, formatCogsLong, formatSpurs } from "@/lib/currency";
import type { EconomyOverview } from "@/lib/economy-types";

/**
 * Kurzer Blick auf die Wirtschaft am Ende der Leaderboards – Umlauf und die
 * ersten drei. Alles Weitere (Organisationen, Bargeld, Münzkunde) steht auf
 * /economy, damit es nur einen Ort dafür gibt.
 */
export async function EconomyTeaser({ data, source }: { data: EconomyOverview; source: "live" | "unavailable" }) {
  const t = await getTranslations("EconomyTeaser");

  if (source !== "live" || data.vermoegen.length === 0) {
    return (
      <Panel className="p-10 text-center">
        <Coins className="mx-auto size-10 text-brass-500/40" />
        <p className="mt-3 font-display text-lg font-bold text-cream">{t("emptyTitle")}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-cream/60">{t("emptyText")}</p>
      </Panel>
    );
  }

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-black/20 px-5 py-4">
        <div>
          <p className="text-xs tracking-wider text-cream/50 uppercase">{t("inCirculation")}</p>
          <p className="mt-0.5 font-display text-xl font-bold text-cream">
            {formatCogsLong(data.summary.totalCirculationSpurs)}
          </p>
        </div>
        <Badge tone="brass">{t("accounts", { count: data.summary.accountCount })}</Badge>
      </div>

      <ol>
        {data.vermoegen.slice(0, 3).map((zeile) => (
          <li key={zeile.player} className="flex items-center gap-3 border-t border-white/5 px-5 py-3 first:border-t-0">
            <span className="w-5 font-display text-sm font-bold text-cream/50">{zeile.rank}</span>
            <PlayerHead name={zeile.player} size={28} />
            <span className="flex-1 truncate font-semibold text-cream">{zeile.player}</span>
            <span className="font-mono text-sm text-cream" title={formatSpurs(zeile.gesamtSpurs)}>
              {formatCogs(zeile.gesamtSpurs)}
            </span>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 bg-black/15 px-5 py-4">
        <p className="text-xs text-cream/50">{t("note")}</p>
        <Button href="/economy" variant="outline" size="sm">
          {t("more")} <ArrowRight className="size-4" />
        </Button>
      </div>
    </Panel>
  );
}
