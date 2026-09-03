"use client";

import { useState } from "react";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { ConsentGate } from "@/components/ui/ConsentGate";
import { Gear } from "@/components/ui/Gear";
import type { EmbedCheckResult } from "@/lib/embed-check";
import { cn } from "@/lib/utils";

const unavailableCopy: Record<"blocked" | "unreachable", { title: string; text: string }> = {
  blocked: {
    title: "Karte kann hier nicht eingebettet werden",
    text: "Der Kartenserver erlaubt das Einbetten auf dieser Seite gerade nicht. Das ist eine Servereinstellung, keine Sache bei dir.",
  },
  unreachable: {
    title: "Karte gerade nicht erreichbar",
    text: "Der Kartenserver antwortet gerade nicht. Versuch es später noch einmal.",
  },
};

/** Großformatige BlueMap-Einbettung mit Ladeanzeige und Toolbar. */
export function MapFrame({ src, availability }: { src: string; availability: EmbedCheckResult }) {
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  function reload() {
    setLoaded(false);
    setReloadKey((k) => k + 1);
  }

  let host = src;
  try {
    host = new URL(src).host;
  } catch {
    // ungültige URL: dann eben die Rohangabe anzeigen
  }

  if (!availability.embeddable) {
    const copy = unavailableCopy[availability.reason];
    return (
      <div className="panel-blueprint overflow-hidden p-1.5 sm:p-2">
        <div className="flex items-center justify-between gap-3 px-2 py-1.5">
          <p className="truncate font-mono text-xs text-diamond-200/80">{src}</p>
        </div>
        <div className="relative flex h-[72vh] min-h-[440px] flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-diamond-400/20 bg-diamond-950 p-8 text-center">
          <AlertTriangle className="size-12 text-diamond-400/60" />
          <p className="font-display text-lg font-bold text-cream">{copy.title}</p>
          <p className="max-w-md text-sm text-cream/60">{copy.text}</p>
          <a href={src} target="_blank" rel="noopener noreferrer" className="btn btn-diamond btn-md mt-2">
            <ExternalLink className="size-4" /> Karte direkt öffnen
          </a>
        </div>
      </div>
    );
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
        <ConsentGate
          category="map"
          provider={host}
          description="Die Weltkarte wird als eingebettete Seite von diesem Anbieter geladen. Dabei wird deine IP-Adresse dorthin übertragen. Deine Entscheidung merken wir uns lokal in deinem Browser."
          buttonLabel="Karte laden"
          privacyUrl="/datenschutz"
          privacyLabel="Mehr dazu in unserer Datenschutzerklärung"
          className="size-full"
        >
          <>
            {!loaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-diamond-200">
                <Gear className="size-14 text-diamond-400/70 animate-gear-spin [animation-duration:6s]" teeth={10} />
                <p className="font-display text-sm tracking-wide">Karte wird geladen…</p>
              </div>
            )}
            <iframe
              key={reloadKey}
              src={src}
              title="VIP Craft 4 – Live-Karte (BlueMap)"
              className={cn("size-full transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0")}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer"
              onLoad={() => setLoaded(true)}
            />
          </>
        </ConsentGate>
      </div>
    </div>
  );
}
