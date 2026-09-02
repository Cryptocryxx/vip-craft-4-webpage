"use client";

import { useActionState, useEffect, useRef } from "react";
import { Bug, Loader2, Puzzle, Send, Sparkles, type LucideIcon } from "lucide-react";
import { createSuggestionAction, type SuggestionFormState } from "@/lib/actions/suggestions";
import { SUGGESTION_TYPES, suggestionTypeLabels, type SuggestionType } from "@/lib/suggestion-types";

const typeIcons: Record<SuggestionType, LucideIcon> = { MOD: Puzzle, BUG: Bug, FEATURE: Sparkles };

const initialState: SuggestionFormState = {};

export function SuggestionForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(createSuggestionAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-xs font-semibold tracking-wider text-cream/60 uppercase">Art des Beitrags</legend>
        <div className="grid grid-cols-3 gap-2">
          {SUGGESTION_TYPES.map((type, index) => {
            const Icon = typeIcons[type];
            return (
              <label key={type} className="cursor-pointer">
                <input type="radio" name="type" value={type} defaultChecked={index === 0} className="peer sr-only" />
                <span className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-display text-xs font-semibold tracking-wide text-cream/70 transition-colors peer-checked:border-diamond-400/60 peer-checked:bg-diamond-500/15 peer-checked:text-diamond-100 hover:text-cream peer-focus-visible:ring-2 peer-focus-visible:ring-diamond-400/70">
                  <Icon className="size-4" />
                  {suggestionTypeLabels[type]}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="suggestion-title" className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">
          Titel
        </label>
        <input
          id="suggestion-title"
          name="title"
          type="text"
          required
          minLength={5}
          maxLength={120}
          placeholder="z. B. Create: Steam 'n' Rails hinzufügen"
          className="input"
        />
      </div>

      <div>
        <label htmlFor="suggestion-body" className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">
          Beschreibung
        </label>
        <textarea
          id="suggestion-body"
          name="body"
          required
          minLength={20}
          maxLength={2000}
          rows={4}
          placeholder="Worum geht es, warum lohnt es sich – oder wie lässt sich der Bug reproduzieren?"
          className="input resize-y"
        />
      </div>

      {state.error && <p className="text-sm text-rose-300">{state.error}</p>}

      <div className="flex items-center justify-end gap-3">
        <button type="submit" disabled={pending} className="btn btn-diamond btn-md">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Einreichen
        </button>
      </div>
    </form>
  );
}
