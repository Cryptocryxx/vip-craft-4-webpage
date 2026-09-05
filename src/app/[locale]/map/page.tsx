import type { Metadata } from "next";
import { headers } from "next/headers";
import { Compass, Layers, Map as MapIcon, Store } from "lucide-react";
import { MapFrame } from "@/components/map/MapFrame";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { checkIframeEmbeddable } from "@/lib/embed-check";
import { getSiteSettings } from "@/lib/settings";

/** Origin dieser Seite, wie ihn ein iframe-Embed-Ziel sehen würde (für den frame-ancestors-Abgleich). */
async function getOwnOrigin(): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const metadata: Metadata = {
  title: "Live-Map",
  description: "Die Live-Karte von VIP Craft 4 – Basen, Shops und Spieler in Echtzeit.",
};

const tips = [
  {
    icon: Layers,
    title: "Ebenen & Dimensionen",
    text: "Über das Menü oben links zwischen Overworld, Nether und End wechseln. Unter „Markers“ lassen sich einzelne Marker-Ebenen ausblenden.",
  },
  {
    icon: Compass,
    title: "Spieler finden",
    text: "Wer gerade online ist, taucht als Marker direkt auf der Karte auf.",
  },
  {
    icon: Store,
    title: "Shops suchen",
    text: "Die Koordinaten aller eingetragenen Läden stehen im Shop-Bereich – auf der Karte eingeben und hinfliegen.",
  },
];

export default async function MapPage() {
  const [settings, ownOrigin] = await Promise.all([getSiteSettings(), getOwnOrigin()]);
  const availability = await checkIframeEmbeddable(settings.mapUrl, ownOrigin);

  return (
    <>
      <PageHeader
        eyebrow="BlueMap"
        icon={MapIcon}
        title="Live-Karte"
        description="Basen, Landeplätze und wer gerade wo unterwegs ist – direkt aus der Welt gerendert und alle paar Minuten aktualisiert."
      />
      <Container className="py-8">
        <MapFrame src={settings.mapUrl} availability={availability} />

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
