import type { Metadata } from "next";
import { Radio } from "lucide-react";
import { StreamerGrid } from "@/components/streams/StreamerGrid";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { TwitchIcon } from "@/components/ui/TwitchIcon";
import { getStreamers } from "@/lib/streamers";

export const metadata: Metadata = {
  title: "Streams",
  description: "Alle Live-Streamer von VIP Craft 4 – direkt auf der Seite anschauen.",
};

export default async function StreamsPage() {
  const data = await getStreamers();

  return (
    <>
      <PageHeader
        eyebrow="Live vom Server"
        icon={Radio}
        title="Streamer"
        description="Wer gerade vom Server streamt, läuft hier direkt im offiziellen Twitch-Player. Verknüpfe deinen Kanal im Dashboard, dann erscheinst du automatisch, sobald du live gehst."
      >
        <Button href="/dashboard" variant="outline" size="sm">
          <TwitchIcon className="size-4" /> Eigenen Kanal verknüpfen
        </Button>
      </PageHeader>
      <Container className="py-12">
        <StreamerGrid data={data} />
      </Container>
    </>
  );
}
