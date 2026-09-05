import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MapPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function MapPage() {
  const [settings, ownOrigin, t] = await Promise.all([getSiteSettings(), getOwnOrigin(), getTranslations("MapPage")]);
  const availability = await checkIframeEmbeddable(settings.mapUrl, ownOrigin);

  const tips = [
    { icon: Layers, title: t("tip1Title"), text: t("tip1Text") },
    { icon: Compass, title: t("tip2Title"), text: t("tip2Text") },
    { icon: Store, title: t("tip3Title"), text: t("tip3Text") },
  ];

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} icon={MapIcon} title={t("title")} description={t("description")} />
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
