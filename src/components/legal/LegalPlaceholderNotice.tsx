import { AlertTriangle } from "lucide-react";
import { missingLegalFields } from "@/lib/legal";

/**
 * Sichtbare Warnung, solange Pflichtangaben noch Platzhalter sind.
 * Verschwindet automatisch, sobald `src/lib/legal.ts` vollständig ausgefüllt ist.
 */
export function LegalPlaceholderNotice() {
  const missing = missingLegalFields();
  if (missing.length === 0) return null;

  return (
    <div className="rounded-xl border border-rose-400/50 bg-rose-500/10 p-5">
      <p className="flex items-center gap-2 font-display font-bold text-rose-100">
        <AlertTriangle className="size-5 shrink-0" />
        Diese Seite ist noch nicht vollständig
      </p>
      <p className="mt-2 text-sm text-rose-100/85">
        Bevor die Website öffentlich erreichbar ist, müssen die folgenden Pflichtangaben in{" "}
        <code className="font-mono">src/lib/legal.ts</code> eingetragen werden. Ein unvollständiges Impressum kann
        abgemahnt werden.
      </p>
      <ul className="mt-3 grid gap-1 text-sm text-rose-100/80 sm:grid-cols-2">
        {missing.map((field) => (
          <li key={field} className="flex items-start gap-1.5">
            <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-rose-300" />
            {field}
          </li>
        ))}
      </ul>
    </div>
  );
}
