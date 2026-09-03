import type { Metadata } from "next";
import { Store } from "lucide-react";
import { ShopGrid } from "@/components/shops/ShopGrid";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { SPURS_PER_COG } from "@/lib/currency";
import { listShops } from "@/lib/shops";

export const metadata: Metadata = {
  title: "Shops",
  description: "Alle Spieler-Shops auf VIP Craft 4 – wer was verkauft und wo.",
};

export default async function ShopsPage() {
  const shops = await listShops();

  return (
    <>
      <PageHeader
        eyebrow="Handel"
        icon={Store}
        title="Spieler-Shops"
        description={`Wer verkauft was, und wo steht der Laden? Bezahlt wird mit Create: Numismatics – gerechnet in Cog, einem Cog entsprechen ${SPURS_PER_COG} Spurs.`}
      >
        <Button href="/dashboard#shops" variant="outline" size="sm">
          <Store className="size-4" /> Eigenen Shop eintragen
        </Button>
      </PageHeader>

      <Container className="py-10">
        <ShopGrid shops={shops} />
      </Container>
    </>
  );
}
