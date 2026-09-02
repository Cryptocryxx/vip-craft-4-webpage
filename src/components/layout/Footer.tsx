import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { siteConfig } from "@/lib/config";
import { navItems } from "@/lib/nav";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-brass-500/20 bg-wood-950/70">
      <Container className="grid gap-10 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="" width={32} height={32} unoptimized />
            <span className="font-display text-lg font-bold">
              <span className="text-brass">VIP Craft</span> <span className="text-diamond">4</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-cream/60">{siteConfig.tagline}. Gebaut mit Zahnrädern, Messing und viel zu wenig Schlaf.</p>
          <p className="mt-4 font-mono text-xs text-cream/50">
            Server-IP: <span className="text-brass-200">{siteConfig.serverIp}</span>
          </p>
        </div>

        <div>
          <p className="eyebrow mb-3">Seiten</p>
          <ul className="grid grid-cols-2 gap-1.5 text-sm">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-cream/70 transition-colors hover:text-brass-200">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/dashboard" className="text-cream/70 transition-colors hover:text-brass-200">
                Dashboard
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-3">Community</p>
          <ul className="space-y-1.5 text-sm">
            <li>
              <a
                href={siteConfig.discordInvite}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-cream/70 transition-colors hover:text-brass-200"
              >
                <DiscordIcon className="size-4" /> Discord
              </a>
            </li>
            <li>
              <a
                href={siteConfig.modpackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-cream/70 transition-colors hover:text-brass-200"
              >
                <ExternalLink className="size-4" /> Modpack herunterladen
              </a>
            </li>
            <li>
              <a
                href={siteConfig.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-cream/70 transition-colors hover:text-brass-200"
              >
                <ExternalLink className="size-4" /> Karte in neuem Tab
              </a>
            </li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-white/5 py-4">
        <Container>
          <p className="text-center text-xs text-cream/40">
            © {year} {siteConfig.name} · Kein offizielles Minecraft-Produkt. Nicht von Mojang oder Microsoft genehmigt oder mit
            ihnen verbunden.
          </p>
        </Container>
      </div>
    </footer>
  );
}
