import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CalendarDays, ScrollText, Users } from "lucide-react";
import { EventGrid } from "@/components/community/EventGrid";
import { Timeline } from "@/components/community/Timeline";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getUpcomingEvents } from "@/lib/event-types";
import { milestones } from "@/lib/timeline-types";
import { getSiteSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CommunityPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function CommunityPage() {
  const now = new Date();
  const [events, settings, t] = await Promise.all([
    getUpcomingEvents(now),
    getSiteSettings(),
    getTranslations("CommunityPage"),
  ]);

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} icon={Users} title={t("title")} description={t("description")}>
        <div className="flex flex-wrap gap-2">
          <Button href="#events" variant="outline" size="sm">
            <CalendarDays className="size-4" /> {t("calendar")}
          </Button>
          <Button href="#lore" variant="outline" size="sm">
            <ScrollText className="size-4" /> {t("timeline")}
          </Button>
        </div>
      </PageHeader>

      <Container className="space-y-24 py-12">
        <section id="events" className="scroll-mt-24">
          <SectionHeading
            eyebrow={t("eventsEyebrow")}
            icon={CalendarDays}
            title={t("eventsTitle")}
            description={t("eventsDescription")}
            action={
              <Button href={settings.discordInvite} variant="outline" size="sm" target="_blank" rel="noopener noreferrer">
                <DiscordIcon className="size-4" /> {t("suggestEvent")}
              </Button>
            }
          />
          <EventGrid events={events} now={now} />
        </section>

        <section id="lore" className="scroll-mt-24">
          <SectionHeading eyebrow={t("loreEyebrow")} icon={ScrollText} title={t("loreTitle")} description={t("loreDescription")} />
          <Timeline milestones={milestones} />
        </section>
      </Container>
    </>
  );
}
