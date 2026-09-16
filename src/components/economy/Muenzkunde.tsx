import { getTranslations } from "next-intl/server";
import { Panel } from "@/components/ui/Panel";
import { COINS, SPURS_PER_COG } from "@/lib/currency";
import { formatNumber } from "@/lib/format";

/**
 * Die sechs Münzen von Create: Numismatics mit ihrem Wert. Gerechnet wird auf
 * der ganzen Seite in Cog, weil ingame in Cog gehandelt wird.
 */
export async function Muenzkunde() {
  const t = await getTranslations("EconomyPage");

  return (
    <Panel className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5 bg-black/20 text-left text-xs tracking-wider text-cream/50 uppercase">
            <th className="px-5 py-3 font-semibold">{t("coinName")}</th>
            <th className="px-5 py-3 text-right font-semibold">{t("coinSpurs")}</th>
            <th className="px-5 py-3 text-right font-semibold">{t("coinCogs")}</th>
          </tr>
        </thead>
        <tbody>
          {COINS.map((muenze) => (
            <tr key={muenze.name} className="border-t border-white/5 first:border-t-0">
              <td className="px-5 py-2.5 font-semibold text-cream">{muenze.name}</td>
              <td className="px-5 py-2.5 text-right font-mono text-cream/80">{formatNumber(muenze.spurs)}</td>
              <td className="px-5 py-2.5 text-right font-mono text-cream/60">
                {muenze.spurs < SPURS_PER_COG
                  ? `1/${SPURS_PER_COG / muenze.spurs}`
                  : formatNumber(muenze.spurs / SPURS_PER_COG)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-white/5 bg-black/15 px-5 py-3 text-xs leading-relaxed text-cream/50">
        {t("coinNote", { spursPerCog: SPURS_PER_COG })}
      </p>
    </Panel>
  );
}
