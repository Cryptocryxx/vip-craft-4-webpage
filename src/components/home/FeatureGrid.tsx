import { CalendarDays, Cog, DraftingCompass, Map as MapIcon, ShieldCheck, TrainFront, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  accent: "brass" | "diamond";
};

const features: Feature[] = [
  {
    icon: Cog,
    title: "Create 6 im Zentrum",
    description: "Mechanische Fabriken, Sequenced Assembly, Zahnräder überall – das Modpack ist rund um Create gebaut und läuft stabil.",
    accent: "brass",
  },
  {
    icon: TrainFront,
    title: "Gemeinsames Zugnetz",
    description: "Ein serverweites Streckennetz mit Bahnhöfen an jeder Basis. Fahrplan im Discord, Signale inklusive.",
    accent: "diamond",
  },
  {
    icon: MapIcon,
    title: "Live-Karte",
    description: "Squaremap zeigt Basen, Bahnstrecken und Spieler in Echtzeit – direkt im Browser.",
    href: "/map",
    accent: "diamond",
  },
  {
    icon: ShieldCheck,
    title: "Whitelist direkt hier beantragen",
    description:
      "Mit Discord einloggen, Gamertag eintragen, fertig – der Antrag entsteht automatisch und das Team schaltet dich frei.",
    href: "/dashboard",
    accent: "brass",
  },
  {
    icon: CalendarDays,
    title: "Events & Lore",
    description: "Zugrennen, Build-Contests, Boss-Fights – und eine Timeline, die festhält, welche Basis wann explodiert ist.",
    href: "/community",
    accent: "brass",
  },
  {
    icon: DraftingCompass,
    title: "Schematic-Galerie",
    description: "Teile deine Maschinen als .nbt-Blaupause – andere laden sie mit der Schematicannon nach.",
    href: "/schematics",
    accent: "diamond",
  },
];

export function FeatureGrid() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          eyebrow="Was den Server ausmacht"
          icon={Cog}
          title="Werkstatt statt Wüste"
          description="VIP Craft 4 ist kein Vanilla-Server mit ein paar Mods, sondern eine gemeinsame Fabrik. Das sind die wichtigsten Features."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            const body = (
              <Panel rivets className="group h-full p-6 transition-colors hover:border-brass-400/60">
                <div className="flex items-start justify-between">
                  <span
                    className={
                      feature.accent === "brass"
                        ? "flex size-11 items-center justify-center rounded-lg border border-brass-500/40 bg-brass-500/10 text-brass-200"
                        : "flex size-11 items-center justify-center rounded-lg border border-diamond-400/40 bg-diamond-500/10 text-diamond-200"
                    }
                  >
                    <Icon className="size-5" />
                  </span>
                  {feature.href && (
                    <ArrowUpRight className="size-4 text-cream/30 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brass-200" />
                  )}
                </div>
                <h3 className="mt-4 text-lg font-bold text-cream">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cream/65">{feature.description}</p>
              </Panel>
            );

            return feature.href ? (
              <Link key={feature.title} href={feature.href} className="block">
                {body}
              </Link>
            ) : (
              <div key={feature.title}>{body}</div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
