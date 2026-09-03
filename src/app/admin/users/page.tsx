import { Users } from "lucide-react";
import { UserRow, type AdminUserRow } from "@/components/admin/UserRow";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      minecraftName: true,
      twitchName: true,
      whitelisted: true,
      role: true,
      createdAt: true,
      _count: { select: { suggestions: true, applications: true } },
    },
  });

  const rows: AdminUserRow[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    minecraftName: user.minecraftName,
    twitchName: user.twitchName,
    whitelisted: user.whitelisted,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    suggestionCount: user._count.suggestions,
    applicationCount: user._count.applications,
  }));

  return (
    <div>
      <SectionHeading
        eyebrow="Datenbank"
        icon={Users}
        title="Spieler verwalten"
        description="Gamertag, Twitch-Kanal, Rolle und Whitelist direkt bearbeiten. Änderungen wirken sofort auf der ganzen Seite."
        className="mb-5"
      />
      <Panel className="overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-cream/60">Noch niemand registriert.</p>
        ) : (
          rows.map((user) => <UserRow key={user.id} user={user} isSelf={user.id === admin.id} />)
        )}
      </Panel>
      <p className="mt-3 text-xs text-cream/45">
        Deine eigene Rolle lässt sich nicht ändern und dein Account nicht löschen, damit der Kontrollraum erreichbar bleibt.
      </p>
    </div>
  );
}
