import type { Metadata } from "next";
import { Cog } from "lucide-react";
import { auth } from "@/auth";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { AdminNav } from "@/components/admin/AdminNav";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getTeamUser } from "@/lib/admin";
import { istAdmin, rolleName } from "@/lib/roles";
import { countPendingApplications } from "@/lib/whitelist";

export const metadata: Metadata = {
  title: "Kontrollraum",
  description: "Admin-Bereich von VIP Craft 4.",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const team = await getTeamUser();

  if (!team) {
    const session = await auth();
    return <AccessDenied loggedIn={Boolean(session?.user)} />;
  }

  const pendingCount = await countPendingApplications();

  return (
    <>
      <PageHeader
        eyebrow={rolleName(team.role)}
        icon={Cog}
        title="Kontrollraum"
        description={
          istAdmin(team.role)
            ? "Whitelist-Anträge prüfen, Spieler und Beiträge verwalten, Server-Einstellungen anpassen."
            : "Whitelist-Anträge prüfen, Spieler und Beiträge verwalten. Server-Steuerung und Einstellungen bleiben beim Admin."
        }
      />
      <Container className="grid gap-6 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <AdminNav pendingCount={pendingCount} istAdmin={istAdmin(team.role)} />
        </aside>
        <div className="min-w-0">{children}</div>
      </Container>
    </>
  );
}
