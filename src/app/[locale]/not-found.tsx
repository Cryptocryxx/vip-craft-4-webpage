import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Gear } from "@/components/ui/Gear";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <Gear teeth={12} className="size-24 text-brass-500/40 animate-gear-spin [animation-duration:12s]" />
      <p className="eyebrow mt-6">{t("eyebrow")}</p>
      <h1 className="mt-2 text-4xl font-bold text-cream sm:text-5xl">{t("title")}</h1>
      <p className="mt-3 max-w-md text-cream/65">{t("description")}</p>
      <Button href="/" className="mt-8">
        {t("back")}
      </Button>
    </Container>
  );
}
