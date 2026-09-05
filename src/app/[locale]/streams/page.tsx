import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Radio } from "lucide-react";
import { StreamerGrid } from "@/components/streams/StreamerGrid";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { TwitchIcon } from "@/components/ui/TwitchIcon";
import { getStreamers } from "@/lib/streamers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("StreamsPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function StreamsPage() {
  const [data, t] = await Promise.all([getStreamers(), getTranslations("StreamsPage")]);

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} icon={Radio} title={t("title")} description={t("description")}>
        <Button href="/dashboard" variant="outline" size="sm">
          <TwitchIcon className="size-4" /> {t("linkOwnChannel")}
        </Button>
      </PageHeader>
      <Container className="py-12">
        <StreamerGrid data={data} />
      </Container>
    </>
  );
}
