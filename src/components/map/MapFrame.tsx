"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { ConsentGate } from "@/components/ui/ConsentGate";
import { Gear } from "@/components/ui/Gear";
import type { EmbedCheckResult } from "@/lib/embed-check";
import { cn } from "@/lib/utils";

/** Großformatige BlueMap-Einbettung mit Ladeanzeige und Toolbar. */
export function MapFrame({ src, availability }: { src: string; availability: EmbedCheckResult }) {
  const t = useTranslations("MapFrame");
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
    const copy =
      availability.reason === "blocked"
        ? { title: t("blockedTitle"), text: t("blockedText") }
        : { title: t("unreachableTitle"), text: t("unreachableText") };
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
            <ExternalLink className="size-4" /> {t("openDirectly")}
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
          <button type="button" onClick={reload} className="btn btn-ghost btn-sm" title={t("reload")}>
            <RefreshCw className="size-3.5" />
            <span className="hidden sm:inline">{t("reloadShort")}</span>
          </button>
          <a href={src} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title={t("openNewTab")}>
            <ExternalLink className="size-3.5" />
            <span className="hidden sm:inline">{t("openNewTabShort")}</span>
          </a>
        </div>
      </div>

      <div className="relative h-[72vh] min-h-[440px] overflow-hidden rounded-lg border border-diamond-400/20 bg-diamond-950">
        <ConsentGate
          category="map"
          provider={host}
          description={t("consentDescription")}
          buttonLabel={t("consentButton")}
          privacyUrl="/datenschutz"
          privacyLabel={t("consentPrivacyLabel")}
          className="size-full"
        >
          <>
            {!loaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-diamond-200">
                <Gear className="size-14 text-diamond-400/70 animate-gear-spin [animation-duration:6s]" teeth={10} />
                <p className="font-display text-sm tracking-wide">{t("loading")}</p>
              </div>
            )}
            <iframe
              key={reloadKey}
              src={src}
              title={t("title")}
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
