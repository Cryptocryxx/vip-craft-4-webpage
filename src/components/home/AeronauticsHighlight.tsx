import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
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

export async function AeronauticsHighlight() {
  const t = await getTranslations("AeronauticsHighlight");

  const parts = [
    { icon: Fan, title: t("part1Title"), text: t("part1Text") },
    { icon: Frame, title: t("part2Title"), text: t("part2Text") },
    { icon: Flame, title: t("part3Title"), text: t("part3Text") },
    { icon: Wind, title: t("part4Title"), text: t("part4Text") },
  ];

  const fett = (chunks: ReactNode) => <span className="font-semibold text-cream">{chunks}</span>;

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
              <Plane className="size-3.5" /> {t("eyebrow")}
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight font-bold text-cream sm:text-4xl">
              {t("titleLine1")} <span className="text-diamond">{t("titleHighlight")}</span>
              {t("titleLine2")}
            </h2>

            <div className="mt-5 space-y-4 text-cream/75">
              <p className="leading-relaxed">{t.rich("paragraph1", { b: fett })}</p>
              <p className="leading-relaxed">{t.rich("paragraph2", { b: fett })}</p>
              <p className="leading-relaxed">{t("paragraph3")}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Badge tone="diamond">{t("badgeVersion")}</Badge>
              <Badge tone="brass">{t("badgePhysics")}</Badge>
              <Badge tone="brass">{t("badgeDiesel")}</Badge>
              <Badge tone="copper">{t("badgeCannons")}</Badge>
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
