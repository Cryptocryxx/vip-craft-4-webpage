import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DraftingCompass, FolderOpen, Download, Wand2 } from "lucide-react";
import { SchematicGallery } from "@/components/schematics/SchematicGallery";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { getAllTags, getSchematics } from "@/lib/schematic-types";
import { getSiteSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SchematicsPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function SchematicsPage() {
  const schematics = getSchematics();
  const tags = getAllTags();
  const [settings, t] = await Promise.all([getSiteSettings(), getTranslations("SchematicsPage")]);

  const howTo = [
    { icon: Download, title: t("step1Title"), text: t("step1Text") },
    { icon: FolderOpen, title: t("step2Title"), text: t("step2Text") },
    { icon: Wand2, title: t("step3Title"), text: t("step3Text") },
  ];

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} icon={DraftingCompass} title={t("title")} description={t("description")}>
        <Button href={settings.discordInvite} variant="diamond" size="sm" target="_blank" rel="noopener noreferrer">
          <DiscordIcon className="size-4" /> {t("submitOwn")}
        </Button>
      </PageHeader>

      <Container className="space-y-12 py-10">
        <SchematicGallery schematics={schematics} tags={tags} />

        <Panel variant="blueprint" className="p-6 sm:p-8">
          <p className="eyebrow">{t("howToEyebrow")}</p>
          <ol className="mt-5 grid gap-6 sm:grid-cols-3">
            {howTo.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-diamond-300/50 bg-diamond-950 font-display text-sm font-bold text-diamond-200">
                    {index + 1}
                  </span>
                  <div>
                    <p className="flex items-center gap-2 font-display font-bold text-cream">
                      <Icon className="size-4 text-diamond-300" /> {step.title}
                    </p>
                    <p className="mt-1 text-sm text-cream/65">{step.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>
      </Container>
    </>
  );
}
