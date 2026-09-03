"use client";

import type { ReactNode } from "react";
import { ExternalLink, PlayCircle, SlidersHorizontal } from "lucide-react";
import { Gear } from "@/components/ui/Gear";
import { grantCategory, openConsentSettings, useCategoryConsent, type ConsentCategory } from "@/lib/consent";

type ConsentGateProps = {
  /** Kategorie aus der zentralen Einwilligungsverwaltung. */
  category: ConsentCategory;
  /** Name des Anbieters, erscheint in der Überschrift. */
  provider: string;
  description: string;
  privacyUrl: string;
  /** Abweichende Beschriftung der Schaltfläche. */
  buttonLabel?: string;
  /** Abweichende Beschriftung des Datenschutz-Links. */
  privacyLabel?: string;
  /** Tailwind-Klassen für den Platzhalter, damit er so groß ist wie der Inhalt. */
  className?: string;
  children: ReactNode;
};

/**
 * Zwei-Klick-Lösung für externe Einbettungen: Inhalte von Drittanbietern werden
 * erst nach ausdrücklicher Einwilligung geladen (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO).
 * Die Auswahl teilt sich die zentrale Verwaltung mit dem Cookie-Hinweis.
 */
export function ConsentGate({
  category,
  provider,
  description,
  privacyUrl,
  buttonLabel,
  privacyLabel,
  className = "aspect-video w-full",
  children,
}: ConsentGateProps) {
  const granted = useCategoryConsent(category);
  const isExternal = /^https?:\/\//.test(privacyUrl);

  if (granted) return <>{children}</>;

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden bg-wood-950 p-6 text-center ${className}`}
    >
      <Gear
        teeth={12}
        className="pointer-events-none absolute -right-10 -bottom-10 size-40 text-brass-500/10 animate-gear-spin [animation-duration:24s]"
      />
      <p className="relative font-display text-base font-bold text-cream">Externer Inhalt: {provider}</p>
      <p className="relative mt-2 max-w-md text-sm leading-relaxed text-cream/65">{description}</p>

      <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => grantCategory(category)} className="btn btn-diamond btn-md">
          <PlayCircle className="size-4" />
          {buttonLabel ?? `${provider} laden`}
        </button>
        <button type="button" onClick={openConsentSettings} className="btn btn-ghost btn-md">
          <SlidersHorizontal className="size-4" />
          Einstellungen
        </button>
      </div>

      <a
        href={privacyUrl}
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="relative mt-3 inline-flex items-center gap-1 text-xs text-cream/50 transition-colors hover:text-cream/80"
      >
        {privacyLabel ?? `Datenschutzerklärung von ${provider}`}
        {isExternal && <ExternalLink className="size-3" />}
      </a>
    </div>
  );
}
