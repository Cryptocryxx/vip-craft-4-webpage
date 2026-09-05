"use client";

import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const namen: Record<string, string> = { de: "DE", en: "EN" };

/**
 * Zwei kleine Links, kein Dropdown: "DE" / "EN", die aktive Sprache nur als
 * Text ohne Link.
 *
 * Bewusst ein normales <a> statt next-intl's `Link`: Der Ziel-Pfad bleibt beim
 * Wechseln auf die Standardsprache (Deutsch, kein Präfix) oft identisch zur
 * aktuellen URL, nur die Sprache ändert sich über Cookie/Präfix. next-intl
 * schreibt den Cookie dabei zwar korrekt um, aber Next' Client-Router kann den
 * schon geladenen Seitenausschnitt trotzdem aus seinem Cache wiederverwenden
 * (bekannte Einschränkung, siehe github.com/amannn/next-intl/issues/786) –
 * dann bliebe die alte Sprache sichtbar, obwohl URL und Cookie schon stimmen.
 * Ein echter Seitenaufruf umgeht das zuverlässig.
 *
 * Den Cookie setzen wir trotzdem selbst, und zwar synchron im Klick-Handler,
 * BEVOR der Browser dem <a> folgt: Sonst geht der Request mit dem alten
 * Cookie-Wert raus, und die Middleware leitet einen Wechsel auf die
 * unpräfigierte Standardsprache (Deutsch) anhand des noch-alten Cookies
 * postwendend wieder zurück auf die andere Sprache um.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const aktuell = useLocale();
  const pathname = usePathname();

  return (
    <div className={cn("flex items-center gap-1 font-mono text-xs tracking-wider", className)}>
      {routing.locales.map((locale, index) => {
        const href = locale === routing.defaultLocale ? pathname : `/${locale}${pathname}`;
        return (
          <span key={locale} className="flex items-center gap-1">
            {index > 0 && <span className="text-cream/25">·</span>}
            {locale === aktuell ? (
              <span className="text-brass-200" aria-current="true">
                {namen[locale]}
              </span>
            ) : (
              <a
                href={href}
                hrefLang={locale}
                onClick={() => {
                  const cookie = routing.localeCookie;
                  if (typeof cookie !== "object") return;
                  document.cookie = `${cookie.name}=${locale}; path=/; max-age=${cookie.maxAge}; SameSite=${cookie.sameSite}`;
                }}
                className="text-cream/50 transition-colors hover:text-brass-200"
              >
                {namen[locale]}
              </a>
            )}
          </span>
        );
      })}
    </div>
  );
}
