import type { Metadata } from "next";
import { Users } from "lucide-react";
import { auth } from "@/auth";
import { PlayerCard } from "@/components/players/PlayerCard";
import { RefreshStatsButton } from "@/components/players/RefreshStatsButton";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listPlayers } from "@/lib/players";

export const metadata: Metadata = {
  title: "Spieler",
  description: "Wer gerade auf VIP Craft 4 online ist – und die Statistiken aller Spieler.",
};

export default async function SpielerPage() {
  const [spieler, session] = await Promise.all([listPlayers(), auth()]);
  const online = spieler.filter((p) => p.online);
  const offline = spieler.filter((p) => !p.online);

  return (
    <>
      <PageHeader
        eyebrow="Wer ist da?"
        icon={Users}
        title="Spieler"
        description="Wer gerade auf dem Server unterwegs ist – und was alle anderen bisher angestellt haben. Klick auf jemanden für die vollständigen Zahlen."
      />

      <Container className="space-y-12 py-10">
        <section>
          <SectionHeading
            eyebrow="Gerade online"
            icon={Users}
            title={online.length === 1 ? "1 Spieler ist da" : `${online.length} Spieler sind da`}
            description="Live vom Server, aktualisiert sich etwa jede Minute."
            className="mb-5"
          />

          {online.length === 0 ? (
            <Panel className="p-10 text-center text-sm text-cream/60">
              Gerade ist niemand online. Vielleicht ein guter Moment, selbst anzufangen.
            </Panel>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {online.map((p) => (
                <PlayerCard key={p.name} player={p} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeading
            eyebrow="Alle"
            icon={Users}
            title="Schon mal da gewesen"
            description="Nach Spielzeit sortiert. Die Zahlen schreibt Minecraft beim Ausloggen – wer gerade spielt, ist hier also noch nicht auf dem neuesten Stand."
            className="mb-5"
          />

          <div className="mb-5">
            <RefreshStatsButton eingeloggt={Boolean(session?.user)} />
          </div>

          {offline.length === 0 ? (
            <Panel className="p-10 text-center text-sm text-cream/60">
              Außer den gerade Anwesenden war noch niemand hier.
            </Panel>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offline.map((p) => (
                <PlayerCard key={p.name} player={p} />
              ))}
            </div>
          )}
        </section>
      </Container>
    </>
  );
}
