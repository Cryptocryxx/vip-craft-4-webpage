"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { refreshPlayerStatsAction, type PlayerActionState } from "@/lib/actions/players";

/**
 * Lässt den Server speichern, damit die Statistiken aktuell werden.
 *
 * Minecraft schreibt sie sonst erst beim Ausloggen – wer gerade spielt, hat
 * also veraltete Zahlen. Pro Person nur alle zehn Minuten; die Sperre setzt die
 * Server Action durch, hier steht nur die Rückmeldung.
 */
export function RefreshStatsButton({ eingeloggt }: { eingeloggt: boolean }) {
  const [rueckmeldung, setRueckmeldung] = useState<PlayerActionState>({});
  const [pending, startTransition] = useTransition();

  if (!eingeloggt) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setRueckmeldung(await refreshPlayerStatsAction()))}
        className="btn btn-outline btn-sm disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Zahlen aktualisieren
      </button>

      {rueckmeldung.error && <span className="text-sm text-brass-200">{rueckmeldung.error}</span>}
      {rueckmeldung.success && (
        <span className="flex items-center gap-1.5 text-sm text-emerald-300">
          <Check className="size-4" /> {rueckmeldung.success}
        </span>
      )}
    </div>
  );
}
