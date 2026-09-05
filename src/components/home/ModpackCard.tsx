import { Boxes, Cpu, Download, Package, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModpackLink } from "@/components/ui/ModpackLink";
import { Container } from "@/components/ui/Container";
import { Panel } from "@/components/ui/Panel";
import { siteConfig } from "@/lib/config";

/**
 * Das Modpack direkt auf der Startseite – vorher stand es nur als kleiner Knopf
 * ganz unten im Beitritts-Guide. Ohne das richtige Pack kommt niemand auf den
 * Server, also gehoert es nach oben.
 *
 * Die Angaben sind mit dem abgeglichen, was tatsaechlich auf dem Server laeuft
 * (Minecraft 1.21.1 auf NeoForge, gut 120 Mods).
 */

const eckdaten = [
  { icon: Boxes, label: "Minecraft", wert: siteConfig.minecraftVersion },
  { icon: Puzzle, label: "Loader", wert: siteConfig.loader },
  { icon: Package, label: "Mods", wert: "über 120" },
  { icon: Cpu, label: "Arbeitsspeicher", wert: `${siteConfig.minRamGb} GB` },
];

export function ModpackCard() {
  return (
    <section className="py-12">
      <Container>
        <Panel rivets className="grid gap-8 p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center sm:p-10">
          <div>
            <p className="eyebrow">
              <Download className="size-3.5" /> Das brauchst du zum Mitspielen
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight font-bold text-cream">
              Modpack <span className="text-brass">{siteConfig.modpackName}</span>
            </h2>
            <p className="mt-4 leading-relaxed text-cream/70">
              Mit dem Vanilla-Client kommst du nicht auf den Server – es braucht unser Pack. Installier es im Prism
              Launcher oder in der CurseForge-App, stell den Arbeitsspeicher auf mindestens {siteConfig.minRamGb} GB und
              trag danach die Server-Adresse ein, die du nach der Freischaltung bekommst.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <ModpackLink variant="brass">
                <Download className="size-4" /> Modpack herunterladen
              </ModpackLink>
              <Button href="/dashboard" variant="outline">
                Whitelist beantragen
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {eckdaten.map((eintrag) => {
              const Icon = eintrag.icon;
              return (
                <div key={eintrag.label} className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <p className="flex items-center gap-1.5 text-[11px] tracking-wider text-cream/50 uppercase">
                    <Icon className="size-3.5 shrink-0 text-brass-300" />
                    {eintrag.label}
                  </p>
                  <p className="mt-1.5 font-display text-lg leading-none font-bold text-cream">{eintrag.wert}</p>
                </div>
              );
            })}
          </div>
        </Panel>
      </Container>
    </section>
  );
}
