"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, Loader2, MessageSquare } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { ladeAeltereAction, ladeKontextAction } from "@/lib/actions/game-log";
import { formatClock, formatShortDate } from "@/lib/format";
import { gameLogLabel, istGameLogArt, type GameLogEintrag } from "@/lib/game-log-types";

/**
 * Verlauf aus dem Spiel: eine Zeile pro Ereignis.
 *
 * Ein Klick auf eine Zeile holt den Zusammenhang nach – fünf Ereignisse davor
 * und fünf danach, von allen Spielern. Genau das ist beim Nachlesen die Frage:
 * nicht „was hat der eine gesagt", sondern „was war da los".
 */

const toene: Record<string, BadgeTone> = {
  CHAT: "diamond",
  DISCORD_CHAT: "copper",
  COMMAND: "brass",
  COMMAND_CONSOLE: "neutral",
  JOIN: "emerald",
  QUIT: "wood",
  DEATH: "rose",
};

function Art({ kind }: { kind: string }) {
  return <Badge tone={toene[kind] ?? "neutral"}>{istGameLogArt(kind) ? gameLogLabel[kind] : kind}</Badge>;
}

function Zeile({
  eintrag,
  zeigeName,
  hervorgehoben,
}: {
  eintrag: GameLogEintrag;
  zeigeName: boolean;
  hervorgehoben?: boolean;
}) {
  return (
    <div
      className={
        hervorgehoben
          ? "flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md bg-brass-500/15 px-2 py-1.5 ring-1 ring-brass-400/40"
          : "flex flex-wrap items-baseline gap-x-2 gap-y-1 px-2 py-1.5"
      }
    >
      <span className="font-mono text-xs text-cream/40" title={formatShortDate(eintrag.at)}>
        {formatClock(eintrag.at)}
      </span>
      <Art kind={eintrag.kind} />
      {zeigeName && <span className="font-display text-sm font-semibold text-cream">{eintrag.playerName}</span>}
      <span
        className={
          eintrag.kind === "CHAT" || eintrag.kind === "DISCORD_CHAT"
            ? "min-w-0 flex-1 text-sm break-words text-cream/90"
            : "min-w-0 flex-1 font-mono text-sm break-words text-cream/60"
        }
      >
        {eintrag.text}
      </span>
    </div>
  );
}

export function GameLogList({
  eintraege,
  zeigeName = true,
  /** Für „ältere laden" – ohne diese Angaben gibt es den Knopf nicht. */
  nachladen,
  leerText = "Nichts aufgezeichnet.",
}: {
  eintraege: GameLogEintrag[];
  zeigeName?: boolean;
  nachladen?: { arten?: string[]; name?: string; suche?: string };
  leerText?: string;
}) {
  const [liste, setListe] = useState(eintraege);
  const [gesehen, setGesehen] = useState(eintraege);
  const [offen, setOffen] = useState<number | null>(null);
  const [kontext, setKontext] = useState<Record<number, GameLogEintrag[]>>({});
  const [fehler, setFehler] = useState<string | null>(null);
  const [amEnde, setAmEnde] = useState(false);
  const [laeuft, starte] = useTransition();

  // Frische Daten vom Server (nach einem Aktualisieren) gewinnen gegen die
  // nachgeladene Liste im Browser.
  if (eintraege !== gesehen) {
    setGesehen(eintraege);
    setListe(eintraege);
    setOffen(null);
    setAmEnde(false);
  }

  function umschalten(seq: number) {
    if (offen === seq) {
      setOffen(null);
      return;
    }
    setOffen(seq);
    if (kontext[seq]) return;

    starte(async () => {
      const ergebnis = await ladeKontextAction(seq);
      if (ergebnis.error) {
        setFehler(ergebnis.error);
        return;
      }
      setKontext((alt) => ({ ...alt, [seq]: ergebnis.eintraege }));
    });
  }

  function mehr() {
    const letzte = liste[liste.length - 1];
    if (!letzte || !nachladen) return;

    starte(async () => {
      const ergebnis = await ladeAeltereAction({ ...nachladen, vorSeq: letzte.seq });
      if (ergebnis.error) {
        setFehler(ergebnis.error);
        return;
      }
      if (ergebnis.eintraege.length === 0) {
        setAmEnde(true);
        return;
      }
      setListe((alt) => [...alt, ...ergebnis.eintraege]);
    });
  }

  if (liste.length === 0) {
    return <p className="p-10 text-center text-sm text-cream/60">{leerText}</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-white/5">
        {liste.map((eintrag) => (
          <li key={eintrag.seq}>
            <button
              type="button"
              onClick={() => umschalten(eintrag.seq)}
              aria-expanded={offen === eintrag.seq}
              className="block w-full cursor-pointer px-2 py-0.5 text-left transition-colors hover:bg-white/5"
            >
              <Zeile eintrag={eintrag} zeigeName={zeigeName} />
            </button>

            {offen === eintrag.seq && (
              <div className="border-l-2 border-brass-500/40 bg-black/25 px-3 py-3 sm:px-6">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] tracking-wider text-cream/45 uppercase">
                  <MessageSquare className="size-3" /> Zusammenhang · fünf davor und danach
                </p>

                {kontext[eintrag.seq] ? (
                  <div className="space-y-0.5">
                    {kontext[eintrag.seq].map((zeile) => (
                      <Zeile key={zeile.seq} eintrag={zeile} zeigeName hervorgehoben={zeile.seq === eintrag.seq} />
                    ))}
                  </div>
                ) : (
                  <p className="flex items-center gap-2 px-2 text-sm text-cream/50">
                    <Loader2 className="size-3.5 animate-spin" /> Wird geladen …
                  </p>
                )}

                <div className="mt-2 px-2">
                  <Link
                    href={`/admin/users/${encodeURIComponent(eintrag.playerName)}`}
                    className="text-xs text-brass-200 hover:text-brass-100 hover:underline"
                  >
                    Alles zu {eintrag.playerName} ansehen →
                  </Link>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {fehler && <p className="p-3 text-sm text-rose-300">{fehler}</p>}

      {nachladen && !amEnde && (
        <div className="border-t border-white/5 p-3 text-center">
          <button type="button" onClick={mehr} disabled={laeuft} className="btn btn-ghost btn-sm disabled:opacity-50">
            {laeuft ? <Loader2 className="size-4 animate-spin" /> : <ChevronDown className="size-4" />}
            Ältere laden
          </button>
        </div>
      )}
      {amEnde && <p className="border-t border-white/5 p-3 text-center text-xs text-cream/40">Das war alles.</p>}
    </div>
  );
}
