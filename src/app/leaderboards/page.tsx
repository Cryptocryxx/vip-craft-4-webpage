import type { Metadata } from "next";
import { Coins, Skull, Trophy } from "lucide-react";
import { EconomyOverview } from "@/components/leaderboards/EconomyOverview";
import { LeaderboardTabs } from "@/components/leaderboards/LeaderboardTabs";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getEconomyOverview } from "@/lib/mock/economy";
import { getLeaderboards } from "@/lib/mock/leaderboards";

export const metadata: Metadata = {
  title: "Leaderboards & Economy",
  description: "Hall of Fame, Hall of Shame und die Wirtschaft von VIP Craft 4.",
};

export default function LeaderboardsPage() {
  const fame = getLeaderboards("fame");
  const shame = getLeaderboards("shame");
  const economy = getEconomyOverview();

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
            description="Spielzeit, Rohstoffe, Bauwerke und Zug-Kilometer – die Top 10 jeder Kategorie."
          />
          <LeaderboardTabs boards={fame} tone="fame" />
        </section>

        <section id="hall-of-shame" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Hall of Shame"
            icon={Skull}
            title="Die Unvorsichtigen"
            description="Wer zählt, verliert. Lava, Creeper und die eigene Maschine sind die häufigsten Todesursachen der Season."
          />
          <LeaderboardTabs boards={shame} tone="shame" />
        </section>

        <section id="economy" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Wirtschaft"
            icon={Coins}
            title="Spurs, Shops & Sparfüchse"
            description="Währung ist der Spur aus Create: Numismatics. Hier siehst du, wer am meisten gehortet hat und wo gerade gehandelt wird."
          />
          <EconomyOverview data={economy} />
        </section>
      </Container>
    </>
  );
}
