import Link from "next/link";
import { ArrowRight, CalendarDays, DraftingCompass, Map as MapIcon, Radio, Store, Trophy, Users, type LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Panel } from "@/components/ui/Panel";
import { getUpcomingEvents } from "@/lib/event-types";
import { relativeDays } from "@/lib/format";
import { navItems } from "@/lib/nav";
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

type CardMeta = { icon: LucideIcon; text: string; accent: "brass" | "diamond" };

const meta: Record<string, CardMeta> = {
  "/map": { icon: MapIcon, text: "Die ganze Welt im Browser, mit allen Spielern in Echtzeit.", accent: "diamond" },
  "/shops": { icon: Store, text: "Wer was verkauft und wo der Laden steht.", accent: "brass" },
  "/spieler": { icon: Users, text: "Wer gerade spielt – und die Zahlen aller anderen.", accent: "diamond" },
  "/community": { icon: CalendarDays, text: "Termine und die Chronik des Servers.", accent: "brass" },
  "/leaderboards": { icon: Trophy, text: "Ranglisten aus der Welt und die Wirtschaft in Cog.", accent: "brass" },
  "/schematics": { icon: DraftingCompass, text: "Blaupausen zum Nachbauen mit der Schematicannon.", accent: "diamond" },
  "/streams": { icon: Radio, text: "Wer aus der Community gerade sendet.", accent: "diamond" },
};

export async function MenuCards() {
  const now = new Date();
  const [shops, liveStreamers, spieler] = await Promise.all([listShops(), getLiveStreamers(), listPlayers()]);
  const online = spieler.filter((p) => p.online).length;
  const nextEvent = getUpcomingEvents(now)[0];
  const openShops = shops.filter((shop) => shop.open).length;

  /** Aktuelles schlägt die allgemeine Beschreibung – aber nur, wenn es etwas gibt. */
  const live: Record<string, string | null> = {
    "/shops": openShops > 0 ? `${openShops} ${openShops === 1 ? "Laden hat" : "Läden haben"} geöffnet` : null,
    "/community": nextEvent ? `${nextEvent.title} – ${relativeDays(nextEvent.start, now)}` : null,
    "/spieler": online > 0 ? `${online} ${online === 1 ? "Spieler ist" : "Spieler sind"} gerade online` : null,
    "/streams":
      liveStreamers.length > 0
        ? `${liveStreamers.length} ${liveStreamers.length === 1 ? "Kanal ist" : "Kanäle sind"} gerade live`
        : null,
  };

  const cards = navItems.filter((item) => item.href !== "/" && meta[item.href]);

  return (
    <section className="relative -mt-8 pb-4">
      <Container>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((item) => {
            const { icon: Icon, text, accent } = meta[item.href];
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
                      {item.label}
                      <ArrowRight className="size-4 text-cream/30 transition-transform group-hover:translate-x-0.5 group-hover:text-brass-200" />
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-cream/60">{text}</p>
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
