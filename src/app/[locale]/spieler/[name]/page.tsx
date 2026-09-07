import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUp,
  Bomb,
  Cake,
  Clock,
  Coins,
  Cog,
  Footprints,
  Heart,
  Pickaxe,
  Plane,
  Skull,
  Store,
  Swords,
  TrainTrack,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatCogsLong } from "@/lib/currency";
import { todeVonSpieler } from "@/lib/death-log";
import { formatDistanceKm, formatHours, formatNumber } from "@/lib/format";
import { findPlayer } from "@/lib/players";

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const spieler = decodeURIComponent(name);
  const t = await getTranslations("PlayerDetailPage");
  return {
    title: t("metaTitle", { name: spieler }),
    description: t("metaDescription", { name: spieler }),
  };
}

type Kachel = { icon: LucideIcon; label: string; wert: string; hinweis?: string };

/** Eine beschriftete Reihe Kacheln. Ausserhalb der Seite, damit React sie nicht bei jedem Rendern neu erzeugt. */
function Gruppe({ titel, kacheln }: { titel: string; kacheln: Kachel[] }) {
  if (kacheln.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 font-display text-sm font-bold tracking-wide text-brass-200 uppercase">{titel}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kacheln.map((k) => {
          const Icon = k.icon;
          return (
            <Panel key={k.label} className="p-4">
              <p className="flex items-center gap-1.5 text-[11px] tracking-wider text-cream/50 uppercase">
                <Icon className="size-3.5 shrink-0 text-brass-300" />
                <span className="truncate">{k.label}</span>
              </p>
              <p className="mt-1.5 font-display text-lg leading-none font-bold text-cream">{k.wert}</p>
              {k.hinweis && <p className="mt-1 text-[11px] text-cream/45">{k.hinweis}</p>}
            </Panel>
          );
        })}
      </div>
    </section>
  );
}

/** Woran jemand gestorben ist und wie die Duelle ausgingen. */
async function TodesBilanz({ name }: { name: string }) {
  const [bilanz, t, tUrsache] = await Promise.all([
    todeVonSpieler(name),
    getTranslations("PlayerDetailPage"),
    getTranslations("DeathCauses"),
  ]);

  // Kreaturen und Spieler heißen wie sie heißen; nur die Umweltursachen
  // stecken als Schlüssel in den Übersetzungen.
  const beschriftung = (art: string, schluessel: string) =>
    art === "umwelt" ? tUrsache(schluessel) : schluessel;

  const hatDuelle = bilanz.getoetet.length > 0 || bilanz.gefallenDurch.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h2 className="mb-3 font-display text-sm font-bold tracking-wide text-brass-200 uppercase">
          {t("deathCausesTitle")}
        </h2>
        <Panel className="p-5">
          {bilanz.ursachen.length === 0 ? (
            <p className="text-sm text-cream/55">{t("deathCausesEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {bilanz.ursachen.map((ursache) => (
                <li key={`${ursache.art}:${ursache.schluessel}`} className="flex items-center gap-3 text-sm">
                  <Skull
                    className={
                      ursache.art === "spieler"
                        ? "size-4 shrink-0 text-rose-300"
                        : ursache.art === "kreatur"
                          ? "size-4 shrink-0 text-brass-300"
                          : "size-4 shrink-0 text-cream/35"
                    }
                  />
                  <span className="min-w-0 flex-1 truncate text-cream/85">
                    {beschriftung(ursache.art, ursache.schluessel)}
                  </span>
                  <span className="font-mono text-cream/60">
                    {ursache.anzahl}
                    {t("timesShort")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 border-t border-white/5 pt-3 text-[11px] leading-relaxed text-cream/40">
            {t("deathCausesNote")}
          </p>
        </Panel>
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-bold tracking-wide text-brass-200 uppercase">{t("pvpTitle")}</h2>
        <Panel className="p-5">
          {!hatDuelle ? (
            <p className="text-sm text-cream/55">{t("pvpNone")}</p>
          ) : (
            <div className="space-y-4">
              {bilanz.getoetet.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs tracking-wider text-emerald-300/80 uppercase">
                    <Swords className="size-3.5" /> {t("pvpKilled")}
                  </p>
                  <ul className="space-y-1.5">
                    {bilanz.getoetet.map((eintrag) => (
                      <li key={eintrag.name} className="flex items-center gap-2 text-sm">
                        <PlayerHead name={eintrag.name} size={20} />
                        <span className="min-w-0 flex-1 truncate text-cream/85">{eintrag.name}</span>
                        <span className="font-mono text-cream/60">
                          {eintrag.anzahl}
                          {t("timesShort")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {bilanz.gefallenDurch.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs tracking-wider text-rose-300/80 uppercase">
                    <Skull className="size-3.5" /> {t("pvpKilledBy")}
                  </p>
                  <ul className="space-y-1.5">
                    {bilanz.gefallenDurch.map((eintrag) => (
                      <li key={eintrag.name} className="flex items-center gap-2 text-sm">
                        <PlayerHead name={eintrag.name} size={20} />
                        <span className="min-w-0 flex-1 truncate text-cream/85">{eintrag.name}</span>
                        <span className="font-mono text-cream/60">
                          {eintrag.anzahl}
                          {t("timesShort")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}

export default async function SpielerDetailPage({ params }: Props) {
  const { name } = await params;
  const [spieler, t] = await Promise.all([findPlayer(decodeURIComponent(name)), getTranslations("PlayerDetailPage")]);
  if (!spieler) notFound();

  const s = spieler.stats;

  const aktivitaet: Kachel[] = s
    ? [
        { icon: Clock, label: t("playtime"), wert: formatHours(s.playtimeHours) },
        { icon: Pickaxe, label: t("blocksMined"), wert: formatNumber(s.blocksMined) },
        { icon: Footprints, label: t("walkedDistance"), wert: formatDistanceKm(s.walkedKm) },
        {
          icon: ArrowUp,
          label: t("airborneDistance"),
          wert: formatDistanceKm(s.airborneKm),
          hinweis: t("airborneDistanceHint"),
        },
      ]
    : [];

  const create: Kachel[] = s
    ? [
        { icon: Cog, label: t("andesiteAlloy"), wert: formatNumber(s.andesiteAlloyCrafted), hinweis: t("andesiteAlloyHint") },
        { icon: Cog, label: t("cogwheels"), wert: formatNumber(s.cogwheelsPlaced), hinweis: t("cogwheelsHint") },
        { icon: Cog, label: t("largeCogwheels"), wert: formatNumber(s.largeCogwheelsPlaced), hinweis: t("largeCogwheelsHint") },
        { icon: TrainTrack, label: t("railTrack"), wert: formatNumber(s.trackPlaced), hinweis: t("railTrackHint") },
        { icon: Wrench, label: t("createParts"), wert: formatNumber(s.createParts), hinweis: t("createPartsHint") },
        { icon: Plane, label: t("aeronauticsParts"), wert: formatNumber(s.aeronauticsParts), hinweis: t("aeronauticsPartsHint") },
      ]
    : [];

  const rest: Kachel[] = s
    ? [
        { icon: Skull, label: t("deaths"), wert: formatNumber(s.deaths) },
        { icon: Bomb, label: t("deathsByCreeper"), wert: formatNumber(s.deathsByCreeper) },
        { icon: Swords, label: t("mobKills"), wert: formatNumber(s.mobKills) },
        { icon: Heart, label: t("damageTaken"), wert: `${formatNumber(s.damageTaken)} ♥` },
        { icon: Store, label: t("shopAndBank"), wert: formatNumber(s.shopInteractions), hinweis: t("shopAndBankHint") },
        { icon: Cake, label: t("cake"), wert: formatNumber(s.cakeUsed), hinweis: t("cakeHint") },
      ]
    : [];


  return (
    <Container className="py-10">
      <Link href="/spieler" className="btn btn-ghost btn-sm mb-6">
        <ArrowLeft className="size-4" /> {t("allPlayers")}
      </Link>

      <Panel rivets className="flex flex-wrap items-center gap-5 p-6">
        <PlayerHead name={spieler.name} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold text-cream">{spieler.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {spieler.online ? <Badge tone="emerald">{t("onlineNow")}</Badge> : <Badge tone="neutral">{t("offline")}</Badge>}
            {spieler.balanceSpurs !== null && (
              <Badge tone="brass">
                <Coins className="size-3" /> {formatCogsLong(spieler.balanceSpurs)}
              </Badge>
            )}
          </div>
        </div>
      </Panel>

      {s ? (
        <div className="mt-8 space-y-8">
          <Gruppe titel={t("activity")} kacheln={aktivitaet} />
          <Gruppe titel={t("createAndAeronautics")} kacheln={create} />
          <Gruppe titel={t("lifeAndTrade")} kacheln={rest} />

          <p className="text-xs leading-relaxed text-cream/45">
            {t("statsNote")}
            {spieler.online && t("onlineNote")}
            {t("statsNoteEnd")}
          </p>
        </div>
      ) : (
        <Panel className="mt-8 p-10 text-center">
          <SectionHeading
            eyebrow={t("noStatsEyebrow")}
            icon={Clock}
            title={t("noStatsTitle")}
            description={t("noStatsDescription", { name: spieler.name })}
          />
        </Panel>
      )}

      {/* Ausserhalb des Stats-Blocks: Tode stehen im Spielprotokoll, nicht in
          den Statistikdateien - die eine Quelle kann fehlen, die andere trotzdem
          etwas zu erzaehlen haben. */}
      <div className="mt-8">
        <TodesBilanz name={spieler.name} />
      </div>
    </Container>
  );
}
