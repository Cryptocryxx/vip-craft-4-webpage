import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Leaderboards & Economy",
  description: "Hall of Fame, Hall of Shame und die Wirtschaft von VIP Craft 4.",
};

export default async function LeaderboardsPage() {
  const [fame, shame, economy] = await Promise.all([
    getLeaderboardData("fame"),
    getLeaderboardData("shame"),
    getEconomyData(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Rankings"
        icon={Trophy}
        title="Leaderboards & Economy"
        description="Globale Rankings aus der Welt – Ruhm für die Fleißigen, Spott für alle, die schon wieder in die Lava gefallen sind."
      >
        <div className="flex flex-wrap gap-2">
          <Button href="#hall-of-fame" variant="outline" size="sm">
            <Trophy className="size-4" /> Hall of Fame
          </Button>
          <Button href="#hall-of-shame" variant="outline" size="sm">
            <Skull className="size-4" /> Hall of Shame
          </Button>
          <Button href="#economy" variant="outline" size="sm">
            <Coins className="size-4" /> Wirtschaft
          </Button>
        </div>
      </PageHeader>

      <Container className="space-y-24 py-12">
        <section id="hall-of-fame" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Hall of Fame"
            icon={Trophy}
            title="Die Fleißigen"
            description={
              fame.source === "live"
                ? "Live aus den Statistikdateien des Servers – die Top 10 jeder Kategorie."
                : "Sobald der Server Statistiken geschrieben hat, stehen hier die Top 10 jeder Kategorie."
            }
          />
          <LeaderboardTabs boards={fame.boards} tone="fame" />
        </section>

        <section id="hall-of-shame" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Hall of Shame"
            icon={Skull}
            title="Die Unvorsichtigen"
            description={
              shame.source === "live"
                ? "Wer zählt, verliert. Tode, Creeper und eingesteckter Schaden – direkt vom Server."
                : "Tode, Creeper und eingesteckter Schaden – sobald es etwas zu zählen gibt."
            }
          />
          <LeaderboardTabs boards={shame.boards} tone="shame" />
        </section>

        <section id="economy" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Wirtschaft"
            icon={Coins}
            title="Cogs & Sparfüchse"
            description={`Bezahlt wird mit Create: Numismatics. Gerechnet wird in Cog – ein Cog sind ${SPURS_PER_COG} Spurs. Hier siehst du, wie viel Geld im Umlauf ist und wer am meisten davon gehortet hat.`}
          />
          <EconomyOverview data={economy.overview} source={economy.source} />
        </section>
      </Container>
    </>
  );
}
