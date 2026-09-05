import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "@/i18n/routing";

/**
 * Lädt die Übersetzungsdatei für die aktuelle Anfrage.
 *
 * Bewusst über `requestLocale` statt über `next/root-params` (das next-intl
 * inzwischen empfiehlt): Root-Parameter lassen sich laut Next-Dokumentation
 * NICHT in Server Actions lesen - und genau dort brauchen wir die Sprache
 * auch, weil Formulare wie die Whitelist-Anträge ihre Rückmeldung
 * („Gespeichert.", Fehlermeldungen) aus einer Server Action heraus texten.
 * `requestLocale` funktioniert dort weiterhin, weil next-intl es aus einem
 * Header liest, den die Middleware/Proxy schon auf die eingehende Anfrage
 * gelegt hat - Server Actions laufen im selben Anfrage-Antwort-Zyklus mit.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const angefragt = await requestLocale;
  const locale = hasLocale(routing.locales, angefragt) ? angefragt : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
