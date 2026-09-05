import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, CalendarDays, DraftingCompass, Map as MapIcon, Radio, Store, Trophy, Users, type LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Panel } from "@/components/ui/Panel";
import { getUpcomingEvents } from "@/lib/event-types";
import { relativeDays } from "@/lib/format";
import { navItems, type NavKey } from "@/lib/nav";
import { listPlayers } from "@/lib/players";
import { listShops } from "@/lib/shops";
import { getLiveStreamers } from "@/lib/streamers";

/**
 * Einstieg direkt unter dem Hero: pro Menüpunkt eine Karte.
 *
 * Die Liste kommt aus navItems, damit Navigation und Karten nicht auseinander
 * laufen. Wo es etwas Aktuelles zu sagen gibt (offene Shops, nächster Termin,
 * Live-Streams), steht es als zweite Zeile drin – sonst eine kurze Beschreibung.
 */

type CardMeta = { icon: LucideIcon; key: NavKey; accent: "brass" | "diamond" };

const meta: Record<string, CardMeta> = {
  "/map": { icon: MapIcon, key: "map", accent: "diamond" },
  "/shops": { icon: Store, key: "shops", accent: "brass" },
  "/spieler": { icon: Users, key: "spieler", accent: "diamond" },
  "/community": { icon: CalendarDays, key: "community", accent: "brass" },
  "/leaderboards": { icon: Trophy, key: "leaderboards", accent: "brass" },
  "/schematics": { icon: DraftingCompass, key: "schematics", accent: "diamond" },
  "/streams": { icon: Radio, key: "streams", accent: "diamond" },
};

export async function MenuCards() {
  const now = new Date();
  const [shops, liveStreamers, spieler, t, tNav] = await Promise.all([
    listShops(),
    getLiveStreamers(),
    listPlayers(),
    getTranslations("MenuCards"),
    getTranslations("Nav"),
  ]);
  const online = spieler.filter((p) => p.online).length;
  const nextEvent = getUpcomingEvents(now)[0];
  const openShops = shops.filter((shop) => shop.open).length;

  /** Aktuelles schlägt die allgemeine Beschreibung – aber nur, wenn es etwas gibt. */
  const live: Record<string, string | null> = {
    "/shops": openShops > 0 ? t("shopsOpen", { count: openShops }) : null,
    "/community": nextEvent ? t("nextEvent", { title: nextEvent.title, relative: relativeDays(nextEvent.start, now) }) : null,
    "/spieler": online > 0 ? t("playersOnline", { count: online }) : null,
    "/streams": liveStreamers.length > 0 ? t("streamsLive", { count: liveStreamers.length }) : null,
  };

  const cards = navItems.filter((item) => item.href !== "/" && meta[item.href]);

  // Kein negatives -mt mehr: Damit lagen die Karten ueber der Unterkante des
  // Heros und schnitten dessen Rahmen an. Sie setzen jetzt sauber darunter an.
  return (
    <section className="relative pt-10 pb-4 sm:pt-12">
      <Container>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((item) => {
            const { icon: Icon, key, accent } = meta[item.href];
            const hinweis = live[item.href];

            return (
              <Link key={item.href} href={item.href} className="group block">
                <Panel className="flex h-full items-start gap-4 p-5 transition-colors group-hover:border-brass-400/60">
                  <span
                    className={
                      accent === "brass"
                        ? "flex size-11 shrink-0 items-center justify-center rounded-lg border border-brass-500/40 bg-brass-500/10 text-brass-200"
                        : "flex size-11 shrink-0 items-center justify-center rounded-lg border border-diamond-400/40 bg-diamond-500/10 text-diamond-200"
                    }
                  >
                    <Icon className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-display text-lg font-bold text-cream">
                      {tNav(item.key)}
                      <ArrowRight className="size-4 text-cream/30 transition-transform group-hover:translate-x-0.5 group-hover:text-brass-200" />
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-cream/60">{t(key)}</p>
                    {hinweis && <p className="mt-2 text-sm font-semibold text-brass-200">{hinweis}</p>}
                  </div>
                </Panel>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
