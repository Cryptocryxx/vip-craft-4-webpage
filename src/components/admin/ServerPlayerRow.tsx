"use client";

import { useState, useTransition } from "react";
import { Ban, Eye, Loader2, LogOut, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PlayerHead } from "@/components/ui/PlayerHead";
import {
  banPlayerAction,
  kickPlayerAction,
  revealPlayerIpAction,
  unbanPlayerAction,
  type PlayerActionState,
} from "@/lib/actions/players";
import { formatHours } from "@/lib/format";

type Props = { name: string; online: boolean; playtimeHours: number | null };

/**
 * Eine Zeile im Kontrollraum: kicken, bannen, entbannen, IP nachsehen.
 *
 * Kicken und Bannen fragen erst nach einem Grund – der landet im Spielerprotokoll
 * und beim Gebannten in der Meldung. Die IP steht bewusst nicht von vornherein
 * da: Sie ist ein personenbezogenes Datum, jeder Abruf wird protokolliert.
 */
export function ServerPlayerRow({ name, online, playtimeHours }: Props) {
  const [grund, setGrund] = useState("");
  const [modus, setModus] = useState<"kick" | "ban" | null>(null);
  const [rueckmeldung, setRueckmeldung] = useState<PlayerActionState & { ip?: string }>({});
  const [pending, startTransition] = useTransition();

  function ausfuehren(fn: () => Promise<PlayerActionState & { ip?: string }>) {
    startTransition(async () => {
      setRueckmeldung(await fn());
      setModus(null);
      setGrund("");
    });
  }

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <PlayerHead name={name} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-cream">{name}</p>
          <p className="text-xs text-cream/50">
            {playtimeHours !== null ? `${formatHours(playtimeHours)} gespielt` : "Noch keine Statistiken"}
          </p>
        </div>

        {online ? <Badge tone="emerald">Online</Badge> : <Badge tone="neutral">Offline</Badge>}

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={pending || !online}
            onClick={() => setModus("kick")}
            title={online ? "Vom Server werfen" : "Nur möglich, solange der Spieler online ist"}
            className="btn btn-ghost btn-sm disabled:opacity-40"
          >
            <LogOut className="size-3.5" /> Kicken
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setModus("ban")}
            className="btn btn-sm text-rose-200 hover:bg-rose-500/10 disabled:opacity-40"
          >
            <Ban className="size-3.5" /> Bannen
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => ausfuehren(() => unbanPlayerAction(name))}
            className="btn btn-ghost btn-sm disabled:opacity-40"
          >
            <Undo2 className="size-3.5" /> Entbannen
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => ausfuehren(() => revealPlayerIpAction(name))}
            title="Wird protokolliert"
            className="btn btn-ghost btn-sm disabled:opacity-40"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />} IP
          </button>
        </div>
      </div>

      {modus && (
        <div className="mt-3 rounded-lg border border-brass-400/40 bg-brass-500/10 p-3">
          <label className="block text-xs tracking-wider text-cream/60 uppercase">
            Grund ({modus === "kick" ? "Kick" : "Bann"})
          </label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <input
              type="text"
              value={grund}
              maxLength={120}
              onChange={(e) => setGrund(e.target.value)}
              placeholder="z. B. Griefing am Spawn"
              className="input flex-1"
            />
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                ausfuehren(() => (modus === "kick" ? kickPlayerAction(name, grund) : banPlayerAction(name, grund)))
              }
              className="btn btn-sm border border-rose-400/60 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
            >
              {modus === "kick" ? "Jetzt kicken" : "Jetzt bannen"}
            </button>
            <button type="button" onClick={() => setModus(null)} className="btn btn-ghost btn-sm">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {rueckmeldung.error && <p className="mt-2 text-sm text-rose-300">{rueckmeldung.error}</p>}
      {rueckmeldung.success && (
        <p className="mt-2 text-sm text-emerald-300">
          {rueckmeldung.success}
          {rueckmeldung.ip && <span className="ml-2 font-mono text-cream">{rueckmeldung.ip}</span>}
        </p>
      )}
    </li>
  );
}
