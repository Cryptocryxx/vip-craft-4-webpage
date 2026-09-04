import type { ReactNode } from "react";
import { Check } from "lucide-react";
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
  /** Optionaler Inhalt unter dem Schritt, etwa ein Formular oder Knoepfe. */
  aktion?: ReactNode;
};

export function WhitelistSteps({ schritte }: { schritte: Schritt[] }) {
  const offen = schritte.findIndex((schritt) => !schritt.erledigt);

  return (
    <ol className="space-y-3">
      {schritte.map((schritt, index) => {
        const istNaechster = index === offen;

        return (
          <li key={schritt.titel} className="flex gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                schritt.erledigt
                  ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200"
                  : istNaechster
                    ? "border-brass-300 bg-brass-500/25 text-brass-100"
                    : "border-white/15 bg-white/5 text-cream/40",
              )}
            >
              {schritt.erledigt ? <Check className="size-3.5" /> : index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-display text-sm font-bold",
                  schritt.erledigt ? "text-cream/55 line-through decoration-cream/25" : "text-cream",
                )}
              >
                {schritt.titel}
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
