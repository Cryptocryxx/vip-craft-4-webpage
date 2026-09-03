import { ChevronUp, Save } from "lucide-react";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { deleteSuggestionAction, updateSuggestionStatusAction } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/Badge";
import { formatShortDate } from "@/lib/format";
import {
  SUGGESTION_STATUSES,
  suggestionStatusLabels,
  suggestionTypeLabels,
  type SuggestionDTO,
} from "@/lib/suggestion-types";

export function SuggestionAdminRow({ suggestion }: { suggestion: SuggestionDTO }) {
  return (
    <div className="flex flex-wrap gap-4 border-t border-white/5 p-4 first:border-t-0">
      <div className="flex w-12 shrink-0 flex-col items-center rounded-lg border border-white/10 bg-black/20 py-2">
        <ChevronUp className="size-4 text-cream/60" />
        <span className="font-display text-base leading-none font-bold text-cream">{suggestion.votes}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="brass">{suggestionTypeLabels[suggestion.type]}</Badge>
          <Badge tone="neutral">{suggestionStatusLabels[suggestion.status]}</Badge>
        </div>
        <h3 className="mt-2 font-display font-bold text-cream">{suggestion.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-cream/65">{suggestion.body}</p>
        <p className="mt-1.5 text-xs text-cream/45">
          von {suggestion.author.name ?? suggestion.author.minecraftName ?? "Unbekannt"} ·{" "}
          {formatShortDate(suggestion.createdAt)}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <form action={updateSuggestionStatusAction} className="flex items-center gap-2">
            <input type="hidden" name="suggestionId" value={suggestion.id} />
            <label className="sr-only" htmlFor={`status-${suggestion.id}`}>
              Status
            </label>
            <select id={`status-${suggestion.id}`} name="status" defaultValue={suggestion.status} className="input h-9 w-40 py-0">
              {SUGGESTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {suggestionStatusLabels[status]}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-outline btn-sm">
              <Save className="size-3.5" /> Setzen
            </button>
          </form>

          <form action={deleteSuggestionAction.bind(null, suggestion.id)}>
            <ConfirmSubmit label="Löschen" />
          </form>
        </div>
      </div>
    </div>
  );
}
