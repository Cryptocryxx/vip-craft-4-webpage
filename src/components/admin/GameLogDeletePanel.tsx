"use client";

import { useActionState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { loescheVerlaufAction, type VerlaufAktion } from "@/lib/actions/game-log";

const initialState: VerlaufAktion = {};

/**
 * Verlauf löschen – nur für Admins.
 *
 * Ohne Feld ist alles gemeint; mit einer Zahl nur, was älter ist. Der zweite
 * Fall ist der übliche: aufräumen, ohne die letzten Wochen zu verlieren.
 */
export function GameLogDeletePanel({ aufbewahrung }: { aufbewahrung: number }) {
  const [state, formAction, laeuft] = useActionState(loescheVerlaufAction, initialState);

  return (
    <Panel className="p-5">
      <p className="text-sm leading-relaxed text-cream/70">
        {aufbewahrung > 0
          ? `Eingestellt sind ${aufbewahrung} Tage – alles Ältere verschwindet von selbst. Hier lässt sich früher aufräumen.`
          : "Aufbewahrung steht auf unbegrenzt: Es wird nichts automatisch gelöscht. Die Frist steht in den Einstellungen."}
      </p>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="basis-48">
          <span className="mb-1 block text-[11px] font-semibold tracking-wider text-cream/50 uppercase">
            Älter als (Tage)
          </span>
          <input
            name="tage"
            type="number"
            min={1}
            max={3650}
            placeholder="leer = alles"
            className="input font-mono"
          />
        </label>

        <button
          type="submit"
          disabled={laeuft}
          className="btn btn-sm border border-rose-400/60 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30 disabled:opacity-50"
        >
          {laeuft ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Löschen
        </button>
      </form>

      {state.error && <p className="mt-3 text-sm text-rose-300">{state.error}</p>}
      {state.success && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-300">
          <Check className="size-4" /> {state.success}
        </p>
      )}
    </Panel>
  );
}
