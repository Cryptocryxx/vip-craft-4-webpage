import { Gamepad2, ScrollText, Users } from "lucide-react";
import { ServerPlayerRow } from "@/components/admin/ServerPlayerRow";
import { UserRow, type AdminUserRow } from "@/components/admin/UserRow";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { requireAdmin } from "@/lib/admin";
import { formatDate, timeAgo } from "@/lib/format";
import { listPlayers, recentAudits } from "@/lib/players";
import { prisma } from "@/lib/prisma";

const auditLabels: Record<string, string> = {
  KICK: "Gekickt",
  BAN: "Gebannt",
  UNBAN: "Entbannt",
  IP_VIEW: "IP abgerufen",
};

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const [spieler, audits] = await Promise.all([listPlayers(), recentAudits(25)]);

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

      <section className="mt-12">
        <SectionHeading
          eyebrow="Auf dem Server"
          icon={Gamepad2}
          title="Minecraft-Spieler"
          description="Alle, die schon einmal auf dem Server waren – unabhängig davon, ob sie hier einen Account haben."
          className="mb-5"
        />
        <Panel className="overflow-hidden">
          {spieler.length === 0 ? (
            <p className="p-10 text-center text-sm text-cream/60">
              Noch war niemand auf dem Server – oder die Verbindung zu Crafty steht nicht.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {spieler.map((p) => (
                <ServerPlayerRow
                  key={p.name}
                  name={p.name}
                  online={p.online}
                  playtimeHours={p.stats?.playtimeHours ?? null}
                />
              ))}
            </ul>
          )}
        </Panel>
        <p className="mt-3 text-xs leading-relaxed text-cream/45">
          Kicken geht nur, solange jemand online ist. Bannen und Entbannen wirken sofort auf dem Server. Jede IP-Abfrage
          wird unten protokolliert – eine IP-Adresse ist ein personenbezogenes Datum, deshalb steht sie nicht einfach in
          der Liste.
        </p>
      </section>

      <section className="mt-12">
        <SectionHeading
          eyebrow="Protokoll"
          icon={ScrollText}
          title="Eingriffe an Spielern"
          description="Wer hat was mit wem gemacht – inklusive jeder IP-Abfrage."
          className="mb-5"
        />
        <Panel className="overflow-hidden">
          {audits.length === 0 ? (
            <p className="p-10 text-center text-sm text-cream/60">Noch keine Eingriffe.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {audits.map((eintrag) => (
                <li key={eintrag.id} className="flex flex-wrap items-center gap-3 p-4">
                  <Badge tone={eintrag.success ? "brass" : "rose"}>
                    {auditLabels[eintrag.type] ?? eintrag.type}
                  </Badge>
                  <span className="font-semibold text-cream">{eintrag.target}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-cream/60">{eintrag.detail}</span>
                  <span className="text-xs text-cream/45">
                    {eintrag.actorName ?? "System"} · {timeAgo(eintrag.createdAt)} · {formatDate(eintrag.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>
    </div>
  );
}
