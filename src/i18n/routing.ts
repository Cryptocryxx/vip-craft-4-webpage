import { defineRouting } from "next-intl/routing";

/**
 * Sprachrouting für die ganze Seite.
 *
 * `localePrefix: "as-needed"` heißt: Deutsch (die Vorgabe) bleibt an den
 * heutigen Adressen (`/dashboard`, `/spieler/...`) – keine Weiterleitung, kein
 * verlorenes Suchmaschinen-Ranking. Englisch bekommt eigene, eindeutige
 * Adressen unter `/en/...`. Das ist für SEO der bessere Weg, wenn eine
 * bestehende Seite eine Sprache dazubekommt: eigene URL pro Sprache (damit
 * Google beide Fassungen einzeln finden und per hreflang verknüpfen kann,
 * siehe `alternateLinks`), aber ohne die bestehende deutsche URL anzufassen.
 */
export const routing = defineRouting({
  locales: ["de", "en"],
  defaultLocale: "de",
  localePrefix: "as-needed",

  // Setzt automatisch den Link-Header mit hreflang-Angaben auf jeder Antwort,
  // damit Suchmaschinen die deutsche und die englische Fassung als
  // Übersetzungen derselben Seite erkennen. Ist ohnehin die Vorgabe – hier nur
  // ausgeschrieben, damit die Absicht nicht verloren geht.
  alternateLinks: true,

  localeCookie: {
    name: "VIPCRAFT_LOCALE",
    // Ein Jahr - wer einmal umschaltet, soll es nicht bei jedem Besuch neu tun.
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  },
});

export type AppLocale = (typeof routing.locales)[number];
