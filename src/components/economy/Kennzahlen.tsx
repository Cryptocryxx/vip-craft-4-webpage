import { getTranslations } from "next-intl/server";
import { Building2, Coins, Wallet, Landmark } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { formatCogsLong } from "@/lib/currency";
import type { EconomyOverview } from "@/lib/economy-types";

/**
 * Die vier Zahlen ganz oben: Wie viel Geld gibt es, wo liegt es, und auf wie
 * vielen Konten. „Im Umlauf" ist Bankguthaben plus Bargeld in den Taschen.
 */
export async function Kennzahlen({ data }: { data: EconomyOverview }) {
  const t = await getTranslations("EconomyPage");
  const { summary } = data;

  const kacheln = [
    { label: t("statTotal"), wert: formatCogsLong(summary.totalCirculationSpurs), icon: Coins, hinweis: null },
    {
      label: t("statBank"),
      wert: formatCogsLong(summary.bankSpurs),
      icon: Landmark,
      hinweis: t("statBankHint", { count: summary.accountCount }),
    },
    {
      label: t("statOrganisations"),
      wert: formatCogsLong(summary.organisationSpurs),
      icon: Building2,
      hinweis: t("statOrganisationsHint", { count: summary.organisationCount }),
    },
    {
      label: t("statCash"),
      wert: data.bargeldGezaehlt ? formatCogsLong(summary.bargeldSpurs) : "–",
      icon: Wallet,
      hinweis: data.bargeldGezaehlt ? t("statCashHint") : t("statCashMissing"),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kacheln.map((kachel) => {
        const Icon = kachel.icon;
        return (
          <Panel key={kachel.label} className="flex items-start gap-4 p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-brass-500/40 bg-brass-500/10 text-brass-200">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs tracking-wider text-cream/50 uppercase">{kachel.label}</p>
              <p className="mt-0.5 font-display text-xl font-bold text-cream">{kachel.wert}</p>
              {kachel.hinweis && <p className="mt-0.5 text-xs text-cream/45">{kachel.hinweis}</p>}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
