"use client";

import { useActionState } from "react";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { submitApplicationAction, type ApplicationFormState } from "@/lib/actions/whitelist";

const initialState: ApplicationFormState = {};

type Props = {
  defaultName?: string | null;
  defaultMessage?: string | null;
  /** Beschriftung des Absende-Buttons. */
  submitLabel?: string;
  compact?: boolean;
};

/** Formular für den Whitelist-Antrag (Gamertag + optionale Nachricht). */
export function WhitelistApplicationForm({
  defaultName,
  defaultMessage,
  submitLabel = "Whitelist beantragen",
  compact = false,
}: Props) {
  const [state, formAction, pending] = useActionState(submitApplicationAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="application-name" className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">
          Minecraft-Gamertag
        </label>
        <input
          id="application-name"
          name="minecraftName"
          type="text"
          defaultValue={defaultName ?? ""}
          placeholder="z. B. Steve_42"
          pattern="[A-Za-z0-9_]{3,16}"
          minLength={3}
          maxLength={16}
          required
          autoComplete="off"
          className="input font-mono"
        />
      </div>

      {!compact && (
        <div>
          <label htmlFor="application-message" className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">
            Kurz zu dir <span className="normal-case opacity-70">(optional)</span>
          </label>
          <textarea
            id="application-message"
            name="message"
            rows={3}
            maxLength={1000}
            defaultValue={defaultMessage ?? ""}
            placeholder="Woher kennst du uns, worauf hast du Lust? Hilft uns bei der Einordnung."
            className="input resize-y"
          />
        </div>
      )}

      {state.error && <p className="text-sm text-rose-300">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-300">
          <Check className="size-4" /> {state.success}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-brass btn-md w-full sm:w-auto">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
        {submitLabel}
      </button>
    </form>
  );
}
