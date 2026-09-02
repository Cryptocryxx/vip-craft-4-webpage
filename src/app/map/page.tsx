import type { Metadata } from "next";
import { Compass, Layers, Map as MapIcon, TrainTrack } from "lucide-react";
import { MapFrame } from "@/components/map/MapFrame";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Live-Map",
  description: "Die Live-Karte von VIP Craft 4 – Basen, Bahnstrecken und Spieler in Echtzeit.",
};

const tips = [
  {
    icon: Layers,
    title: "Ebenen & Dimensionen",
    text: "Oben rechts zwischen Overworld, Nether und End wechseln. Marker-Ebenen (Bahnhöfe, Shops) lassen sich einzeln ausblenden.",
  },
  {
    icon: Compass,
    title: "Spieler finden",
    text: "In der Spielerliste auf einen Namen klicken, um die Karte auf die Person zu zentrieren. Spieler im Sneak-Modus sind unsichtbar.",
  },
  {
    icon: TrainTrack,
    title: "Bahnstrecken",
    text: "Das Zugnetz wird als eigene Marker-Ebene gerendert. Bahnhöfe zeigen beim Anklicken den nächsten Halt des Nordexpress.",
  },
];

export default function MapPage() {
  return (
    <>
      <PageHeader
        eyebrow="Squaremap"
        icon={MapIcon}
        title="Live-Karte"
        description="Basen, Bahnstrecken und wer gerade wo unterwegs ist – direkt aus der Welt gerendert und alle paar Minuten aktualisiert."
      />
      <Container className="py-8">
        <MapFrame src={siteConfig.mapUrl} />

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {tips.map((tip) => {
            const Icon = tip.icon;
            return (
              <Panel key={tip.title} className="p-5">
                <span className="flex size-10 items-center justify-center rounded-lg border border-diamond-400/40 bg-diamond-500/10 text-diamond-200">
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-3 font-display text-base font-bold text-cream">{tip.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-cream/65">{tip.text}</p>
              </Panel>
            );
          })}
        </div>
      </Container>
    </>
  );
}
