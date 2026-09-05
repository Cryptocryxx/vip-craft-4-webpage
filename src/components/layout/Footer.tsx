import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CookieSettingsLink } from "@/components/legal/CookieSettingsLink";
import { Container } from "@/components/ui/Container";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { ModpackLink } from "@/components/ui/ModpackLink";
import { siteConfig } from "@/lib/config";
import { navItems } from "@/lib/nav";
import { getSiteSettings } from "@/lib/settings";
import { viewerMaySeeServerIp } from "@/lib/viewer";

export async function Footer() {
  const [settings, darfIpSehen, t, tNav] = await Promise.all([
    getSiteSettings(),
    viewerMaySeeServerIp(),
    getTranslations("Footer"),
    getTranslations("Nav"),
  ]);
  const year = new Date().getFullYear();

  // Rechtstexte bleiben bewusst deutsch (bindende Fassung) - die englische
  // Fassung bekommt nur einen Hinweis dazu, siehe legalLanguageNote.
  const legalLinks = [
    { href: "/impressum", label: t("impressum") },
    { href: "/datenschutz", label: t("datenschutz") },
    { href: "/nutzungsbedingungen", label: t("nutzungsbedingungen") },
  ] as const;

  return (
    <footer className="mt-24 border-t border-brass-500/20 bg-wood-950/70">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={32} height={32} />
            <span className="font-display text-lg font-bold">
              <span className="text-diamond">VIP Craft</span> <span className="text-brass">4</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-cream/60">{t("tagline")}</p>
          <p className="mt-4 font-mono text-xs text-cream/50">
            {darfIpSehen ? (
              <>
                {t("serverIpLabel")} <span className="text-brass-200">{settings.serverIp}</span>
              </>
            ) : (
              t("serverIpHidden")
            )}
          </p>
        </div>

        <div>
          <p className="eyebrow mb-3">{t("pagesHeading")}</p>
          <ul className="grid grid-cols-2 gap-1.5 text-sm">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-cream/70 transition-colors hover:text-brass-200">
                  {tNav(item.key)}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/dashboard" className="text-cream/70 transition-colors hover:text-brass-200">
                {t("dashboard")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-3">{t("communityHeading")}</p>
          <ul className="space-y-1.5 text-sm">
            <li>
              <a
                href={settings.discordInvite}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-cream/70 transition-colors hover:text-brass-200"
              >
                <DiscordIcon className="size-4" /> {t("discord")}
              </a>
            </li>
            <li>
              <ModpackLink className="inline-flex items-center gap-2 text-cream/70 transition-colors hover:text-brass-200">
                <ExternalLink className="size-4" /> {t("downloadModpack")}
              </ModpackLink>
            </li>
            <li>
              <a
                href={settings.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-cream/70 transition-colors hover:text-brass-200"
              >
                <ExternalLink className="size-4" /> {t("mapNewTab")}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-3">{t("legalHeading")}</p>
          <ul className="space-y-1.5 text-sm">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-cream/70 transition-colors hover:text-brass-200">
                  {link.label}
                  <span className="text-cream/40">{t("legalLanguageNote")}</span>
                </Link>
              </li>
            ))}
            <li>
              <CookieSettingsLink className="text-cream/70" />
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-white/5 py-4">
        <Container className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-center text-xs text-cream/40 sm:text-left">
            {t("copyright", { year, name: siteConfig.name })}
          </p>
          <nav aria-label={t("legalNav")} className="flex shrink-0 gap-4 text-xs">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-cream/50 transition-colors hover:text-brass-200">
                {link.label}
              </Link>
            ))}
            <CookieSettingsLink className="text-cream/50" />
          </nav>
        </Container>
      </div>
    </footer>
  );
}
