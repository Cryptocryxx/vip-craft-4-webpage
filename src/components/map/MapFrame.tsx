"use client";

import { useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Gear } from "@/components/ui/Gear";
import { cn } from "@/lib/utils";

/** Großformatige Squaremap-Einbettung mit Ladeanzeige und Toolbar. */
export function MapFrame({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  function reload() {
    setLoaded(false);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="panel-blueprint overflow-hidden p-1.5 sm:p-2">
      <div className="flex items-center justify-between gap-3 px-2 py-1.5">
        <p className="truncate font-mono text-xs text-diamond-200/80">{src}</p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={reload} className="btn btn-ghost btn-sm" title="Karte neu laden">
            <RefreshCw className="size-3.5" />
            <span className="hidden sm:inline">Neu laden</span>
          </button>
          <a href={src} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="In neuem Tab öffnen">
            <ExternalLink className="size-3.5" />
            <span className="hidden sm:inline">Neuer Tab</span>
          </a>
        </div>
      </div>

      <div className="relative h-[72vh] min-h-[440px] overflow-hidden rounded-lg border border-diamond-400/20 bg-diamond-950">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-diamond-200">
            <Gear className="size-14 text-diamond-400/70 animate-gear-spin [animation-duration:6s]" teeth={10} />
            <p className="font-display text-sm tracking-wide">Karte wird geladen…</p>
          </div>
        )}
        <iframe
          key={reloadKey}
          src={src}
          title="VIP Craft 4 – Live-Karte (Squaremap)"
          className={cn("size-full transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0")}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
