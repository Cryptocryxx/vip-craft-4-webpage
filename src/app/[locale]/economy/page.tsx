import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Building2, Coins, Trophy } from "lucide-react";
import { Kennzahlen } from "@/components/economy/Kennzahlen";
import { Muenzkunde } from "@/components/economy/Muenzkunde";
import { Organisationen } from "@/components/economy/Organisationen";
import { Vermoegensrangliste } from "@/components/economy/Vermoegensrangliste";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getEconomyData } from "@/lib/economy-source";

/** So viele Spieler stehen in der Rangliste auf der Seite. */
const RANGLISTE_LAENGE = 10;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("EconomyPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/**
 * Alles zur Wirtschaft an einem Ort: Kontostände, gemeinsame Konten
 * („Organisationen"), Vermögen und die Münzen selbst. Die Daten kommen aus der
 * Bankdatei des Servers, siehe lib/economy-source.ts.
 */
export default async function EconomyPage() {
  const [{ overview, source }, t] = await Promise.all([getEconomyData(), getTranslations("EconomyPage")]);

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} icon={Coins} title={t("title")} description={t("description")}>
        <div className="flex flex-wrap gap-2">
          <Button href="#vermoegen" variant="outline" size="sm">
            <Trophy className="size-4" /> {t("wealth")}
          </Button>
          <Button href="#organisationen" variant="outline" size="sm">
            <Building2 className="size-4" /> {t("organisations")}
          </Button>
          <Button href="#muenzen" variant="outline" size="sm">
            <Coins className="size-4" /> {t("coins")}
          </Button>
        </div>
      </PageHeader>

      <Container className="space-y-16 py-12">
        {source !== "live" ? (
          <Panel className="p-10 text-center">
            <Coins className="mx-auto size-10 text-brass-500/40" />
            <p className="mt-3 font-display text-lg font-bold text-cream">{t("emptyTitle")}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-cream/60">{t("emptyText")}</p>
          </Panel>
        ) : (
          <>
            <section>
              <Kennzahlen data={overview} />
              <p className="mt-3 text-xs text-cream/45">
                {overview.stand ? t("sourceFile", { stand: overview.stand }) : t("sourceExport")}
              </p>
            </section>

            <section id="vermoegen" className="scroll-mt-24">
              <SectionHeading eyebrow={t("wealth")} icon={Trophy} title={t("wealthHeading")} description={t("wealthDescription")} />
              <Vermoegensrangliste zeilen={overview.vermoegen.slice(0, RANGLISTE_LAENGE)} />
            </section>

            <section id="organisationen" className="scroll-mt-24">
              <SectionHeading
                eyebrow={t("organisations")}
                icon={Building2}
                title={t("orgHeading")}
                description={t("orgDescription")}
              />
              <Organisationen organisationen={overview.organisationen} />
            </section>

            <section id="muenzen" className="scroll-mt-24">
              <SectionHeading eyebrow={t("coins")} icon={Coins} title={t("coinHeading")} description={t("coinDescription")} />
              <Muenzkunde />
            </section>
          </>
        )}
      </Container>
    </>
  );
}
