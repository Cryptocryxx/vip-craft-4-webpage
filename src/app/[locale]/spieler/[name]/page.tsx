import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
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
        { icon: Plane, label: t("flownDistance"), wert: formatDistanceKm(s.flownKm) },
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
    </Container>
  );
}
