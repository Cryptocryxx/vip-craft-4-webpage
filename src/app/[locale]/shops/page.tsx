import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Store } from "lucide-react";
import { ShopGrid } from "@/components/shops/ShopGrid";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { SPURS_PER_COG } from "@/lib/currency";
import { auth } from "@/auth";
import { eigeneBewertungen, listShops } from "@/lib/shops";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ShopsPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function ShopsPage() {
  const [shops, t, session] = await Promise.all([listShops(), getTranslations("ShopsPage"), auth()]);

  // Nur fuer Angemeldete nachschlagen - fuer alle anderen gibt es kein Formular,
  // das etwas voreinstellen koennte.
  const viewerId = session?.user?.id ?? null;
  const eigene = viewerId ? await eigeneBewertungen(viewerId) : undefined;

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        icon={Store}
        title={t("title")}
        description={t("description", { spursPerCog: SPURS_PER_COG })}
      >
        <Button href="/dashboard#shops" variant="outline" size="sm">
          <Store className="size-4" /> {t("addOwn")}
        </Button>
      </PageHeader>

      <Container className="py-10">
        <ShopGrid shops={shops} viewerId={viewerId} eigene={eigene} />
      </Container>
    </>
  );
}
