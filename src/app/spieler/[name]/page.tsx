import type { Metadata } from "next";
import Link from "next/link";
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
  return {
    title: `${spieler} – Spieler`,
    description: `Ingame-Statistiken von ${spieler} auf VIP Craft 4.`,
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
  const spieler = await findPlayer(decodeURIComponent(name));
  if (!spieler) notFound();

  const s = spieler.stats;

  const aktivitaet: Kachel[] = s
    ? [
        { icon: Clock, label: "Spielzeit", wert: formatHours(s.playtimeHours) },
        { icon: Pickaxe, label: "Blöcke abgebaut", wert: formatNumber(s.blocksMined) },
        { icon: Footprints, label: "Strecke zu Fuß", wert: formatDistanceKm(s.walkedKm) },
        { icon: Plane, label: "Strecke geflogen", wert: formatDistanceKm(s.flownKm) },
      ]
    : [];

  const create: Kachel[] = s
    ? [
        { icon: Cog, label: "Andesit-Legierung", wert: formatNumber(s.andesiteAlloyCrafted), hinweis: "hergestellt" },
        { icon: Cog, label: "Zahnräder", wert: formatNumber(s.cogwheelsPlaced), hinweis: "kleine, platziert" },
        { icon: Cog, label: "Große Zahnräder", wert: formatNumber(s.largeCogwheelsPlaced), hinweis: "platziert" },
        { icon: TrainTrack, label: "Zugschienen", wert: formatNumber(s.trackPlaced), hinweis: "verlegt" },
        { icon: Wrench, label: "Create-Bauteile", wert: formatNumber(s.createParts), hinweis: "benutzt" },
        { icon: Plane, label: "Aeronautics-Teile", wert: formatNumber(s.aeronauticsParts), hinweis: "benutzt" },
      ]
    : [];

  const rest: Kachel[] = s
    ? [
        { icon: Skull, label: "Tode", wert: formatNumber(s.deaths) },
        { icon: Bomb, label: "Tode durch Creeper", wert: formatNumber(s.deathsByCreeper) },
        { icon: Swords, label: "Mobs erledigt", wert: formatNumber(s.mobKills) },
        { icon: Heart, label: "Schaden erlitten", wert: `${formatNumber(s.damageTaken)} ♥` },
        { icon: Store, label: "Shop & Bank", wert: formatNumber(s.shopInteractions), hinweis: "Interaktionen" },
        { icon: Cake, label: "Kuchen", wert: formatNumber(s.cakeUsed), hinweis: "benutzt" },
      ]
    : [];


  return (
    <Container className="py-10">
      <Link href="/spieler" className="btn btn-ghost btn-sm mb-6">
        <ArrowLeft className="size-4" /> Alle Spieler
      </Link>

      <Panel rivets className="flex flex-wrap items-center gap-5 p-6">
        <PlayerHead name={spieler.name} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold text-cream">{spieler.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {spieler.online ? <Badge tone="emerald">Gerade online</Badge> : <Badge tone="neutral">Offline</Badge>}
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
          <Gruppe titel="Aktivität" kacheln={aktivitaet} />
          <Gruppe titel="Create & Aeronautics" kacheln={create} />
          <Gruppe titel="Leben und Handel" kacheln={rest} />

          <p className="text-xs leading-relaxed text-cream/45">
            Minecraft schreibt diese Zahlen erst beim Ausloggen oder wenn der Server speichert.
            {spieler.online && " Weil dieser Spieler gerade online ist, fehlt hier alles aus der laufenden Sitzung."} Auf
            der Übersicht lässt sich ein Speichern anstoßen.
          </p>
        </div>
      ) : (
        <Panel className="mt-8 p-10 text-center">
          <SectionHeading
            eyebrow="Noch nichts da"
            icon={Clock}
            title="Keine Statistiken"
            description={`Der Server hat für ${spieler.name} noch keine Statistikdatei geschrieben. Sie entsteht beim ersten Ausloggen.`}
          />
        </Panel>
      )}
    </Container>
  );
}
