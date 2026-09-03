"use client";

import { useSyncExternalStore } from "react";

/**
 * Einwilligungsverwaltung für externe Inhalte.
 *
 * Technisch notwendige Cookies (Login-Sitzung, CSRF-Schutz) sind nach
 * § 25 Abs. 2 Nr. 2 TDDDG einwilligungsfrei und daher nicht Teil dieser Auswahl.
 * Einwilligungspflichtig sind nur Einbettungen Dritter, die beim Laden auf das
 * Endgerät zugreifen bzw. Daten an Dritte übertragen (§ 25 Abs. 1 TDDDG,
 * Art. 6 Abs. 1 lit. a DSGVO).
 */

export const CONSENT_STORAGE_KEY = "vipcraft.consent";
export const CONSENT_VERSION = 1;

/** Wird ausgelöst, wenn sich die Auswahl ändert. */
export const CONSENT_CHANGED_EVENT = "vipcraft:consent-changed";
/** Öffnet das Banner erneut (z. B. über den Link im Footer). */
export const CONSENT_OPEN_EVENT = "vipcraft:consent-open";

export const CONSENT_CATEGORIES = ["twitch", "map"] as const;
export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

export type ConsentState = {
  version: number;
  decidedAt: string;
} & Record<ConsentCategory, boolean>;

/** "unknown" = serverseitig bzw. während der Hydration noch nicht bekannt. */
export type ConsentSnapshot = ConsentState | null | "unknown";

export const consentCategoryInfo: Record<
  ConsentCategory,
  { label: string; provider: string; description: string; privacyUrl: string }
> = {
  twitch: {
    label: "Twitch-Streams",
    provider: "Twitch Interactive, Inc. (USA)",
    description:
      "Zeigt Übertragungen direkt auf der Streams-Seite. Beim Laden werden deine IP-Adresse und Browserdaten an Twitch übertragen; Twitch kann dabei Cookies setzen.",
    privacyUrl: "https://www.twitch.tv/p/legal/privacy-notice/",
  },
  map: {
    label: "Kartenansicht",
    provider: "Anbieter der eingebetteten Weltkarte",
    description:
      "Bindet die Weltkarte auf der Map-Seite ein. Beim Laden wird deine IP-Adresse an den Anbieter der Karte übertragen.",
    privacyUrl: "/datenschutz",
  },
};

function emptyState(granted: boolean): ConsentState {
  return {
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    twitch: granted,
    map: granted,
  };
}

function parse(raw: string | null): ConsentState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    if (parsed?.version !== CONSENT_VERSION) return null; // Ältere Fassung: erneut fragen

    return {
      version: CONSENT_VERSION,
      decidedAt: typeof parsed.decidedAt === "string" ? parsed.decidedAt : new Date().toISOString(),
      twitch: parsed.twitch === true,
      map: parsed.map === true,
    };
  } catch {
    return null;
  }
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    // Kein Zugriff auf den Speicher (privates Fenster, blockierte Website-Daten)
    return null;
  }
}

// `useSyncExternalStore` vergleicht Momentaufnahmen mit Object.is. Deshalb muss
// dieselbe Referenz zurückkommen, solange sich der gespeicherte Wert nicht ändert.
let cachedRaw: string | null = null;
let cachedState: ConsentState | null = null;
let cacheInitialised = false;

/** Liest die gespeicherte Auswahl. `null` = noch keine Entscheidung getroffen. */
export function readConsent(): ConsentState | null {
  const raw = readRaw();
  if (!cacheInitialised || raw !== cachedRaw) {
    cachedRaw = raw;
    cachedState = parse(raw);
    cacheInitialised = true;
  }
  return cachedState;
}

function persist(state: ConsentState): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ohne Speicher gilt die Auswahl nur für diese Ansicht.
  }
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

/** Speichert eine vollständige Auswahl. */
export function saveConsent(choices: Record<ConsentCategory, boolean>): void {
  persist({ version: CONSENT_VERSION, decidedAt: new Date().toISOString(), ...choices });
}

export function acceptAll(): void {
  persist(emptyState(true));
}

export function rejectAll(): void {
  persist(emptyState(false));
}

/** Einzelne Kategorie freigeben – genutzt vom Platzhalter direkt am Inhalt. */
export function grantCategory(category: ConsentCategory): void {
  const current = readConsent() ?? emptyState(false);
  persist({ ...current, decidedAt: new Date().toISOString(), [category]: true });
}

/** Widerruf: Auswahl vollständig entfernen, das Banner erscheint erneut. */
export function resetConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // ignorieren
  }
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

/** Banner erneut öffnen (Footer-Link). */
export function openConsentSettings(): void {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Serverseitig ist die Auswahl unbekannt – konstante Referenz für React. */
function getServerSnapshot(): ConsentSnapshot {
  return "unknown";
}

/**
 * Aktuelle Auswahl als React-State – ohne setState im Effect.
 * Liefert "unknown", solange serverseitig gerendert bzw. hydriert wird.
 */
export function useConsentSnapshot(): ConsentSnapshot {
  return useSyncExternalStore<ConsentSnapshot>(subscribe, readConsent, getServerSnapshot);
}

/** Ist eine bestimmte Kategorie freigegeben? */
export function useCategoryConsent(category: ConsentCategory): boolean {
  const snapshot = useConsentSnapshot();
  if (snapshot === "unknown" || snapshot === null) return false;
  return snapshot[category];
}
