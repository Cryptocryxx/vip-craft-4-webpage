import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Coins, Skull, Trophy } from "lucide-react";
import { EconomyOverview } from "@/components/leaderboards/EconomyOverview";
import { LeaderboardTabs } from "@/components/leaderboards/LeaderboardTabs";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SPURS_PER_COG } from "@/lib/currency";
import { getEconomyData } from "@/lib/economy-source";
import { getLeaderboardData } from "@/lib/leaderboard-source";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("LeaderboardsPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function LeaderboardsPage() {
  const [fame, shame, economy, t] = await Promise.all([
    getLeaderboardData("fame"),
    getLeaderboardData("shame"),
    getEconomyData(),
    getTranslations("LeaderboardsPage"),
  ]);

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} icon={Trophy} title={t("title")} description={t("description")}>
        <div className="flex flex-wrap gap-2">
          <Button href="#hall-of-fame" variant="outline" size="sm">
            <Trophy className="size-4" /> {t("hallOfFame")}
          </Button>
          <Button href="#hall-of-shame" variant="outline" size="sm">
            <Skull className="size-4" /> {t("hallOfShame")}
          </Button>
          <Button href="#economy" variant="outline" size="sm">
            <Coins className="size-4" /> {t("economy")}
          </Button>
        </div>
      </PageHeader>

      <Container className="space-y-24 py-12">
        <section id="hall-of-fame" className="scroll-mt-24">
          <SectionHeading
            eyebrow={t("hallOfFame")}
            icon={Trophy}
            title={t("fameTitle")}
            description={fame.source === "live" ? t("fameLive") : t("famePending")}
          />
          <LeaderboardTabs boards={fame.boards} tone="fame" />
        </section>

        <section id="hall-of-shame" className="scroll-mt-24">
          <SectionHeading
            eyebrow={t("hallOfShame")}
            icon={Skull}
            title={t("shameTitle")}
            description={shame.source === "live" ? t("shameLive") : t("shamePending")}
          />
          <LeaderboardTabs boards={shame.boards} tone="shame" />
        </section>

        <section id="economy" className="scroll-mt-24">
          <SectionHeading
            eyebrow={t("economy")}
            icon={Coins}
            title={t("economyTitle")}
            description={t("economyDescription", { spursPerCog: SPURS_PER_COG })}
          />
          <EconomyOverview data={economy.overview} source={economy.source} />
        </section>
      </Container>
    </>
  );
}
