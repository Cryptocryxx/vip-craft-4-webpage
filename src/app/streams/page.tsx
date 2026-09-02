import type { Metadata } from "next";
import { Radio } from "lucide-react";
import { StreamerGrid } from "@/components/streams/StreamerGrid";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getStreamers } from "@/lib/mock/streamers";

export const metadata: Metadata = {
  title: "Streams",
  description: "Alle Live-Streamer von VIP Craft 4 – direkt auf der Seite anschauen.",
};

export default function StreamsPage() {
  const streamers = getStreamers();

  return (
    <>
      <PageHeader
        eyebrow="Live vom Server"
        icon={Radio}
        title="Streamer"
        description="Wer gerade vom Server streamt, läuft hier direkt im offiziellen Twitch-Player. Du möchtest auch gelistet werden? Melde dich im Discord."
      />
      <Container className="py-12">
        <StreamerGrid streamers={streamers} />
      </Container>
    </>
  );
}
