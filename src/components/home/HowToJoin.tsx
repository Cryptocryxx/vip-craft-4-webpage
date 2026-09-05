import { getTranslations } from "next-intl/server";
import { Download, Rocket, Route, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModpackLink } from "@/components/ui/ModpackLink";
import { Container } from "@/components/ui/Container";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { Gear } from "@/components/ui/Gear";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { siteConfig } from "@/lib/config";

/** `serverIp` ist null, solange der Besucher nicht freigeschaltet ist. */
export async function HowToJoin({ serverIp, discordInvite }: { serverIp: string | null; discordInvite: string }) {
  const t = await getTranslations("HowToJoin");

  const steps = [
    {
      title: t("step1Title"),
      description: t("step1Description"),
      icon: ShieldCheck,
    },
    {
      title: t("step2Title"),
      description: t("step2Description"),
      icon: Users,
    },
    {
      title: t("step3Title"),
      description: t("step3Description", { modpackName: siteConfig.modpackName }),
      icon: Download,
    },
    {
      title: t("step4Title"),
      description: serverIp
        ? t("step4DescriptionReady", { serverIp })
        : t("step4DescriptionPending"),
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
          <SectionHeading eyebrow={t("eyebrow")} icon={Route} title={t("title")} className="mb-10" />
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
              <ShieldCheck className="size-4" /> {t("applyWhitelist")}
            </Button>
            <Button href={discordInvite} variant="outline" target="_blank" rel="noopener noreferrer">
              <DiscordIcon className="size-4" /> {t("discord")}
            </Button>
            <ModpackLink variant="outline">
              <Download className="size-4" /> {t("modpack")}
            </ModpackLink>
          </div>
        </Panel>
      </Container>
    </section>
  );
}
