"use client";

import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import type { ServerStatus } from "@/lib/server-status";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 60_000;

/** Live-Status-Widget (Header): Online/Offline + Spielerzahl, aktualisiert sich jede Minute. */
export function ServerStatusWidget({ className }: { className?: string }) {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/server-status", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ServerStatus;
        if (!cancelled) {
          setStatus(data);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const loading = status === null && !failed;
  const online = status?.online ?? false;

  return (
    <div className={cn("group relative", className)} tabIndex={0}>
      <div
        aria-live="polite"
        className={cn(
          "flex h-9 items-center gap-2 rounded-lg border px-2.5 font-display text-xs font-semibold tracking-wide",
          loading && "border-white/10 bg-white/5 text-cream/60",
          !loading && online && "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
          !loading && !online && "border-rose-400/40 bg-rose-500/10 text-rose-200",
        )}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <span className="relative flex size-2.5">
            {online && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
            <span className={cn("relative inline-flex size-2.5 rounded-full", online ? "bg-emerald-400" : "bg-rose-400")} />
          </span>
        )}
        <span className="uppercase">{loading ? "Prüfe…" : online ? "Online" : "Offline"}</span>
        {online && status && (
          <span className="flex items-center gap-1 border-l border-white/10 pl-2 font-mono text-[11px] text-cream/90">
            <Users className="size-3.5" />
            {status.players.online}
            <span className="text-cream/50">/{status.players.max}</span>
          </span>
        )}
      </div>

      {/* Details-Tooltip */}
      <div
        className={cn(
          "pointer-events-none absolute top-full right-0 z-50 mt-2 w-64 origin-top-right scale-95 opacity-0 transition-all duration-150",
          "group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100",
          "group-focus-within:pointer-events-auto group-focus-within:scale-100 group-focus-within:opacity-100",
        )}
      >
        <div className="panel p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-mono text-cream/80">{status?.address ?? "…"}</span>
            {status?.version && <Badge tone="diamond">{status.version}</Badge>}
          </div>
          {status && status.motd.length > 0 && <p className="mt-2 text-cream/70">{status.motd.join(" · ")}</p>}
          {online && status && status.players.sample.length > 0 && (
            <p className="mt-2 text-cream/60">
              <span className="text-cream/40">Online:</span> {status.players.sample.join(", ")}
            </p>
          )}
          {!loading && !online && (
            <p className="mt-2 text-cream/60">
              {failed || status?.error
                ? "Der Status konnte gerade nicht abgerufen werden."
                : "Der Server ist gerade nicht erreichbar."}
            </p>
          )}
          <p className="mt-2 text-[10px] tracking-wider text-cream/40 uppercase">Quelle: mcsrvstat.us · alle 60 s</p>
        </div>
      </div>
    </div>
  );
}
