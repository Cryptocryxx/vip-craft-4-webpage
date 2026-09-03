import type { Metadata } from "next";
import { CalendarDays, ScrollText, Users } from "lucide-react";
import { EventGrid } from "@/components/community/EventGrid";
import { Timeline } from "@/components/community/Timeline";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getUpcomingEvents } from "@/lib/mock/events";
import { milestones } from "@/lib/mock/timeline";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Community & Events",
  description: "Event-Kalender und Server-Timeline von VIP Craft 4.",
};

export default async function CommunityPage() {
  const now = new Date();
  const events = getUpcomingEvents(now);
  const settings = await getSiteSettings();

  return (
    <>
      <PageHeader
        eyebrow="Community-Hub"
        icon={Users}
        title="Events & Lore"
        description="Was auf dem Server ansteht – und was bisher passiert ist. Vom ersten Wasserrad bis zur letzten Explosion."
      >
        <div className="flex flex-wrap gap-2">
          <Button href="#events" variant="outline" size="sm">
            <CalendarDays className="size-4" /> Kalender
          </Button>
          <Button href="#lore" variant="outline" size="sm">
            <ScrollText className="size-4" /> Timeline
          </Button>
        </div>
      </PageHeader>

      <Container className="space-y-24 py-12">
        <section id="events" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Kalender"
            icon={CalendarDays}
            title="Kommende Ingame-Events"
            description="Alle Zeiten in deutscher Zeit (Europe/Berlin). Für Erinnerungen abonniere die Events im Discord."
            action={
              <Button href={settings.discordInvite} variant="outline" size="sm" target="_blank" rel="noopener noreferrer">
                <DiscordIcon className="size-4" /> Event vorschlagen
              </Button>
            }
          />
          <EventGrid events={events} now={now} />
        </section>

        <section id="lore" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Die Lore"
            icon={ScrollText}
            title="Server-Timeline"
            description="Meilensteine der Season – neueste zuerst. Wer etwas Erwähnenswertes gebaut (oder gesprengt) hat, meldet sich im Discord."
          />
          <Timeline milestones={milestones} />
        </section>
      </Container>
    </>
  );
}
