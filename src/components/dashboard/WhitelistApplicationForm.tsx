"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { submitApplicationAction, type ApplicationFormState } from "@/lib/actions/whitelist";

const initialState: ApplicationFormState = {};

type Props = {
  defaultName?: string | null;
  /** Beschriftung des Absende-Buttons. */
  submitLabel?: string;
};

/**
 * Formular für den Whitelist-Antrag.
 *
 * Minecraft-Username plus die Pflichtfrage, wen man auf dem Server kennt -
 * hilft dem Team beim Einordnen des Antrags. Ein früheres, optionales
 * Freitextfeld ("Kurz zu dir") wurde mal entfernt, weil es kaum ausgefüllt
 * wurde; diese Frage ist bewusst konkreter und deshalb Pflicht.
 */
export function WhitelistApplicationForm({ defaultName, submitLabel }: Props) {
  const t = useTranslations("WhitelistApplicationForm");
  const [state, formAction, pending] = useActionState(submitApplicationAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="application-name" className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">
          {t("label")}
        </label>
        <input
          id="application-name"
          name="minecraftName"
          type="text"
          defaultValue={defaultName ?? ""}
          placeholder={t("placeholder")}
          pattern="[A-Za-z0-9_]{3,16}"
          minLength={3}
          maxLength={16}
          required
          autoComplete="off"
          className="input font-mono"
        />
      </div>

      <div>
        <label htmlFor="application-message" className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">
          {t("messageLabel")}
        </label>
        <textarea
          id="application-message"
          name="message"
          rows={2}
          placeholder={t("messagePlaceholder")}
          minLength={1}
          maxLength={1000}
          required
          className="input resize-y"
        />
      </div>

      {state.error && <p className="text-sm text-rose-300">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-300">
          <Check className="size-4" /> {state.success}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-brass btn-md w-full sm:w-auto">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
        {submitLabel ?? t("applyWhitelist")}
      </button>
    </form>
  );
}
