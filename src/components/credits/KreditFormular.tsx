"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, HandCoins, Loader2 } from "lucide-react";
import { bieteKreditAnAction, type KreditFormState } from "@/lib/actions/kredite";
import { formatCogsLong, SPURS_PER_COG } from "@/lib/currency";
import {
  faelligSpurs,
  KREDIT_ANGEBOT_TAGE,
  KREDIT_MAX_COGS,
  KREDIT_MAX_ZINS,
  KREDIT_MIN_COGS,
  KREDIT_MIN_ZINS,
} from "@/lib/kredit-types";

const leer: KreditFormState = {};

type Partner = Array<{ id: string; name: string }>;

/** Morgen als "YYYY-MM-DD" – frühestes sinnvolles Rückzahlungsdatum. */
function morgen(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Einen Kredit anbieten.
 *
 * Nach einem erfolgreichen Angebot werden die Felder neu aufgebaut (Schlüssel
 * `state.at`) statt per Effekt zurückgesetzt – das leert Auswahl, Datum und
 * die Vorschau in einem Zug.
 */
export function KreditFormular({
  partner,
  guthabenSpurs,
  bereit,
}: {
  partner: Partner;
  guthabenSpurs: number | null;
  bereit: boolean;
}) {
  const t = useTranslations("Credits");
  const [state, formAction, pending] = useActionState(bieteKreditAnAction, leer);

  if (!bereit) return <p className="text-sm text-cream/60">{t("serverNotReady")}</p>;
  if (partner.length === 0) return <p className="text-sm text-cream/60">{t("noPartners")}</p>;

  return (
    <form action={formAction} className="space-y-4">
      <Felder key={state.at ?? 0} partner={partner} guthabenSpurs={guthabenSpurs} />

      {state.error && <p className="text-sm text-rose-300">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-300">
          <Check className="size-4" /> {state.success}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-brass btn-md">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <HandCoins className="size-4" />}
        {t("submit")}
      </button>
    </form>
  );
}

/**
 * Die Eingaben samt Vorschau. Unter den Feldern steht gleich, was zurückkommt –
 * dieselbe Rechnung (faelligSpurs), die der Server nachher bucht. Der Hinweis
 * auf die sofortige Reservierung steht direkt über dem Knopf, nicht im
 * Kleingedruckten.
 */
function Felder({ partner, guthabenSpurs }: { partner: Partner; guthabenSpurs: number | null }) {
  const t = useTranslations("Credits");
  const [cogs, setCogs] = useState(100);
  const [zins, setZins] = useState(5);

  const gueltig =
    Number.isInteger(cogs) &&
    cogs >= KREDIT_MIN_COGS &&
    cogs <= KREDIT_MAX_COGS &&
    Number.isInteger(zins) &&
    zins >= KREDIT_MIN_ZINS &&
    zins <= KREDIT_MAX_ZINS;
  const zurueck = gueltig ? faelligSpurs(cogs * SPURS_PER_COG, zins) : null;
  const beschriftung = "mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase";

  return (
    <>
      <div>
        <label htmlFor="kredit-an" className={beschriftung}>
          {t("borrowerLabel")}
        </label>
        <select id="kredit-an" name="borrowerId" required defaultValue="" className="input">
          <option value="" disabled>
            {t("borrowerChoose")}
          </option>
          {partner.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="kredit-cogs" className={beschriftung}>
            {t("amountLabel")}
          </label>
          <input
            id="kredit-cogs"
            name="cogs"
            type="number"
            required
            min={KREDIT_MIN_COGS}
            max={KREDIT_MAX_COGS}
            step={1}
            value={Number.isFinite(cogs) ? cogs : ""}
            onChange={(e) => setCogs(e.target.valueAsNumber)}
            className="input"
          />
          {guthabenSpurs !== null && (
            <p className="mt-1 text-[11px] text-cream/45">{t("yourBalance", { amount: formatCogsLong(guthabenSpurs) })}</p>
          )}
        </div>

        <div>
          <label htmlFor="kredit-zins" className={beschriftung}>
            {t("interestLabel")}
          </label>
          <input
            id="kredit-zins"
            name="zins"
            type="number"
            required
            min={KREDIT_MIN_ZINS}
            max={KREDIT_MAX_ZINS}
            step={1}
            value={Number.isFinite(zins) ? zins : ""}
            onChange={(e) => setZins(e.target.valueAsNumber)}
            className="input"
          />
          <p className="mt-1 text-[11px] text-cream/45">{t("interestHint", { max: KREDIT_MAX_ZINS })}</p>
        </div>

        <div>
          <label htmlFor="kredit-bis" className={beschriftung}>
            {t("repayByLabel")}
          </label>
          <input id="kredit-bis" name="rueckzahlungBis" type="date" min={morgen()} className="input" />
          <p className="mt-1 text-[11px] text-cream/45">{t("repayByHint")}</p>
        </div>
      </div>

      {zurueck !== null && (
        <p className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-cream/80">
          <HandCoins className="size-4 shrink-0 text-brass-200" />
          {t("preview", { amount: formatCogsLong(cogs * SPURS_PER_COG), due: formatCogsLong(zurueck) })}
        </p>
      )}

      <p className="rounded-lg border border-brass-500/25 bg-brass-500/5 px-3 py-2 text-xs leading-relaxed text-cream/65">
        {t("warning", { days: KREDIT_ANGEBOT_TAGE })}
      </p>
    </>
  );
}
