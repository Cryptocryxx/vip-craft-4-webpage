import Link from "next/link";
import { ArrowRight, Clock, MessageSquare, ShieldCheck, Users } from "lucide-react";
import { StatTile } from "@/components/admin/StatTile";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatShortDate, timeAgo } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";

export default async function AdminOverviewPage() {
  const [userCount, whitelistedCount, pendingCount, suggestionCount, recentUsers, settings] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { whitelisted: true } }),
    prisma.whitelistApplication.count({ where: { status: "PENDING" } }),
    prisma.suggestion.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, minecraftName: true, whitelisted: true, createdAt: true },
    }),
    getSiteSettings(),
  ]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Users} label="Registriert" value={userCount} hint="Discord-Logins insgesamt" />
        <StatTile
          icon={ShieldCheck}
          label="Gewhitelisted"
          value={whitelistedCount}
          tone="emerald"
          hint={`${userCount - whitelistedCount} noch offen`}
        />
        <StatTile
          icon={Clock}
          label="Offene Anträge"
          value={pendingCount}
          tone={pendingCount > 0 ? "diamond" : "brass"}
          hint={pendingCount > 0 ? "warten auf Prüfung" : "alles abgearbeitet"}
        />
        <StatTile icon={MessageSquare} label="Vorschläge" value={suggestionCount} hint="im Vorschlags-Board" />
      </div>

      {pendingCount > 0 && (
        <Link href="/admin/whitelist" className="group block">
          <Panel
            variant="blueprint"
            className="flex flex-wrap items-center justify-between gap-4 p-5 transition-colors group-hover:border-diamond-300/60"
          >
            <div>
              <p className="eyebrow">Zu erledigen</p>
              <p className="mt-1 font-display text-lg font-bold text-cream">
                {pendingCount} {pendingCount === 1 ? "Antrag wartet" : "Anträge warten"} auf deine Entscheidung
              </p>
            </div>
            <span className="btn btn-diamond btn-sm">
              Anträge prüfen <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Panel>
        </Link>
      )}

      <section>
        <SectionHeading eyebrow="Zuletzt dazugekommen" title="Neue Spieler" className="mb-4" />
        <Panel className="overflow-hidden">
          {recentUsers.length === 0 ? (
            <p className="p-8 text-center text-sm text-cream/55">Noch niemand registriert.</p>
          ) : (
            <ul>
              {recentUsers.map((user) => (
                <li key={user.id} className="flex items-center gap-3 border-t border-white/5 px-5 py-3 first:border-t-0">
                  {user.minecraftName ? (
                    <PlayerHead name={user.minecraftName} size={26} />
                  ) : (
                    <span className="size-[26px] rounded-[3px] bg-white/5" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-semibold text-cream">{user.name ?? "Unbekannt"}</span>
                  {user.whitelisted ? <Badge tone="emerald">Whitelist</Badge> : <Badge tone="neutral">Offen</Badge>}
                  <span className="hidden text-xs text-cream/45 sm:inline">{timeAgo(user.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <section>
        <SectionHeading eyebrow="Aktive Konfiguration" title="Server-Einstellungen" className="mb-4" />
        <Panel className="p-5">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs tracking-wider text-cream/50 uppercase">Server-Adresse</dt>
              <dd className="mt-0.5 font-mono text-sm text-cream">{settings.serverIp}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wider text-cream/50 uppercase">Whitelist</dt>
              <dd className="mt-0.5 text-sm">
                {settings.whitelistOpen ? (
                  <Badge tone="emerald">Anträge offen</Badge>
                ) : (
                  <Badge tone="rose">Anträge geschlossen</Badge>
                )}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs tracking-wider text-cream/50 uppercase">Karte</dt>
              <dd className="mt-0.5 truncate font-mono text-sm text-cream/80">{settings.mapUrl}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wider text-cream/50 uppercase">Ankündigung</dt>
              <dd className="mt-0.5 text-sm text-cream/80">
                {settings.announcementActive && settings.announcement ? settings.announcement : "keine aktiv"}
              </dd>
            </div>
          </dl>
          <Link
            href="/admin/settings"
            className="mt-4 inline-flex items-center gap-1 text-xs text-brass-200 hover:text-brass-100"
          >
            Einstellungen bearbeiten <ArrowRight className="size-3" />
          </Link>
        </Panel>
      </section>

      <p className="text-xs text-cream/35">Stand: {formatShortDate(new Date())}</p>
    </div>
  );
}
