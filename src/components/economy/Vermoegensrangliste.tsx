import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { formatCogs, formatSpurs } from "@/lib/currency";
import type { Vermoegen } from "@/lib/economy-types";

/**
 * Wer hat am meisten? Gezählt wird alles, was einem Spieler gehört: sein
 * Bankkonto, die Münzen in seinen Taschen und sein Anteil an jeder
 * Organisation, in der er auf der Vertrauensliste steht.
 *
 * Der Anteil ist das Guthaben der Organisation geteilt durch die Zahl ihrer
 * Mitglieder. Das ist eine Annahme, keine Buchung – Numismatics kennt keine
 * Beteiligungen, nur Zugriff. Deshalb steht die Aufteilung auch als Zeile
 * unter der Liste.
 */
export async function Vermoegensrangliste({ zeilen }: { zeilen: Vermoegen[] }) {
  const t = await getTranslations("EconomyPage");

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 bg-black/20 px-5 py-3">
        <h3 className="font-display text-sm font-bold tracking-wide text-brass-200 uppercase">{t("wealthTitle")}</h3>
        <Badge tone="brass">Cog</Badge>
      </div>

      <ol>
        {zeilen.map((zeile) => {
          const teile = [
            zeile.balanceSpurs > 0 ? t("partAccount", { amount: formatCogs(zeile.balanceSpurs) }) : null,
            zeile.anteilSpurs > 0 ? t("partShare", { amount: formatCogs(zeile.anteilSpurs) }) : null,
            zeile.bargeldSpurs > 0 ? t("partCash", { amount: formatCogs(zeile.bargeldSpurs) }) : null,
          ].filter(Boolean);

          return (
            <li key={zeile.player} className="flex items-center gap-3 border-t border-white/5 px-5 py-3 first:border-t-0">
              <span className="w-5 font-display text-sm font-bold text-cream/50">{zeile.rank}</span>
              <PlayerHead name={zeile.player} size={28} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/spieler/${encodeURIComponent(zeile.player)}`}
                  className="truncate font-semibold text-cream hover:text-brass-200"
                >
                  {zeile.player}
                </Link>
                {/* Nur zeigen, wenn das Vermögen nicht einfach das eigene Konto ist –
                    sonst stünde dieselbe Zahl zweimal in der Zeile. */}
                {zeile.gesamtSpurs !== zeile.balanceSpurs && (
                  <p className="truncate text-xs text-cream/45">{teile.join(" · ")}</p>
                )}
                {zeile.organisationen.length > 0 && (
                  <p className="truncate text-xs text-cream/45">
                    {t("partOrganisations", { names: [...new Set(zeile.organisationen)].join(", ") })}
                  </p>
                )}
              </div>
              <span className="font-mono text-sm text-cream" title={formatSpurs(zeile.gesamtSpurs)}>
                {formatCogs(zeile.gesamtSpurs)}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="border-t border-white/5 bg-black/15 px-5 py-3 text-xs leading-relaxed text-cream/50">
        {t("wealthNote")}
      </p>
    </Panel>
  );
}
