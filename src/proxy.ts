import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/**
 * Next.js 16 hat `middleware.ts` in `proxy.ts` umbenannt (Funktionsname
 * `proxy` statt `middleware`) – siehe AGENTS.md. Die Funktion selbst kommt
 * unverändert von next-intl: Sie liest Accept-Language bzw. das Cookie
 * VIPCRAFT_LOCALE und schreibt die Anfrage intern auf `/de/...` bzw.
 * `/en/...` um (siehe src/i18n/routing.ts).
 */
export default createMiddleware(routing);

export const config = {
  // Ohne diesen Filter liefe der Proxy auch für /api, _next und Dateien mit
  // Endung (Bilder, das Icon, …) – dort ergibt eine Sprachumschreibung
  // keinen Sinn und würde nur unnötig Arbeit kosten.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
