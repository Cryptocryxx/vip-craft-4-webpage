import type { ReactNode } from "react";
import { AlertTriangle, Check, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

/**
 * Die Schritte bis zur Freischaltung, als abhakbare Liste.
 *
 * Vorher stand nur in Fliesstext, was noch fehlt – vor allem der
 * Discord-Beitritt ging dabei unter. Als Liste sieht man auf einen Blick, was
 * erledigt ist und was nicht.
 */

export type Schritt = {
  titel: string;
  text: string;
  erledigt: boolean;
  /**
   * Kür statt Pflicht: zaehlt nicht mit, blockiert nichts und wird nie als
   * „das ist als Naechstes dran" hervorgehoben.
   */
  optional?: boolean;
  /** „warnung" färbt den Schritt rot – für Dinge, die kaputt sind. */
  ton?: "hinweis" | "warnung";
  /** Optionaler Inhalt unter dem Schritt, etwa ein Formular oder Knoepfe. */
  aktion?: ReactNode;
};

export function WhitelistSteps({ schritte }: { schritte: Schritt[] }) {
  // Optionale Schritte sind nie „als Naechstes dran".
  const offen = schritte.findIndex((schritt) => !schritt.erledigt && !schritt.optional);

  return (
    <ol className="space-y-3">
      {schritte.map((schritt, index) => {
        const istNaechster = index === offen;
        const nummer = schritte.slice(0, index).filter((s) => !s.optional).length + 1;

        return (
          <li key={schritt.titel} className="flex gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                schritt.erledigt
                  ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200"
                  : schritt.ton === "warnung"
                    ? "border-rose-400/60 bg-rose-500/20 text-rose-200"
                    : schritt.optional
                      ? "border-diamond-400/50 bg-diamond-500/15 text-diamond-200"
                      : istNaechster
                        ? "border-brass-300 bg-brass-500/25 text-brass-100"
                        : "border-white/15 bg-white/5 text-cream/40",
              )}
            >
              {schritt.erledigt ? (
                <Check className="size-3.5" />
              ) : schritt.ton === "warnung" ? (
                <AlertTriangle className="size-3.5" />
              ) : schritt.optional ? (
                <Plus className="size-3.5" />
              ) : (
                nummer
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "font-display text-sm font-bold",
                    schritt.erledigt
                      ? "text-cream/55 line-through decoration-cream/25"
                      : schritt.ton === "warnung"
                        ? "text-rose-100"
                        : "text-cream",
                  )}
                >
                  {schritt.titel}
                </span>
                {schritt.optional && <Badge tone="diamond">Optional</Badge>}
              </p>
              {!schritt.erledigt && <p className="mt-0.5 text-sm text-cream/65">{schritt.text}</p>}
              {schritt.aktion && <div className="mt-3">{schritt.aktion}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
