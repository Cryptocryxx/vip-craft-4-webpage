import type { Metadata } from "next";
import { Cog } from "lucide-react";
import { auth } from "@/auth";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { AdminNav } from "@/components/admin/AdminNav";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAdminUser } from "@/lib/admin";
import { countPendingApplications } from "@/lib/whitelist";

export const metadata: Metadata = {
  title: "Kontrollraum",
  description: "Admin-Bereich von VIP Craft 4.",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await getAdminUser();

  if (!admin) {
    const session = await auth();
    return <AccessDenied loggedIn={Boolean(session?.user)} />;
  }

  const pendingCount = await countPendingApplications();

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        icon={Cog}
        title="Kontrollraum"
        description="Whitelist-Anträge prüfen, Spieler und Beiträge verwalten, Server-Einstellungen anpassen."
      />
      <Container className="grid gap-6 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <AdminNav pendingCount={pendingCount} />
        </aside>
        <div className="min-w-0">{children}</div>
      </Container>
    </>
  );
}
