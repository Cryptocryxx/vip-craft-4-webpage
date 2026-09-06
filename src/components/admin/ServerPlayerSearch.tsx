"use client";

import { useMemo, useState } from "react";
import { ServerPlayerRow } from "@/components/admin/ServerPlayerRow";
import { SucheFeld } from "@/components/admin/SucheFeld";
import { Panel } from "@/components/ui/Panel";

export type ServerSpieler = { name: string; online: boolean; playtimeHours: number | null };

type Props = {
  spieler: ServerSpieler[];
  /** Die IP bleibt beim Admin – siehe ServerPlayerRow. */
  darfIpSehen: boolean;
};

/**
 * Die Liste aller je gesehenen Minecraft-Spieler, mit Suche darüber.
 *
 * Diese Liste wächst mit jedem, der einmal auf dem Server war – irgendwann ist
 * Scrollen keine Antwort mehr auf „wo ist noch mal der eine?".
 */
export function ServerPlayerSearch({ spieler, darfIpSehen }: Props) {
  const [suche, setSuche] = useState("");

  const gefiltert = useMemo(() => {
    const begriff = suche.trim().toLowerCase();
    if (!begriff) return spieler;
    return spieler.filter((p) => p.name.toLowerCase().includes(begriff));
  }, [spieler, suche]);

  return (
    <>
      <SucheFeld
        wert={suche}
        setzen={setSuche}
        platzhalter="Nach Minecraft-Username suchen"
        treffer={suche ? `${gefiltert.length} von ${spieler.length}` : null}
      />

      <Panel className="overflow-hidden">
        {spieler.length === 0 ? (
          <p className="p-10 text-center text-sm text-cream/60">
            Noch war niemand auf dem Server – oder die Verbindung zu Crafty steht nicht.
          </p>
        ) : gefiltert.length === 0 ? (
          <p className="p-10 text-center text-sm text-cream/60">Niemand gefunden, der zu &bdquo;{suche}&ldquo; passt.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {gefiltert.map((p) => (
              <ServerPlayerRow
                key={p.name}
                name={p.name}
                online={p.online}
                playtimeHours={p.playtimeHours}
                darfIpSehen={darfIpSehen}
              />
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
