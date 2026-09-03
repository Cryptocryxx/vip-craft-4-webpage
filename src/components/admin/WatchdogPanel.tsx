"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check, HeartPulse, Loader2, Power, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import {
  checkNowAction,
  fetchWatchdogStatus,
  setAutoRestartAction,
  type PowerFormState,
} from "@/lib/actions/server-power";
import type { WatchdogStatus } from "@/lib/server-power-types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-white/5 py-2 first:border-t-0">
      <span className="text-xs text-cream/50">{label}</span>
      <span className="text-right text-sm text-cream/85">{value}</span>
    </div>
  );
}

function formatTime(iso: string | null): string {
  if (!iso) return "noch keine";
  return `${new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Berlin",
  })} Uhr`;
}

export function WatchdogPanel({ initial }: { initial: WatchdogStatus }) {
  const [status, setStatus] = useState(initial);
  const [feedback, setFeedback] = useState<PowerFormState>({});
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<PowerFormState>) {
    startTransition(async () => {
      setFeedback(await action());
      try {
        setStatus(await fetchWatchdogStatus());
      } catch {
        // Anzeige bleibt beim letzten bekannten Stand.
      }
    });
  }

  // Drei Zustände: der Schalter kann an sein, ohne dass in diesem Prozess ein
  // Beobachter läuft – dann greift er erst auf dem Host mit SERVER_WATCHDOG.
  const mode = !status.autoRestart ? "off" : status.processEnabled ? "on" : "waiting";

  const summary = {
    on: { badge: "An", tone: "emerald" as const, text: "Stürzt der Server ab, fährt er von allein wieder hoch." },
    waiting: {
      badge: "Wartet",
      tone: "brass" as const,
      text: "Eingeschaltet – greift, sobald der Beobachter auf dem Website-Host läuft.",
    },
    off: { badge: "Aus", tone: "neutral" as const, text: "Nach einem Absturz bleibt der Server aus." },
  }[mode];

  return (
    <Panel className="p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-diamond-400/40 bg-diamond-500/10 text-diamond-200">
          <HeartPulse className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold text-cream">Automatischer Neustart</p>
          <p className="text-sm text-cream/60">{summary.text}</p>
        </div>
        <Badge tone={summary.tone}>{summary.badge}</Badge>
      </div>

      {!status.processEnabled && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-brass-500/30 bg-brass-500/10 p-3 text-sm text-brass-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Der Beobachter läuft in diesem Prozess nicht. Dafür muss{" "}
            <code className="font-mono text-xs">SERVER_WATCHDOG=&quot;true&quot;</code> in der{" "}
            <code className="font-mono text-xs">.env</code> stehen – und zwar nur auf dem Host, der die Website
            dauerhaft betreibt. Zwei Instanzen würden sich beim Neustarten gegenseitig ins Gehege kommen.
          </span>
        </p>
      )}

      <div className="mt-5">
        <Row label="Prüfintervall" value={`alle ${status.intervalSeconds} Sekunden`} />
        <Row
          label="Neustarts in dieser Stunde"
          value={`${status.restartsInWindow} von höchstens ${status.maxRestartsPerHour}`}
        />
        <Row label="Letzte Prüfung" value={formatTime(status.lastCheckedAt)} />
        {status.lastVerdict && <Row label="Ergebnis" value={status.lastVerdict} />}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-5">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setAutoRestartAction(!status.autoRestart))}
          className="btn btn-brass btn-md disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Power className="size-4" />}
          {status.autoRestart ? "Automatischen Neustart ausschalten" : "Automatischen Neustart einschalten"}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => run(checkNowAction)}
          className="btn btn-ghost btn-md disabled:opacity-50"
        >
          <RefreshCw className="size-4" />
          Jetzt prüfen
        </button>
      </div>

      {feedback.error && <p className="mt-4 text-sm text-rose-300">{feedback.error}</p>}
      {feedback.success && (
        <p className="mt-4 flex items-start gap-1.5 text-sm text-emerald-300">
          <Check className="mt-0.5 size-4 shrink-0" /> {feedback.success}
        </p>
      )}

      <p className="mt-5 border-t border-white/5 pt-4 text-xs leading-relaxed text-cream/45">
        Geht der Server aus, sieht der Beobachter erst im Server-Log nach, warum. Steht dort die übliche
        Abschiedssequenz – also ein Stopp über diesen Kontrollraum, über Crafty oder per{" "}
        <code className="font-mono">/stop</code> im Spiel – bleibt er aus. Fehlt sie oder steht dort ein Absturz, wird
        neu gestartet. Ein <em>Kill</em> aus Crafty sieht dabei zwangsläufig wie ein Absturz aus, weil er kein sauberes
        Herunterfahren hinterlässt.
      </p>
    </Panel>
  );
}
