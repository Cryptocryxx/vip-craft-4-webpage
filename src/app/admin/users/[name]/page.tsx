import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Coins,
  ExternalLink,
  MessageSquare,
  MessagesSquare,
  ScrollText,
  ShieldCheck,
  Skull,
  Terminal,
  UserRound,
} from "lucide-react";
import { GameLogList } from "@/components/admin/GameLogList";
import { RefreshLogButton } from "@/components/admin/RefreshLogButton";
import { ServerPlayerRow } from "@/components/admin/ServerPlayerRow";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatTile } from "@/components/admin/StatTile";
import { requireTeam } from "@/lib/admin";
import { formatCogsLong } from "@/lib/currency";
import { formatDate, formatHours, formatNumber, timeAgo } from "@/lib/format";
import { holeDiscordNachrichten } from "@/lib/discord-chat";
import { bekannteSpieler, holeEreignisse, ladeVerlauf, spielerZahlen } from "@/lib/game-log";
import { auditsFuer, findPlayer } from "@/lib/players";
import { prisma } from "@/lib/prisma";
import { istAdmin, rolleName } from "@/lib/roles";
import { applicationStatusLabels, type ApplicationStatus } from "@/lib/whitelist-types";

/**
 * Alles über einen Spieler an einem Ort: Zahlen, Chat, Befehle, Eingriffe.
 *
 * Schlüssel ist der Minecraft-Name, nicht die Account-Id: Der Verlauf hängt am
 * Namen (bzw. der UUID) aus dem Spiel, und es sollen auch Leute eine Seite
 * haben, die auf dem Server waren, ohne sich je auf der Website anzumelden.
 */

type Props = { params: Promise<{ name: string }> };

const auditLabels: Record<string, string> = {
  KICK: "Gekickt",
  BAN: "Gebannt",
  UNBAN: "Entbannt",
  IP_VIEW: "IP abgerufen",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} – Kontrollraum`, robots: { index: false, follow: false } };
}

export default async function AdminSpielerDetailPage({ params }: Props) {
  const team = await requireTeam();
  const darfAlles = istAdmin(team.role);
  const { name: roh } = await params;
  const gesucht = decodeURIComponent(roh);

  // Frisch nachsehen, bevor die Seite gebaut wird (eigene Sperre, siehe game-log).
  await Promise.all([holeEreignisse(), holeDiscordNachrichten()]);

  // Die Schreibweise aus dem Spiel gewinnt: Danach wird der Verlauf gesucht,
  // und SQLite vergleicht Zeichenketten Zeichen für Zeichen.
  const namen = await bekannteSpieler();
  const name = namen.find((eintrag) => eintrag.toLowerCase() === gesucht.toLowerCase()) ?? gesucht;

  const [profil, zahlen, verlauf, audits, konten] = await Promise.all([
    findPlayer(name),
    spielerZahlen(name),
    ladeVerlauf({ name, take: 60 }),
    auditsFuer(name),
    prisma.user.findMany({
      where: { NOT: { minecraftName: null } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        whitelisted: true,
        whitelistPending: true,
        whitelistSuspended: true,
        discordJoined: true,
        minecraftName: true,
        minecraftUuid: true,
        createdAt: true,
        applications: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, status: true, createdAt: true, reviewNote: true, message: true },
        },
      },
    }),
  ]);

  const account = konten.find((eintrag) => eintrag.minecraftName?.toLowerCase() === name.toLowerCase()) ?? null;

  return (
    <div>
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-cream/60 hover:text-brass-200"
      >
        <ArrowLeft className="size-4" /> Zurück zur Spielerliste
      </Link>

      <div className="mb-5 flex flex-wrap items-center gap-4">
        <PlayerHead name={name} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold text-cream">{name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {profil?.online ? <Badge tone="emerald">Online</Badge> : <Badge tone="neutral">Offline</Badge>}
            {account ? (
              <>
                <Badge tone="brass">{rolleName(account.role)}</Badge>
                {account.whitelisted ? (
                  <Badge tone="emerald">Whitelist</Badge>
                ) : (
                  <Badge tone="neutral">Keine Whitelist</Badge>
                )}
                {account.whitelistPending && <Badge tone="diamond">Vorgemerkt</Badge>}
                {account.whitelistSuspended && <Badge tone="rose">Ausgesetzt</Badge>}
                {account.discordJoined ? (
                  <Badge tone="emerald">Im Discord</Badge>
                ) : (
                  <Badge tone="rose">Nicht im Discord</Badge>
                )}
              </>
            ) : (
              <Badge tone="wood">Kein Website-Account</Badge>
            )}
          </div>
        </div>
        <Link href={`/spieler/${encodeURIComponent(name)}`} className="btn btn-ghost btn-sm">
          <ExternalLink className="size-4" /> Öffentliches Profil
        </Link>
      </div>

      {/* Kicken, Bannen, Entbannen – und für Admins die IP. Dieselbe Zeile wie
          in der Spielerliste, damit es nur eine Stelle mit dieser Logik gibt.
          Nur, wenn dahinter überhaupt ein Mensch steckt: „Konsole" etwa ist
          bloss der Absender der Serverbefehle und lässt sich schlecht kicken. */}
      {(profil !== null || account !== null) && (
        <Panel className="overflow-hidden">
          <ul>
            <ServerPlayerRow
              name={name}
              online={profil?.online ?? false}
              playtimeHours={profil?.stats?.playtimeHours ?? null}
              darfIpSehen={darfAlles}
              verlinken={false}
            />
          </ul>
        </Panel>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Clock}
          label="Spielzeit"
          value={profil?.stats ? formatHours(profil.stats.playtimeHours) : "–"}
          hint={zahlen.beitritte > 0 ? `${formatNumber(zahlen.beitritte)}× beigetreten` : "noch nie gesehen"}
        />
        <StatTile
          icon={MessageSquare}
          label="Nachrichten"
          value={formatNumber(zahlen.nachrichten)}
          tone="diamond"
          hint={zahlen.befehle > 0 ? `${formatNumber(zahlen.befehle)} Befehle` : "keine Befehle"}
        />
        <StatTile
          icon={Skull}
          label="Tode"
          value={formatNumber(zahlen.tode)}
          hint={profil?.stats ? `${formatNumber(profil.stats.deaths)} laut Statistik` : "seit der Aufzeichnung"}
        />
        <StatTile
          icon={Coins}
          label="Kontostand"
          value={profil?.balanceSpurs !== null && profil?.balanceSpurs !== undefined ? formatCogsLong(profil.balanceSpurs) : "–"}
          tone="emerald"
          hint="aus Numismatics"
        />
      </div>

      <p className="mt-3 text-xs text-cream/45">
        {zahlen.ersteSichtung
          ? `Aufgezeichnet seit ${formatDate(zahlen.ersteSichtung)} · zuletzt ${timeAgo(zahlen.letzteSichtung ?? zahlen.ersteSichtung)}`
          : "Zu diesem Namen liegt noch nichts vor."}
      </p>

      {account && (
        <section className="mt-10">
          <SectionHeading
            eyebrow="Website"
            icon={UserRound}
            title="Account"
            description="Was in der Datenbank steht. Bearbeiten geht in der Spielerliste."
            className="mb-5"
          />
          <Panel className="p-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs tracking-wider text-cream/50 uppercase">Discord</dt>
                <dd className="mt-0.5 text-cream">{account.name ?? "unbekannt"}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wider text-cream/50 uppercase">E-Mail</dt>
                <dd className="mt-0.5 text-cream/80">{account.email ?? "keine"}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wider text-cream/50 uppercase">Dabei seit</dt>
                <dd className="mt-0.5 text-cream/80">{formatDate(account.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wider text-cream/50 uppercase">Minecraft-UUID</dt>
                <dd className="mt-0.5 font-mono text-xs break-all text-cream/70">
                  {account.minecraftUuid ?? "noch nicht bekannt"}
                </dd>
              </div>
            </dl>

            {account.applications.length > 0 && (
              <div className="mt-5 border-t border-white/5 pt-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs tracking-wider text-cream/50 uppercase">
                  <ShieldCheck className="size-3.5" /> Whitelist-Anträge
                </p>
                <ul className="space-y-2">
                  {account.applications.map((antrag) => (
                    <li key={antrag.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge tone={antrag.status === "APPROVED" ? "emerald" : antrag.status === "REJECTED" ? "rose" : "brass"}>
                        {applicationStatusLabels[antrag.status as ApplicationStatus] ?? antrag.status}
                      </Badge>
                      <span className="text-xs text-cream/45">{formatDate(antrag.createdAt)}</span>
                      {antrag.reviewNote && <span className="text-cream/60">{antrag.reviewNote}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        </section>
      )}

      <section className="mt-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <SectionHeading
            eyebrow="Aus dem Spiel"
            icon={MessagesSquare}
            title="Chat, Befehle und Ereignisse"
            description="Ein Klick auf eine Zeile zeigt, was rundherum passiert ist – auch von anderen."
          />
          <RefreshLogButton />
        </div>
        <Panel className="overflow-hidden">
          <GameLogList
            eintraege={verlauf}
            zeigeName={false}
            nachladen={{ name }}
            leerText={`Von ${name} liegt noch nichts vor.`}
          />
        </Panel>
      </section>

      <section className="mt-10">
        <SectionHeading
          eyebrow="Protokoll"
          icon={ScrollText}
          title="Eingriffe des Teams"
          description="Kicks, Banns und IP-Abfragen zu diesem Spieler."
          className="mb-5"
        />
        <Panel className="overflow-hidden">
          {audits.length === 0 ? (
            <p className="p-8 text-center text-sm text-cream/60">Keine Eingriffe.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {audits.map((eintrag) => (
                <li key={eintrag.id} className="flex flex-wrap items-center gap-3 p-4">
                  <Badge tone={eintrag.success ? "brass" : "rose"}>{auditLabels[eintrag.type] ?? eintrag.type}</Badge>
                  <span className="min-w-0 flex-1 truncate text-sm text-cream/60">{eintrag.detail}</span>
                  <span className="text-xs text-cream/45">
                    {eintrag.actorName ?? "System"} · {timeAgo(eintrag.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-cream/45">
        <Terminal className="size-3.5" />
        Befehle und Chat kommen vom Spielserver selbst (KubeJS-Skript), die Statistiken aus den Weltdaten.
      </p>
    </div>
  );
}
