"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Kleiner Hinweis unten rechts: Was als Nächstes zu tun ist.
 *
 * Erscheint für Angemeldete, die noch nicht alle Schritte erledigt haben. Das
 * Wegklicken merkt sich der sessionStorage – also nur für diesen Besuch. Beim
 * nächsten Mal steht der Hinweis wieder da, denn genau darum geht es: Wer
 * wiederkommt, soll sehen, woran es noch hakt. Im Schlüssel steckt der Schritt,
 * damit ein neuer Schritt auch nach dem Wegklicken wieder auftaucht.
 *
 * Der Zustand liegt außerhalb von React (im sessionStorage), deshalb
 * useSyncExternalStore: Der Server weiß nichts davon und rendert nichts, der
 * Browser entscheidet nach der Hydration. Ein `useState` mit Ersteinschätzung
 * würde beim ersten Aufbau von der Server-Ausgabe abweichen.
 */

const zuhoerer = new Set<() => void>();
/** Zwischenspeicher, damit die Momentaufnahme bei jedem Aufruf dasselbe liefert. */
const weggeklickt = new Map<string, boolean>();

function abonnieren(melden: () => void) {
  zuhoerer.add(melden);
  return () => {
    zuhoerer.delete(melden);
  };
}

function istWeg(schluessel: string): boolean {
  const bekannt = weggeklickt.get(schluessel);
  if (bekannt !== undefined) return bekannt;

  let gemerkt = false;
  try {
    gemerkt = sessionStorage.getItem(schluessel) !== null;
  } catch {
    // Privater Modus o. Ä.: dann zeigen wir den Hinweis eben.
  }
  weggeklickt.set(schluessel, gemerkt);
  return gemerkt;
}

function wegklicken(schluessel: string): void {
  try {
    sessionStorage.setItem(schluessel, "1");
  } catch {
    // Ohne Speicher bleibt der Hinweis für diesen Aufbau trotzdem weg.
  }
  weggeklickt.set(schluessel, true);
  for (const melden of zuhoerer) melden();
}

export function NextStepPopup({
  schluessel,
  titel,
  text,
  ton = "hinweis",
}: {
  schluessel: string;
  titel: string;
  text: string;
  /** „warnung" für Dinge, die kaputt sind – etwa ein Name, den es nicht gibt. */
  ton?: "hinweis" | "warnung";
}) {
  const speicherSchluessel = `vipcraft:hinweis-weg:${schluessel}`;
  const warnung = ton === "warnung";

  const weg = useSyncExternalStore(
    abonnieren,
    () => istWeg(speicherSchluessel),
    // Auf dem Server nichts rendern – dort gibt es keinen sessionStorage.
    () => true,
  );

  if (weg) return null;

  return (
    <div
      role="status"
      className={cn(
        "fixed right-3 bottom-3 z-40 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border bg-wood-900/95 p-4 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8)] backdrop-blur sm:right-5 sm:bottom-5",
        warnung ? "border-rose-400/50" : "border-brass-400/40",
      )}
    >
      <button
        type="button"
        onClick={() => wegklicken(speicherSchluessel)}
        aria-label="Hinweis schließen"
        className="absolute top-2 right-2 rounded p-1 text-cream/45 hover:bg-white/10 hover:text-cream"
      >
        <X className="size-4" />
      </button>

      <p className={cn("eyebrow text-[10px]", warnung && "text-rose-200")}>
        {warnung ? <AlertTriangle className="size-3" /> : null}
        {warnung ? "Da stimmt etwas nicht" : "Dein nächster Schritt"}
      </p>
      <p className="mt-1 pr-6 font-display font-bold text-cream">{titel}</p>
      <p className="mt-1 text-sm leading-relaxed text-cream/70">{text}</p>

      <Link href="/dashboard" className={cn("btn btn-sm mt-3", warnung ? "btn-outline" : "btn-brass")}>
        Zum Dashboard <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
