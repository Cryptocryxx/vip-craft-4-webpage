"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { AlertTriangle, Check, Cpu, HardDrive, Loader2, MemoryStick, Play, RotateCw, Square, Timer } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { fetchServerLiveState, powerAction, type PowerFormState } from "@/lib/actions/server-power";
import type { PowerCommand, ServerLiveState } from "@/lib/server-power-types";

const REFRESH_MS = 15_000;

/**
 * Crafty liefert den Startzeitpunkt als "2026-09-03 17:41:01" ohne Zeitzone.
 * Am Server gegengeprüft: der Wert ist UTC – dieselbe Startzeit steht im
 * Minecraft-Log als 19:41:02 Ortszeit. Ohne diese Umrechnung stünde hier eine
 * um zwei Stunden falsche Uhrzeit.
 */
function formatStarted(value: string | null): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value ?? "");
  if (!match) return value;

  const [, year, month, day, hour, minute, second] = match.map(Number);
  const started = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  return `${started.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  })} Uhr`;
}

function formatGiB(bytes: number): string {
  if (bytes <= 0) return "–";
  return `${(bytes / 1024 ** 3).toFixed(1).replace(".", ",")} GB`;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="size-4 shrink-0 text-cream/40" />
      <span className="text-xs text-cream/50">{label}</span>
      <span className="ml-auto font-mono text-sm text-cream">{value}</span>
    </div>
  );
}

export function ServerPowerPanel({ initial }: { initial: ServerLiveState }) {
  const [live, setLive] = useState(initial);
  const [feedback, setFeedback] = useState<PowerFormState>({});
  const [armed, setArmed] = useState<PowerCommand | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    try {
      setLive(await fetchServerLiveState());
    } catch {
      // Kurzzeitige Aussetzer nicht anzeigen – der nächste Durchlauf korrigiert das.
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  function send(command: PowerCommand) {
    setArmed(null);
    startTransition(async () => {
      setFeedback(await powerAction(command));
      // Sofort nachsehen, statt bis zum nächsten Intervall zu warten.
      await refresh();
    });
  }

  const busy = pending || live.busy;

  return (
    <Panel className="p-6">
      <div className="flex flex-wrap items-center gap-3">
        {!live.configured ? (
          <Badge tone="neutral">Nicht konfiguriert</Badge>
        ) : live.busy ? (
          <Badge tone="brass">Arbeitet gerade…</Badge>
        ) : live.running ? (
          <Badge tone="emerald">Läuft</Badge>
        ) : (
          <Badge tone="rose">Aus</Badge>
        )}

        {live.running && (
          <span className="text-sm text-cream/70">
            {live.onlinePlayers} von {live.maxPlayers} Spielern online
          </span>
        )}
        {live.version && <span className="font-mono text-xs text-cream/45">Minecraft {live.version}</span>}
      </div>

      {live.error && (
        <p className="mt-3 flex items-start gap-2 font-mono text-xs break-words text-rose-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {live.error}
        </p>
      )}

      {live.running && (
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          <Metric icon={Cpu} label="CPU" value={`${live.cpu.toFixed(1).replace(".", ",")} %`} />
          <Metric
            icon={MemoryStick}
            label="Arbeitsspeicher"
            value={`${formatGiB(live.memBytes)} (${Math.round(live.memPercent)} %)`}
          />
          <Metric icon={Timer} label="Läuft seit" value={formatStarted(live.startedAt) ?? "–"} />
          <Metric icon={HardDrive} label="Weltgröße" value={live.worldSize ?? "–"} />
        </div>
      )}

      {live.players.length > 0 && (
        <p className="mt-4 flex flex-wrap gap-1.5">
          {live.players.map((player) => (
            <Badge key={player} tone="diamond">
              {player}
            </Badge>
          ))}
        </p>
      )}

      <div className="mt-6 border-t border-white/10 pt-5">
        {pending ? (
          <p className="flex items-center gap-2 text-sm text-cream/70">
            <Loader2 className="size-4 animate-spin" /> Befehl wird an Crafty geschickt…
          </p>
        ) : armed === null ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => send("start")}
              disabled={busy || live.running || !live.configured}
              className="btn btn-brass btn-md disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Play className="size-4" />
              Starten
            </button>
            <button
              type="button"
              onClick={() => setArmed("restart")}
              disabled={busy || !live.running}
              className="btn btn-outline btn-md disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCw className="size-4" />
              Neu starten
            </button>
            <button
              type="button"
              onClick={() => setArmed("stop")}
              disabled={busy || !live.running}
              className="btn btn-md border border-rose-400/50 text-rose-200 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Square className="size-4" />
              Stoppen
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-4">
            <p className="font-display font-bold text-cream">
              {armed === "stop" ? "Server wirklich stoppen?" : "Server wirklich neu starten?"}
            </p>
            <p className="mt-1 text-sm text-cream/70">
              {live.onlinePlayers > 0
                ? `Gerade ${live.onlinePlayers === 1 ? "ist 1 Spieler" : `sind ${live.onlinePlayers} Spieler`} online${
                    live.players.length > 0 ? ` (${live.players.join(", ")})` : ""
                  } – ${live.onlinePlayers === 1 ? "er fliegt" : "sie fliegen"} raus.`
                : "Gerade ist niemand online."}{" "}
              Der Server speichert vorher noch alles ab.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => send(armed)}
                className="btn btn-sm border border-rose-400/60 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
              >
                {armed === "stop" ? "Ja, stoppen" : "Ja, neu starten"}
              </button>
              <button type="button" onClick={() => setArmed(null)} className="btn btn-ghost btn-sm">
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {feedback.error && <p className="mt-4 text-sm break-words text-rose-300">{feedback.error}</p>}
        {feedback.success && (
          <p className="mt-4 flex items-start gap-1.5 text-sm text-emerald-300">
            <Check className="mt-0.5 size-4 shrink-0" /> {feedback.success}
          </p>
        )}
      </div>
    </Panel>
  );
}
