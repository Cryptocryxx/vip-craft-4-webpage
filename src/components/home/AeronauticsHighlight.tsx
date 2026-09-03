import { Fan, Flame, Frame, Plane, Wind } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { Panel } from "@/components/ui/Panel";

/**
 * Der Aushängeschild-Abschnitt der Startseite.
 *
 * Inhaltlich abgeglichen mit dem, was tatsächlich auf dem Server liegt
 * (create-aeronautics-bundled 1.3.2, dazu aeronautical_diesel und die
 * Aeronautics-Erweiterung für Create Big Cannons).
 */

const parts = [
  {
    icon: Fan,
    title: "Propellerlager",
    text: "Nimmt die Rotation aus deinem Antrieb auf und macht daraus Schub. Größerer Propeller, mehr Zug – und mehr Kraftbedarf.",
  },
  {
    icon: Frame,
    title: "Aeronautics-Chassis",
    text: "Der Rahmen. Alles, was daran hängt, wird beim Abheben zu einem zusammenhängenden Flugkörper.",
  },
  {
    icon: Flame,
    title: "Boiler-Engine",
    text: "Erzeugt die mechanische Kraft an Bord. Wer es lauter mag, nimmt die Dieselmotoren aus dem mitgelieferten Zusatz.",
  },
  {
    icon: Wind,
    title: "Ballons",
    text: "Bringen Auftrieb statt Schub – die Grundlage für Luftschiffe und Heißluftballons.",
  },
];

export function AeronauticsHighlight() {
  return (
    <section className="relative overflow-hidden border-y border-diamond-400/20 bg-diamond-950/30 py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_30%_20%,rgba(61,211,234,0.12),transparent_70%)]"
      />

      <Container className="relative">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <div>
            <p className="eyebrow">
              <Plane className="size-3.5" /> Das Herzstück des Modpacks
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight font-bold text-cream sm:text-4xl">
              Ihr baut hier <span className="text-diamond">Flugzeuge</span>, die wirklich fliegen
            </h2>

            <div className="mt-5 space-y-4 text-cream/75">
              <p className="leading-relaxed">
                <span className="font-semibold text-cream">Create: Aeronautics</span> ist der Grund, warum dieses Pack
                anders ist als jeder andere Create-Server. Du setzt dein Fluggerät Block für Block zusammen – Rumpf,
                Tragflächen, Motor, Propeller – und dann hebt es tatsächlich ab. Vom kleinen Doppeldecker über
                Frachtluftschiffe und Heißluftballons bis zur fliegenden Basis ist alles drin.
              </p>
              <p className="leading-relaxed">
                Dahinter steckt keine Animation, sondern die Physik-Engine <span className="text-cream">Sable</span>:
                Gewicht, Auftrieb und Kollisionen werden echt gerechnet. Ein zu schwerer Rumpf kommt nicht vom Boden,
                zu wenig Auftrieb sackt dir in der Kurve weg. Das erste Modell stürzt praktisch immer ab – und genau das
                ist der Spaß daran.
              </p>
              <p className="leading-relaxed">
                Weil das Ganze auf Create aufsetzt, hängt am Ende alles zusammen: Deine Fabrik am Boden produziert die
                Teile, der Kran belädt den Frachter, und der fliegt die Ladung zur nächsten Basis.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Badge tone="diamond">Create: Aeronautics 1.3.2</Badge>
              <Badge tone="brass">Sable-Physik</Badge>
              <Badge tone="brass">Dieselmotoren</Badge>
              <Badge tone="copper">Big-Cannons-Integration</Badge>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {parts.map((part) => {
              const Icon = part.icon;
              return (
                <Panel key={part.title} className="p-5">
                  <span className="flex size-10 items-center justify-center rounded-lg border border-diamond-400/40 bg-diamond-500/10 text-diamond-200">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-3 font-display text-base font-bold text-cream">{part.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-cream/65">{part.text}</p>
                </Panel>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
