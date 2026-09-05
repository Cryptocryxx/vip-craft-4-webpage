import { Check, Download } from "lucide-react";
import { ModpackLink } from "@/components/ui/ModpackLink";

/**
 * Der Modpack-Schritt in der Checkliste.
 *
 * Der Knopf ist derselbe wie überall sonst (siehe ModpackLink) – er vermerkt
 * den Klick, egal von welcher Seite aus er kommt.
 */
export function ModpackStep({ bereitsGeladen }: { bereitsGeladen: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ModpackLink variant="diamond" size="sm">
        <Download className="size-4" /> Modpack herunterladen
      </ModpackLink>

      {bereitsGeladen && (
        <span className="flex items-center gap-1 text-xs text-emerald-300">
          <Check className="size-3.5" /> Link schon geöffnet
        </span>
      )}
    </div>
  );
}
