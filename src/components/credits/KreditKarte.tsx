import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { formatCogsLong } from "@/lib/currency";
import type { KreditStatus, KreditZeile } from "@/lib/kredit-types";

const TON: Record<KreditStatus, BadgeTone> = {
  RESERVING: "neutral",
  OFFERED: "brass",
  PAYING_OUT: "neutral",
  ACTIVE: "diamond",
  REPAYING: "neutral",
  SETTLING: "neutral",
  REPAID: "emerald",
  REFUNDING: "neutral",
  DECLINED: "rose",
  WITHDRAWN: "neutral",
  EXPIRED: "neutral",
  FAILED: "rose",
};

function datum(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

/**
 * Ein Kredit aus Sicht eines der beiden Beteiligten.
 *
 * `rolle` bestimmt, wer oben steht: Der Kreditnehmer sieht, VON wem das Geld
 * kommt, der Kreditgeber, AN wen es geht. Knöpfe kommen von außen – welche
 * erlaubt sind, weiß die Seite.
 */
export async function KreditKarte({
  kredit,
  rolle,
  children,
}: {
  kredit: KreditZeile;
  rolle: "geber" | "nehmer";
  children?: ReactNode;
}) {
  const [t, locale] = await Promise.all([getTranslations("Credits"), getLocale()]);
  const gegenueber = rolle === "nehmer" ? kredit.lenderName : kredit.borrowerName;

  // Beendete Angebote tragen den Grund in closeReason, solange die Rückbuchung läuft.
  const statusText =
    kredit.status === "REFUNDING" && kredit.closeReason ? t(`status.REFUNDING_${kredit.closeReason}`) : t(`status.${kredit.status}`);

  return (
    <Panel className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <PlayerHead name={gegenueber} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-cream">
            {rolle === "nehmer" ? t("fromPlayer", { name: gegenueber }) : t("toPlayer", { name: gegenueber })}
          </p>
          <p className="text-xs text-cream/50">{t("createdOn", { date: datum(kredit.erstellt, locale) })}</p>
        </div>
        <Badge tone={TON[kredit.status]}>{statusText}</Badge>
      </div>

      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-[11px] tracking-wider text-cream/45 uppercase">{t("amount")}</dt>
          <dd className="font-mono text-cream">{formatCogsLong(kredit.betragSpurs)}</dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-wider text-cream/45 uppercase">{t("interest")}</dt>
          <dd className="font-mono text-cream">{kredit.zinsProzent} %</dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-wider text-cream/45 uppercase">{t("due")}</dt>
          <dd className="font-mono text-brass-200">{formatCogsLong(kredit.faelligSpurs)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-cream/55">
        {kredit.status === "OFFERED" && <span>{t("offerValidUntil", { date: datum(kredit.angebotBis, locale) })}</span>}
        {kredit.rueckzahlungBis && (
          <span className={kredit.ueberfaellig ? "font-semibold text-rose-300" : undefined}>
            {kredit.ueberfaellig
              ? t("overdueSince", { date: datum(kredit.rueckzahlungBis, locale) })
              : t("repayUntil", { date: datum(kredit.rueckzahlungBis, locale) })}
          </span>
        )}
        {kredit.angenommen && <span>{t("acceptedOn", { date: datum(kredit.angenommen, locale) })}</span>}
        {kredit.beglichen && <span>{t("repaidOn", { date: datum(kredit.beglichen, locale) })}</span>}
      </div>

      {kredit.hinweis && (
        <p className="flex items-start gap-1.5 text-xs text-cream/60">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-brass-200" />
          {t(`hint.${kredit.hinweis}`)}
        </p>
      )}

      {children && <div className="flex flex-wrap items-start gap-2 pt-1">{children}</div>}
    </Panel>
  );
}
