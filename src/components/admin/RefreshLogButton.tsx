"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { aktualisiereErfassungAction } from "@/lib/actions/game-log";

/**
 * Holt Chat und Befehle sofort nach.
 *
 * Normalerweise passiert das von allein – im Takt des Watchdogs und beim
 * Öffnen dieser Seiten. Der Knopf ist für den Moment, in dem man daneben sitzt
 * und nicht warten will.
 */
export function RefreshLogButton() {
  const [meldung, setMeldung] = useState<{ text: string; ok: boolean } | null>(null);
  const [laeuft, starte] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={laeuft}
        onClick={() =>
          starte(async () => {
            const ergebnis = await aktualisiereErfassungAction();
            setMeldung(
              ergebnis.error ? { text: ergebnis.error, ok: false } : { text: ergebnis.success ?? "", ok: true },
            );
          })
        }
        className="btn btn-outline btn-sm disabled:opacity-50"
      >
        {laeuft ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Jetzt nachsehen
      </button>

      {meldung && (
        <span className={meldung.ok ? "flex items-center gap-1.5 text-xs text-emerald-300" : "text-xs text-rose-300"}>
          {meldung.ok && <Check className="size-3.5" />}
          {meldung.text}
        </span>
      )}
    </div>
  );
}
