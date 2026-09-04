import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { formatCogs } from "@/lib/currency";
import { formatHours } from "@/lib/format";
import type { PlayerProfile } from "@/lib/players";

/** Eine Kachel in der Spielerliste – klickbar zur Detailseite. */
export function PlayerCard({ player }: { player: PlayerProfile }) {
  return (
    <Link href={`/spieler/${encodeURIComponent(player.name)}`} className="group block">
      <Panel className="flex h-full items-center gap-4 p-4 transition-colors group-hover:border-brass-400/60">
        <div className="relative shrink-0">
          <PlayerHead name={player.name} size={44} />
          {player.online && (
            <span
              className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-wood-900 bg-emerald-400"
              title="Gerade online"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-display font-bold text-cream">
            {player.name}
            <ArrowUpRight className="size-3.5 shrink-0 text-cream/30 transition-transform group-hover:translate-x-0.5 group-hover:text-brass-200" />
          </p>
          <p className="mt-0.5 truncate text-xs text-cream/55">
            {player.stats ? (
              <>
                {formatHours(player.stats.playtimeHours)} gespielt
                {player.balanceSpurs !== null && <> · {formatCogs(player.balanceSpurs)} Cog</>}
              </>
            ) : (
              "Noch keine Statistiken"
            )}
          </p>
        </div>

        {player.online && <Badge tone="emerald">Online</Badge>}
      </Panel>
    </Link>
  );
}
