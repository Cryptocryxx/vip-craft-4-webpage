"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Check, Coins, Crosshair, Loader2 } from "lucide-react";
import { createBountyAction, type BountyFormState } from "@/lib/actions/bounties";
import { MAX_COGS, MIN_COGS } from "@/lib/bounty-types";

const initialState: BountyFormState = {};

/** Das Datum von morgen als "YYYY-MM-DD" – frühestes sinnvolles Ende. */
function morgen(): string {
  const datum = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
  return datum.toISOString().slice(0, 10);
}

/**
 * Kopfgeld aussetzen.
 *
 * Der Hinweis auf die sofortige Abbuchung steht bewusst direkt über dem Knopf
 * und nicht im Kleingedruckten: Das Geld ist weg, sobald hier geklickt wird.
 */
export function BountyForm({ guthaben }: { guthaben: number | null }) {
  const t = useTranslations("BountyForm");
  const [state, formAction, pending] = useActionState(createBountyAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="bounty-target"
          className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase"
        >
          {t("targetLabel")}
        </label>
        <input
          id="bounty-target"
          name="targetName"
          type="text"
          required
          minLength={3}
          maxLength={16}
          pattern="[A-Za-z0-9_]{3,16}"
          placeholder={t("targetPlaceholder")}
          className="input"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="bounty-cogs"
            className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase"
          >
            {t("amountLabel")}
          </label>
          <input
            id="bounty-cogs"
            name="cogs"
            type="number"
            required
            min={MIN_COGS}
            max={MAX_COGS}
            step={1}
            defaultValue={10}
            className="input"
          />
          {guthaben !== null && <p className="mt-1 text-[11px] text-cream/45">{t("balance", { cogs: guthaben })}</p>}
        </div>

        <div>
          <label
            htmlFor="bounty-until"
            className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase"
          >
            {t("untilLabel")}
          </label>
          <input id="bounty-until" name="expiresOn" type="date" min={morgen()} className="input" />
          <p className="mt-1 text-[11px] text-cream/45">{t("untilHint")}</p>
        </div>
      </div>

      <p className="rounded-lg border border-brass-500/25 bg-brass-500/5 px-3 py-2 text-xs leading-relaxed text-cream/65">
        {t("warning")}
      </p>

      {state.error && <p className="text-sm text-rose-300">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-300">
          <Check className="size-4" /> {state.success}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-brass btn-md disabled:opacity-40">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
        {t("submit")}
      </button>

      <p className="flex items-center gap-1.5 text-[11px] text-cream/40">
        <Coins className="size-3 shrink-0" /> {t("payoutNote")}
      </p>
    </form>
  );
}
