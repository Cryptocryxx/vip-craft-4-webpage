"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const namen: Record<string, string> = { de: "DE", en: "EN" };

/**
 * Zwei kleine Links, kein Dropdown: "DE" / "EN", die aktive Sprache nur als
 * Text ohne Link. `Link` mit einem expliziten `locale` verlinkt dieselbe Seite
 * in der anderen Sprache (next-intl hängt den Präfix an oder lässt ihn weg,
 * je nach `localePrefix` in i18n/routing.ts) und merkt sich die Wahl im
 * Cookie `VIPCRAFT_LOCALE` – der nächste Besuch ohne erkennbare Sprache in
 * der URL nimmt dann diese, nicht mehr die des Browsers.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const aktuell = useLocale();
  const pathname = usePathname();

  return (
    <div className={cn("flex items-center gap-1 font-mono text-xs tracking-wider", className)}>
      {routing.locales.map((locale, index) => (
        <span key={locale} className="flex items-center gap-1">
          {index > 0 && <span className="text-cream/25">·</span>}
          {locale === aktuell ? (
            <span className="text-brass-200" aria-current="true">
              {namen[locale]}
            </span>
          ) : (
            <Link href={pathname} locale={locale} className="text-cream/50 transition-colors hover:text-brass-200">
              {namen[locale]}
            </Link>
          )}
        </span>
      ))}
    </div>
  );
}
