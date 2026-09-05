"use client";

import { useActionState } from "react";
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
 * Nur der Minecraft-Username – das frühere Freitextfeld „Kurz zu dir" ist raus.
 * Es war optional, wurde selten ausgefüllt und stand zwischen Eingabe und
 * Absenden.
 */
export function WhitelistApplicationForm({ defaultName, submitLabel = "Whitelist beantragen" }: Props) {
  const [state, formAction, pending] = useActionState(submitApplicationAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="application-name" className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">
          Dein Minecraft-Username
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
