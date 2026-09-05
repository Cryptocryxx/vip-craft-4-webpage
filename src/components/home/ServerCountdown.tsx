"use client";

import { useEffect, useState } from "react";
import { CalendarClock, PartyPopper } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Gear } from "@/components/ui/Gear";

/**
 * Countdown bis zum Server-Start.
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
const pixelSchatten = { textShadow: "0.12em 0.12em 0 rgba(0,0,0,0.6)" };

function Feld({ wert, einheit }: { wert: number; einheit: string }) {
  return (
    <div
      className={
        // Der abgeschraegte Rahmen der Minecraft-Oberflaeche: oben/links hell,
        // unten/rechts dunkel. Bewusst ohne runde Ecken.
        "min-w-[4.75rem] border-4 border-t-white/25 border-l-white/25 border-r-black/60 border-b-black/60 bg-wood-900/80 px-3 py-2.5 text-center sm:min-w-[6rem]"
      }
    >
      <p className="font-pixel text-2xl leading-none font-bold text-brass-100 sm:text-4xl" style={pixelSchatten}>
        {String(wert).padStart(2, "0")}
      </p>
      <p className="font-pixel mt-2 text-[9px] tracking-widest text-cream/55 uppercase sm:text-[10px]">{einheit}</p>
    </div>
  );
}

export function ServerCountdown({
  zielIso,
  serverJetzt,
  titel,
}: {
  zielIso: string;
  /** Zeitstempel vom Server-Rendern, in Millisekunden. */
  serverJetzt: number;
  titel: string;
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

  return (
    <section className="relative overflow-hidden border-b border-brass-500/20 bg-wood-950/60 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <Gear teeth={16} className="absolute -top-24 -left-20 size-80 text-brass-500/7 animate-gear-spin" />
        <Gear teeth={20} className="absolute -right-24 -bottom-28 size-96 text-diamond-400/6 animate-gear-spin-reverse" />
      </div>

      <Container className="relative flex flex-col items-center text-center">
        <p className="eyebrow">
          {gestartet ? <PartyPopper className="size-3.5" /> : <CalendarClock className="size-3.5" />}
          {gestartet ? "Es geht los" : "Countdown"}
        </p>

        <h2 className="font-pixel mt-3 text-base leading-relaxed text-cream sm:text-xl" style={pixelSchatten}>
          {titel}
        </h2>

        {gestartet ? (
          <p className="mt-5 max-w-lg text-cream/75">
            Der Startschuss ist gefallen – wir sind auf dem Server. Schnapp dir das Modpack und komm dazu.
          </p>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-stretch justify-center gap-2 sm:gap-3">
              <Feld wert={tage} einheit={tage === 1 ? "Tag" : "Tage"} />
              <Feld wert={stunden} einheit="Std" />
              <Feld wert={minuten} einheit="Min" />
              <Feld wert={sekunden} einheit="Sek" />
            </div>

            <p className="mt-5 text-sm text-cream/65">
              {termin} Uhr · Treffpunkt am Spawn
            </p>
          </>
        )}
      </Container>
    </section>
  );
}
