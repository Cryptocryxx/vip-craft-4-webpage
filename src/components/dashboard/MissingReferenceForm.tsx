"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Send } from "lucide-react";
import { submitReferenceAction, type ApplicationFormState } from "@/lib/actions/whitelist";

const initialState: ApplicationFormState = {};

/**
 * Nachtraeglich die Referenz-Angabe ("wen kennst du auf dem Server")
 * ergaenzen, fuer Anträge von vor dieser Pflichtangabe.
 *
 * Bewusst ein eigenes, kleines Formular statt der grossen
 * WhitelistApplicationForm: Die zeigt sich Freigeschalteten gar nicht mehr
 * (siehe showForm in WhitelistStatus.tsx), hier soll aber wirklich nur das
 * eine fehlende Feld nachgereicht werden - ohne erneuten Mojang-Check und
 * ohne Risiko, aus einem angenommenen versehentlich wieder einen neuen,
 * offenen Antrag zu machen.
 */
export function MissingReferenceForm() {
  const t = useTranslations("WhitelistApplicationForm");
  const tStatus = useTranslations("WhitelistStatus");
  const [state, formAction, pending] = useActionState(submitReferenceAction, initialState);

  if (state.success) {
    return (
      <p className="flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
        <Check className="size-4 shrink-0" /> {state.success}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-brass-400/40 bg-brass-500/10 p-3">
      <p className="text-brass-100">{tStatus("missingReferenceNotice")}</p>
      <textarea
        name="message"
        rows={2}
        placeholder={t("messagePlaceholder")}
        minLength={1}
        maxLength={1000}
        required
        className="input resize-y"
      />
      {state.error && <p className="text-sm text-rose-300">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-brass btn-sm">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {tStatus("submitReference")}
      </button>
    </form>
  );
}
