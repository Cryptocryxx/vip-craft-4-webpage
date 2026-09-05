import Link from "next/link";
import { AlertTriangle, MessagesSquare, Search, Trash2 } from "lucide-react";
import { GameLogDeletePanel } from "@/components/admin/GameLogDeletePanel";
import { GameLogList } from "@/components/admin/GameLogList";
import { RefreshLogButton } from "@/components/admin/RefreshLogButton";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { requireTeam } from "@/lib/admin";
import { formatDate, formatNumber, timeAgo } from "@/lib/format";
import { discordChatConfigured, holeDiscordNachrichten, letzterDiscordErfassungsStand } from "@/lib/discord-chat";
import { holeEreignisse, ladeVerlauf, letzterErfassungsStand } from "@/lib/game-log";
import { gameLogFilter, istFilterSchluessel } from "@/lib/game-log-types";
import { prisma } from "@/lib/prisma";
import { istAdmin } from "@/lib/roles";
import { getSiteSettings } from "@/lib/settings";

type Props = { searchParams: Promise<{ filter?: string; q?: string }> };

export default async function AdminChatPage({ searchParams }: Props) {
  const team = await requireTeam();
  const { filter: filterRoh, q } = await searchParams;

  const schluessel = filterRoh && istFilterSchluessel(filterRoh) ? filterRoh : "alles";
  const arten = [...gameLogFilter[schluessel].arten];
  const suche = (q ?? "").trim();

  // Beim Öffnen frisch nachsehen. Hat eigene Sperre – höchstens alle zehn
  // Sekunden geht daraus wirklich ein Abruf hervor.
  await Promise.all([holeEreignisse(), holeDiscordNachrichten()]);

  const [eintraege, gesamt, einstellungen] = await Promise.all([
    ladeVerlauf({ arten, suche: suche || undefined, take: 60 }),
    prisma.gameLog.count(),
    getSiteSettings(),
  ]);
  const stand = letzterErfassungsStand();
  const discordStand = letzterDiscordErfassungsStand();

  return (
    <div>
      <SectionHeading
        eyebrow="Aus dem Spiel"
        icon={MessagesSquare}
        title="Chat & Befehle"
        description="Alles, was auf dem Server gesagt und ausgeführt wurde. Ein Klick auf eine Zeile zeigt, was drumherum passiert ist."
        className="mb-5"
      />

      {/* Zustand der Erfassung – ohne das Skript auf dem Server bleibt hier alles leer. */}
      {!stand.erreichbar && (
        <Panel className="mb-5 border-amber-400/40 bg-amber-500/10 p-4">
          <p className="flex items-start gap-2 text-sm text-amber-100">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong className="font-semibold">Es kommt gerade nichts an.</strong> {stand.meldung}
              <br />
              Das Skript liegt in <code className="font-mono text-xs">minecraft/kubejs/server_scripts/</code> und wird
              mit <code className="font-mono text-xs">npm run kubejs:deploy</code> auf den Server gelegt; geladen wird
              es erst beim nächsten Serverstart.
            </span>
          </p>
        </Panel>
      )}

      {stand.fehler.length > 0 && (
        <Panel className="mb-5 border-rose-400/40 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-100">
            Das Skript konnte diese Ereignisse nicht anmelden: {stand.fehler.join(" · ")}
          </p>
        </Panel>
      )}

      {/* Discord-Chat ist optional (DISCORD_CHAT_CHANNEL_ID) – ohne Konfiguration
          kein Hinweis, denn dann hat sich einfach niemand dafür entschieden. */}
      {discordStand.konfiguriert && !discordStand.erreichbar && (
        <Panel className="mb-5 border-amber-400/40 bg-amber-500/10 p-4">
          <p className="flex items-start gap-2 text-sm text-amber-100">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong className="font-semibold">Discord-Chat kommt nicht an.</strong> {discordStand.meldung}
            </span>
          </p>
        </Panel>
      )}

      {discordStand.vermutlichOhneInhalt && (
        <Panel className="mb-5 border-amber-400/40 bg-amber-500/10 p-4">
          <p className="flex items-start gap-2 text-sm text-amber-100">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong className="font-semibold">Discord-Nachrichten kommen leer an.</strong> Vermutlich fehlt im
              Developer Portal unter Bot das Häkchen bei &bdquo;Message Content Intent&ldquo; – ohne das liefert
              Discord nur, wer geschrieben hat, nicht was.
            </span>
          </p>
        </Panel>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-cream/45">
          {formatNumber(gesamt)} {gesamt === 1 ? "Eintrag" : "Einträge"} gespeichert
          {stand.generatedAt ? ` · Server zuletzt gehört ${timeAgo(stand.generatedAt)}` : ""}
          {stand.luecke > 0 ? ` · ${stand.luecke} verpasst` : ""}
        </p>
        <RefreshLogButton />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {Object.entries(gameLogFilter).map(([key, wert]) => (
          <Link
            key={key}
            href={{ pathname: "/admin/chat", query: { ...(key === "alles" ? {} : { filter: key }), ...(suche ? { q: suche } : {}) } }}
            className={
              key === schluessel
                ? "btn btn-sm border border-brass-500/50 bg-brass-500/15 text-brass-100"
                : "btn btn-ghost btn-sm"
            }
          >
            {wert.label}
          </Link>
        ))}

        <form method="get" action="/admin/chat" className="ml-auto flex items-center gap-2">
          {schluessel !== "alles" && <input type="hidden" name="filter" value={schluessel} />}
          <input
            type="search"
            name="q"
            defaultValue={suche}
            placeholder="Im Text suchen …"
            className="input h-9 w-48 sm:w-64"
          />
          <button type="submit" className="btn btn-outline btn-sm">
            <Search className="size-4" />
            Suchen
          </button>
        </form>
      </div>

      {suche && (
        <p className="mb-3 flex items-center gap-2 text-sm text-cream/60">
          <Badge tone="brass">Suche</Badge> &bdquo;{suche}&ldquo;
          <Link href={{ pathname: "/admin/chat" }} className="text-xs text-brass-200 hover:underline">
            zurücksetzen
          </Link>
        </p>
      )}

      <Panel className="overflow-hidden">
        <GameLogList
          eintraege={eintraege}
          nachladen={{ arten, suche: suche || undefined }}
          leerText={
            suche
              ? "Dazu steht nichts im Verlauf."
              : "Noch nichts aufgezeichnet. Sobald jemand auf dem Server etwas sagt oder tut, steht es hier."
          }
        />
      </Panel>

      {istAdmin(team.role) && (
        <section className="mt-12">
          <SectionHeading
            eyebrow="Aufräumen"
            icon={Trash2}
            title="Verlauf löschen"
            description="Gelöschtes kommt nicht zurück. Deshalb nur für Admins."
            className="mb-5"
          />
          <GameLogDeletePanel aufbewahrung={einstellungen.gameLogRetentionDays} />
        </section>
      )}

      <p className="mt-6 text-xs leading-relaxed text-cream/45">
        Aufgezeichnet werden Chat, Befehle von Spielern und aus der Konsole, Beitritt und Verlassen sowie Tode
        {discordChatConfigured ? ", dazu Nachrichten aus dem verknüpften Discord-Kanal" : ""}. Befehle aus
        Befehlsblöcken bleiben draußen. Was hier steht, gehört ins Team – es sind Gespräche von Leuten, die sich dabei
        nichts gedacht haben.
        {stand.geprueftAm ? ` Zuletzt nachgesehen: ${formatDate(stand.geprueftAm)}.` : ""}
        {!discordChatConfigured
          ? " Discord-Chat ist nicht eingerichtet (DISCORD_CHAT_CHANNEL_ID) – nur der Spielchat wird erfasst."
          : ""}
      </p>
    </div>
  );
}
