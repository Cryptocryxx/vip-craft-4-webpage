import { AlertTriangle, CheckCircle2, HeartPulse, Plug, Power, ScrollText, ShieldOff, Terminal, XCircle } from "lucide-react";
import { ServerPowerPanel } from "@/components/admin/ServerPowerPanel";
import { WatchdogPanel } from "@/components/admin/WatchdogPanel";
import { WhitelistSuspendPanel } from "@/components/admin/WhitelistSuspendPanel";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { craftyConfig, craftyConfigured } from "@/lib/crafty";
import { formatDate, timeAgo } from "@/lib/format";
import { recentCommands } from "@/lib/server-commands";
import { getAutoRestart, getServerLiveState, recentServerEvents } from "@/lib/server-power";
import { isServerEventType, serverEventLabels, serverEventTones } from "@/lib/server-power-types";
import { getWatchdogStatus } from "@/lib/server-watchdog";
import { prisma } from "@/lib/prisma";
import { getStatsSourceError, loadAllPlayerStats } from "@/lib/stats-source";

export default async function AdminServerPage() {
  const [liveState, autoRestart, events, players, commands, ausgesetzt] = await Promise.all([
    getServerLiveState(),
    getAutoRestart(),
    recentServerEvents(25),
    craftyConfigured ? loadAllPlayerStats() : Promise.resolve(null),
    recentCommands(25),
    prisma.user.count({ where: { whitelistSuspended: true } }),
  ]);
  const statsError = getStatsSourceError();
  const watchdog = { ...getWatchdogStatus(), autoRestart };

  return (
    <div className="space-y-10">
      <section>
        <SectionHeading
          eyebrow="Steuerung"
          icon={Power}
          title="Server starten und stoppen"
          description="Läuft über Crafty – derselbe Weg wie der Knopf im Crafty-Panel, nur ohne sich dort einzuloggen."
          className="mb-5"
        />
        <ServerPowerPanel initial={liveState} />
      </section>

      <section>
        <SectionHeading
          eyebrow="Zugang"
          icon={ShieldOff}
          title="Whitelist vorübergehend aussetzen"
          description="Für Wartung oder wenn kurz Ruhe einkehren soll. Admins bleiben drauf, damit der Weg zurück offen bleibt."
          className="mb-5"
        />
        <WhitelistSuspendPanel ausgesetzt={ausgesetzt} />
      </section>

      <section>
        <SectionHeading
          eyebrow="Absturzsicherung"
          icon={HeartPulse}
          title="Watchdog"
          description="Behält den Server im Blick und unterscheidet einen Absturz von einem geplanten Stopp."
          className="mb-5"
        />
        <WatchdogPanel initial={watchdog} />
      </section>

      <section>
        <SectionHeading
          eyebrow="Verlauf"
          icon={ScrollText}
          title="Server-Ereignisse"
          description="Jeder Start, Stopp und jede Entscheidung des Watchdogs – mit der Begründung aus dem Log."
          className="mb-5"
        />
        <Panel className="overflow-hidden">
          {events.length === 0 ? (
            <p className="p-10 text-center text-sm text-cream/60">
              Noch nichts passiert. Sobald der Server über diese Seite gestartet oder gestoppt wird – oder der Watchdog
              etwas bemerkt – steht es hier.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {events.map((event) => {
                const type = isServerEventType(event.type) ? event.type : null;
                return (
                  <li key={event.id} className="flex flex-wrap items-start gap-3 p-4">
                    <Badge tone={type ? serverEventTones[type] : "neutral"}>
                      {type ? serverEventLabels[type] : event.type}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      {event.detail && <p className="text-sm break-words text-cream/85">{event.detail}</p>}
                      <p className="mt-1 text-xs text-cream/50">
                        {event.actorName ?? "Watchdog"} · {timeAgo(event.createdAt)} · {formatDate(event.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </section>

      <section>
        <SectionHeading
          eyebrow="Anbindung"
          icon={Plug}
          title="Crafty-Verbindung"
          description="Statistiken werden über den Dateizugriff gelesen, Befehle und Steuerung über die Crafty-API geschickt."
          className="mb-5"
        />

        {!craftyConfigured ? (
          <Panel className="p-6">
            <p className="flex items-center gap-2 font-display font-bold text-brass-200">
              <AlertTriangle className="size-5" /> Nicht konfiguriert
            </p>
            <p className="mt-2 text-sm text-cream/70">
              Trage <code className="font-mono">CRAFTY_URL</code>, <code className="font-mono">CRAFTY_TOKEN</code> und{" "}
              <code className="font-mono">CRAFTY_SERVER_ID</code> in der <code className="font-mono">.env</code> ein und
              starte den Server neu. Solange das fehlt, zeigen Leaderboards und persönliche Statistiken Beispieldaten,
              und Whitelist-Entscheidungen werden nur in der Datenbank gespeichert.
            </p>
            <p className="mt-3 text-sm text-cream/70">
              Mit <code className="font-mono">npm run crafty:check</code> lässt sich die Verbindung prüfen, bevor die
              Website startet.
            </p>
          </Panel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel className="p-5">
              <p className="text-xs tracking-wider text-cream/50 uppercase">Verbindung</p>
              <p className="mt-1 truncate font-mono text-sm text-cream">{craftyConfig.url}</p>
              <p className="mt-1 font-mono text-xs text-cream/50">Server-ID: {craftyConfig.serverId}</p>
            </Panel>

            <Panel className="p-5">
              <p className="text-xs tracking-wider text-cream/50 uppercase">Statistikdateien</p>
              {players && players.length > 0 ? (
                <p className="mt-1 flex items-center gap-2 font-display text-lg font-bold text-emerald-200">
                  <CheckCircle2 className="size-5" /> {players.length} Spieler gelesen
                </p>
              ) : (
                <>
                  <p className="mt-1 flex items-center gap-2 font-display text-lg font-bold text-rose-200">
                    <XCircle className="size-5" /> Kein Zugriff
                  </p>
                  {statsError && <p className="mt-2 font-mono text-xs break-words text-rose-200/80">{statsError}</p>}
                </>
              )}
            </Panel>
          </div>
        )}
      </section>

      <section>
        <SectionHeading
          eyebrow="Protokoll"
          icon={Terminal}
          title="Gesendete Konsolenbefehle"
          description="Jeder Befehl, den die Website an den Server geschickt hat – mit Auslöser und Ergebnis."
          className="mb-5"
        />
        <Panel className="overflow-hidden">
          {commands.length === 0 ? (
            <p className="p-10 text-center text-sm text-cream/60">
              Noch kein Befehl abgesetzt. Sobald ein Whitelist-Antrag angenommen oder abgelehnt wird, erscheint er hier.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {commands.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-start gap-3 p-4">
                  {entry.success ? <Badge tone="emerald">OK</Badge> : <Badge tone="rose">Fehler</Badge>}
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm break-words text-cream">/{entry.command}</p>
                    <p className="mt-1 text-xs text-cream/55">
                      {entry.reason}
                      {entry.actorName ? ` · ${entry.actorName}` : ""} · {timeAgo(entry.createdAt)} ·{" "}
                      {formatDate(entry.createdAt)}
                    </p>
                    {entry.error && <p className="mt-1 font-mono text-xs break-words text-rose-300">{entry.error}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>
    </div>
  );
}
