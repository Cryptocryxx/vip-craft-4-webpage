import { Download, Rocket, Route, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { Gear } from "@/components/ui/Gear";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { siteConfig } from "@/lib/config";

/** `serverIp` ist null, solange der Besucher nicht freigeschaltet ist. */
export function HowToJoin({ serverIp, discordInvite }: { serverIp: string | null; discordInvite: string }) {
  const steps = [
    {
      title: "Mit Discord anmelden",
      description:
        "Ein Klick auf „Login“ – dabei wird automatisch dein Whitelist-Antrag angelegt. Minecraft-Username eintragen, fertig.",
      icon: ShieldCheck,
    },
    {
      title: "Discord beitreten",
      description:
        "Der Antrag ist erst vollständig, wenn du im Discord bist. Wir prüfen das automatisch – dort läuft die Absprache und dort bekommst du Bescheid.",
      icon: Users,
    },
    {
      title: "Modpack installieren",
      description: `Lade das „${siteConfig.modpackName}“ für Prism Launcher oder CurseForge herunter. Mindestens 6 GB RAM empfohlen.`,
      icon: Download,
    },
    {
      title: "Verbinden & loslegen",
      description: serverIp
        ? `Du bist freigeschaltet: Server-IP ${serverIp} eintragen, Startkit am Spawn abholen und losbauen.`
        : "Sobald das Team dich freischaltet, findest du die Server-Adresse hier und in deinem Dashboard.",
      icon: Rocket,
    },
  ];

  return (
    <section className="relative py-20">
      <Container>
        <Panel variant="blueprint" className="overflow-hidden p-8 sm:p-12">
          <Gear
            teeth={16}
            className="pointer-events-none absolute -right-24 -bottom-24 size-72 text-diamond-300/10 animate-gear-spin-reverse"
          />
          <SectionHeading
            eyebrow="Bauplan: So kommst du drauf"
            icon={Route}
            title="In vier Schritten auf den Server"
            className="mb-10"
          />
          <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full border border-diamond-300/50 bg-diamond-950 font-display text-sm font-bold text-diamond-200 shadow-glow-diamond">
                      {index + 1}
                    </span>
                    <Icon className="size-5 text-diamond-200" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-cream">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-cream/65">{step.description}</p>
                </li>
              );
            })}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button href="/dashboard" variant="diamond">
              <ShieldCheck className="size-4" /> Whitelist beantragen
            </Button>
            <Button href={discordInvite} variant="outline" target="_blank" rel="noopener noreferrer">
              <DiscordIcon className="size-4" /> Discord
            </Button>
            <Button href={siteConfig.modpackUrl} variant="outline" target="_blank" rel="noopener noreferrer">
              <Download className="size-4" /> Modpack
            </Button>
          </div>
        </Panel>
      </Container>
    </section>
  );
}
