"use client";

import { useActionState } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { checkDiscordMembershipsAction, type AdminFormState } from "@/lib/actions/admin";

const initialState: AdminFormState = {};

/**
 * Prüft alle verknüpften Discord-Accounts auf einmal nach.
 *
 * Sonst wird nur nachgesehen, wenn jemand selbst sein Dashboard öffnet – für
 * alle anderen stünde in der Liste dauerhaft „ungeprüft".
 */
export function CheckDiscordButton() {
  const [state, formAction, pending] = useActionState(checkDiscordMembershipsAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className="btn btn-outline btn-sm disabled:opacity-50">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Discord-Mitgliedschaften prüfen
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
