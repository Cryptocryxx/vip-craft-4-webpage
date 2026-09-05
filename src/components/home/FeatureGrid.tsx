import { getTranslations } from "next-intl/server";
import { Cog, HardHat, Map as MapIcon, Plane, ShieldCheck, Store, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
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

export async function FeatureGrid() {
  const t = await getTranslations("FeatureGrid");

  const features: Feature[] = [
    { icon: Cog, title: t("createTitle"), description: t("createDescription"), accent: "brass" },
    { icon: Plane, title: t("aeronauticsTitle"), description: t("aeronauticsDescription"), accent: "diamond" },
    { icon: Store, title: t("shopsTitle"), description: t("shopsDescription"), href: "/shops", accent: "brass" },
    { icon: MapIcon, title: t("mapTitle"), description: t("mapDescription"), href: "/map", accent: "diamond" },
    {
      icon: ShieldCheck,
      title: t("whitelistTitle"),
      description: t("whitelistDescription"),
      href: "/dashboard",
      accent: "brass",
    },
    {
      icon: HardHat,
      title: t("railTitle"),
      description: t("railDescription"),
      accent: "diamond",
      planned: true,
    },
  ];

  return (
    <section className="py-20">
      <Container>
        <SectionHeading eyebrow={t("eyebrow")} icon={Cog} title={t("title")} description={t("description")} />
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
                    <Badge tone="neutral">{t("planned")}</Badge>
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
