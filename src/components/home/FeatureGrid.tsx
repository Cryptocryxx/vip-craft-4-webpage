import { Cog, HardHat, Map as MapIcon, Plane, ShieldCheck, Store, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  accent: "brass" | "diamond";
  /** Gibt es noch nicht – wird gerade gebaut. */
  planned?: boolean;
};

const features: Feature[] = [
  {
    icon: Cog,
    title: "Create 6 im Zentrum",
    description:
      "Mechanische Fabriken, Sequenced Assembly, Zahnräder überall – das Modpack ist rund um Create gebaut und läuft stabil.",
    accent: "brass",
  },
  {
    icon: Plane,
    title: "Create: Aeronautics",
    description:
      "Das Highlight des Packs: Flugzeuge, Luftschiffe und Heißluftballons, die du Block für Block selbst baust. Propellerlager treiben an, Aeronautics-Chassis halten den Rumpf zusammen, Boiler-Engines liefern die Kraft. Geflogen wird mit echter Physik – die Sable-Engine rechnet Gewicht und Auftrieb mit, und ein zu schwerer Rumpf hebt schlicht nicht ab.",
    accent: "diamond",
  },
  {
    icon: Store,
    title: "Spieler-Shops",
    description:
      "Handel mit Create: Numismatics, gerechnet in Cog. Deinen Laden trägst du selbst ein – er ist sofort für alle sichtbar, ohne Freigabe.",
    href: "/shops",
    accent: "brass",
  },
  {
    icon: MapIcon,
    title: "Live-Karte",
    description: "BlueMap zeigt die ganze Welt und wer gerade wo unterwegs ist – direkt im Browser.",
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
    icon: HardHat,
    title: "Gemeinsames Zugnetz",
    description:
      "Ein serverweites Streckennetz mit Bahnhöfen an jeder Basis – geplant und gerade im Bau. Wer mitverlegen will, meldet sich im Discord.",
    accent: "diamond",
    planned: true,
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
                  {feature.planned ? (
                    <Badge tone="neutral">Im Bau</Badge>
                  ) : (
                    feature.href && (
                      <ArrowUpRight className="size-4 text-cream/30 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brass-200" />
                    )
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
