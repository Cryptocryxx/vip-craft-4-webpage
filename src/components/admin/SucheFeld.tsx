"use client";

import { Search, X } from "lucide-react";

type Props = {
  wert: string;
  setzen: (wert: string) => void;
  platzhalter: string;
  /** Etwa „3 von 18" – steht nur da, solange wirklich gesucht wird. */
  treffer?: string | null;
};

/** Suchfeld über einer Liste im Kontrollraum. Filtert im Browser, ohne Neuladen. */
export function SucheFeld({ wert, setzen, platzhalter, treffer }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-cream/35" />
        <input
          type="search"
          value={wert}
          onChange={(e) => setzen(e.target.value)}
          placeholder={platzhalter}
          aria-label={platzhalter}
          className="input pl-9"
        />
        {wert && (
          <button
            type="button"
            onClick={() => setzen("")}
            aria-label="Suche zurücksetzen"
            className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-cream/45 hover:bg-white/5 hover:text-cream"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {treffer && <span className="font-mono text-xs text-cream/45">{treffer}</span>}
    </div>
  );
}
