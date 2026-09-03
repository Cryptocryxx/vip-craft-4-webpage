import { MessageSquare } from "lucide-react";
import { SuggestionAdminRow } from "@/components/admin/SuggestionAdminRow";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listSuggestions } from "@/lib/suggestions";

export default async function AdminSuggestionsPage() {
  const suggestions = await listSuggestions();

  return (
    <div>
      <SectionHeading
        eyebrow="Vorschlags-Board"
        icon={MessageSquare}
        title="Beiträge moderieren"
        description="Status setzen, damit die Community sieht, was geplant oder schon umgesetzt ist."
        className="mb-5"
      />
      <Panel className="overflow-hidden">
        {suggestions.length === 0 ? (
          <p className="p-10 text-center text-sm text-cream/60">Noch keine Beiträge vorhanden.</p>
        ) : (
          suggestions.map((suggestion) => <SuggestionAdminRow key={suggestion.id} suggestion={suggestion} />)
        )}
      </Panel>
    </div>
  );
}
