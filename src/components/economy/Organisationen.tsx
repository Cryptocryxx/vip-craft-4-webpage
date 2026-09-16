import { getTranslations } from "next-intl/server";
import { Building2, CreditCard } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { formatCogsLong, formatSpurs } from "@/lib/currency";
import type { Organisation } from "@/lib/economy-types";

/**
 * Die gemeinsamen Konten. In Numismatics ist das ein Blaze Banker: ein Konto
 * mit Namen, auf das jeder von der Vertrauensliste vollen Zugriff hat.
 *
 * Unterkonten sind ausgegebene Bankkarten mit eigenem Ausgabelimit. Solange
 * niemand welche anlegt, bleibt der Abschnitt leer – das ist der Normalfall.
 */
export async function Organisationen({ organisationen }: { organisationen: Organisation[] }) {
  const t = await getTranslations("EconomyPage");

  if (organisationen.length === 0) {
    return (
      <Panel className="p-10 text-center">
        <Building2 className="mx-auto size-10 text-brass-500/40" />
        <p className="mt-3 font-display text-lg font-bold text-cream">{t("orgEmptyTitle")}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-cream/60">{t("orgEmptyText")}</p>
      </Panel>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {organisationen.map((organisation) => (
        <Panel key={organisation.id} className="flex flex-col overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-white/5 bg-black/20 px-5 py-4">
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold text-cream">{organisation.name}</p>
              <p className="mt-0.5 text-xs text-cream/45">
                {t("orgMemberCount", { count: organisation.mitglieder.length })}
              </p>
            </div>
            <Badge tone="brass" className="shrink-0">
              <span title={formatSpurs(organisation.balanceSpurs)}>{formatCogsLong(organisation.balanceSpurs)}</span>
            </Badge>
          </div>

          <div className="flex flex-1 flex-col gap-4 p-5">
            <div>
              <p className="text-xs tracking-wider text-cream/50 uppercase">{t("orgMembers")}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {organisation.mitglieder.map((name) => (
                  <li key={name}>
                    <Link
                      href={`/spieler/${encodeURIComponent(name)}`}
                      className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 py-1 pr-3 pl-1 text-sm text-cream/85 hover:border-brass-400/50 hover:text-cream"
                    >
                      <PlayerHead name={name} size={20} />
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
              {organisation.mitglieder.length > 0 && (
                <p className="mt-2 text-xs text-cream/45">
                  {t("orgShare", { amount: formatCogsLong(organisation.anteilSpurs) })}
                </p>
              )}
            </div>

            {organisation.kartentraeger.length > 0 && (
              <p className="flex items-center gap-2 text-xs text-cream/55">
                <CreditCard className="size-3.5 shrink-0 text-brass-200" />
                {t("orgCardHolders", { names: organisation.kartentraeger.join(", ") })}
              </p>
            )}

            {organisation.unterkonten.length > 0 && (
              <div>
                <p className="text-xs tracking-wider text-cream/50 uppercase">{t("orgSubAccounts")}</p>
                <ul className="mt-2 space-y-1.5">
                  {organisation.unterkonten.map((unterkonto, index) => (
                    <li key={`${unterkonto.name}-${index}`} className="text-sm text-cream/80">
                      <span className="text-cream">{unterkonto.name}</span>
                      <span className="text-cream/45">
                        {" · "}
                        {unterkonto.zugriff}
                        {" · "}
                        {unterkonto.limitSpurs === null
                          ? t("orgNoLimit")
                          : t("orgLimit", {
                              limit: formatCogsLong(unterkonto.limitSpurs),
                              spent: formatCogsLong(unterkonto.ausgegebenSpurs),
                            })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}
