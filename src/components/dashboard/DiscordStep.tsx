"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { recheckDiscordAction, type ApplicationFormState } from "@/lib/actions/whitelist";

/**
 * Der Discord-Schritt im Whitelist-Antrag.
 *
 * Beim Login wird die Mitgliedschaft automatisch geprüft. Wer erst danach
 * beitritt, muss sich nicht neu anmelden – dafür gibt es „Erneut prüfen".
 */
export function DiscordStep({ joined, invite }: { joined: boolean; invite: string }) {
  const [feedback, setFeedback] = useState<ApplicationFormState>({});
  const [pending, startTransition] = useTransition();

  if (joined) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
        <Check className="size-4 shrink-0" />
        Du bist im Discord – dieser Schritt ist erledigt.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-brass-400/40 bg-brass-500/10 p-4">
      <p className="flex items-center gap-2 font-display font-bold text-brass-100">
        <DiscordIcon className="size-4 shrink-0" />
        Noch ein Schritt: tritt dem Discord bei
      </p>
      <p className="mt-1.5 text-sm text-cream/75">
        Ohne Discord ist dein Antrag unvollständig. Dort läuft die Absprache, und dort bekommst du Bescheid, sobald das
        Team ihn bearbeitet hat.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <a href={invite} target="_blank" rel="noopener noreferrer" className="btn btn-brass btn-sm">
          <DiscordIcon className="size-4" /> Discord beitreten
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => setFeedback(await recheckDiscordAction()))}
          className="btn btn-ghost btn-sm disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Erneut prüfen
        </button>
      </div>

      {feedback.error && <p className="mt-3 text-sm text-rose-200">{feedback.error}</p>}
      {feedback.success && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-300">
          <Check className="size-4" /> {feedback.success}
        </p>
      )}
    </div>
  );
}
