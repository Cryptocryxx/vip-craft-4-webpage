"use client";

import { useEffect, useState } from "react";
import { CalendarClock, PartyPopper } from "lucide-react";

/**
 * Countdown bis zum Server-Start – sitzt im Hero unter den Knöpfen.
 *
 * Ziel und Beschriftung kommen aus dem Event-Kalender (lib/event-types), damit
 * hier kein zweites Datum gepflegt werden muss, das dann irgendwann vom
 * Kalender abweicht.
 *
 * `serverJetzt` ist die Uhrzeit, mit der die Seite auf dem Server gebaut wurde.
 * Der erste Aufbau im Browser rechnet mit genau demselben Wert – sonst stünden
 * dort andere Zahlen als im gelieferten HTML, und React meldete beim Hydrieren
 * einen Unterschied. Erst ab der ersten Sekunde übernimmt die Uhr des Browsers.
 */

const SEKUNDE = 1000;
const MINUTE = 60 * SEKUNDE;
const STUNDE = 60 * MINUTE;
const TAG = 24 * STUNDE;

/** Minecraft setzt seine Schrift mit einem harten, versetzten Schatten. */
const pixelSchatten = { textShadow: "0.1em 0.1em 0 rgba(0,0,0,0.65)" };

function Feld({ wert, einheit }: { wert: number; einheit: string }) {
  return (
    <div
      className={
        // Der abgeschraegte Rahmen der Minecraft-Oberflaeche: oben/links hell,
        // unten/rechts dunkel. Bewusst ohne runde Ecken.
        "border-[3px] border-t-white/25 border-l-white/25 border-r-black/60 border-b-black/60 bg-wood-900/80 px-1 py-2 text-center sm:px-2 sm:py-2.5"
      }
    >
      <p
        className="font-pixel text-xl leading-none font-bold text-brass-100 tabular-nums sm:text-3xl lg:text-4xl"
        style={pixelSchatten}
      >
        {String(wert).padStart(2, "0")}
      </p>
      <p className="font-pixel mt-1.5 text-[8px] tracking-widest text-cream/55 uppercase sm:text-[10px]">{einheit}</p>
    </div>
  );
}

export function ServerCountdown({
  zielIso,
  serverJetzt,
}: {
  zielIso: string;
  /** Zeitstempel vom Server-Rendern, in Millisekunden. */
  serverJetzt: number;
}) {
  const ziel = new Date(zielIso).getTime();
  const [jetzt, setJetzt] = useState(serverJetzt);

  useEffect(() => {
    const takt = window.setInterval(() => setJetzt(Date.now()), SEKUNDE);
    return () => window.clearInterval(takt);
  }, []);

  const rest = ziel - jetzt;
  const gestartet = rest <= 0;

  const tage = Math.floor(rest / TAG);
  const stunden = Math.floor((rest % TAG) / STUNDE);
  const minuten = Math.floor((rest % STUNDE) / MINUTE);
  const sekunden = Math.floor((rest % MINUTE) / SEKUNDE);

  const termin = new Date(zielIso).toLocaleString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });

  if (gestartet) {
    return (
      <div className="mt-10 max-w-lg border-t border-brass-500/20 pt-6">
        <p className="eyebrow text-[10px]">
          <PartyPopper className="size-3.5" /> Es geht los
        </p>
        <p className="font-pixel mt-3 text-sm leading-relaxed text-brass-100 sm:text-base" style={pixelSchatten}>
          Der Server läuft!
        </p>
        <p className="mt-2 text-sm text-cream/65">
          Schnapp dir das Modpack und komm dazu – wir treffen uns am Spawn.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 max-w-lg border-t border-brass-500/20 pt-6">
      <p className="eyebrow text-[10px]">
        <CalendarClock className="size-3.5" /> Server-Start in
      </p>

      {/* Vier gleich breite Spalten statt fester Breiten: So bleibt die Reihe
          auch auf schmalen Handys in einer Zeile, ohne dass etwas umbricht. */}
      <div className="mt-3 grid max-w-sm grid-cols-4 gap-1.5 sm:max-w-md sm:gap-2.5 lg:max-w-lg">
        <Feld wert={tage} einheit={tage === 1 ? "Tag" : "Tage"} />
        <Feld wert={stunden} einheit="Std" />
        <Feld wert={minuten} einheit="Min" />
        <Feld wert={sekunden} einheit="Sek" />
      </div>

      <p className="mt-3 text-sm text-cream/65">{termin} Uhr · Treffpunkt am Spawn</p>
    </div>
  );
}
