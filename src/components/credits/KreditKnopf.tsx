"use client";

import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";
import { buttonClasses, type ButtonVariant } from "@/components/ui/Button";
import { kreditAktionAction, type KreditFormState } from "@/lib/actions/kredite";

const leer: KreditFormState = {};

/**
 * Ein Knopf für eine Kredit-Aktion: annehmen, ablehnen, zurückziehen,
 * begleichen. Jeder Knopf ist ein eigenes kleines Formular – die Aktion steht
 * im Knopf, wer sie darf, prüft der Server.
 *
 * Bei allem, was Geld bewegt, fragt der Browser vorher nach: Ein versehentlicher
 * Klick auf „Annehmen" hieße, Schulden zu haben.
 */
export function KreditKnopf({
  id,
  aktion,
  label,
  variante = "outline",
  rueckfrage,
}: {
  id: string;
  aktion: "annehmen" | "ablehnen" | "zurueckziehen" | "begleichen";
  label: string;
  variante?: ButtonVariant;
  rueckfrage?: string;
}) {
  const [state, formAction, pending] = useActionState(kreditAktionAction, leer);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (rueckfrage && !window.confirm(rueckfrage)) event.preventDefault();
      }}
      className="space-y-1.5"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="aktion" value={aktion} />
      <button type="submit" disabled={pending} className={buttonClasses(variante, "sm")}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {label}
      </button>
      {state.error && <p className="text-xs text-rose-300">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1 text-xs text-emerald-300">
          <Check className="size-3.5" /> {state.success}
        </p>
      )}
    </form>
  );
}
