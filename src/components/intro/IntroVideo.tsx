"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SkipForward, Volume2, VolumeX } from "lucide-react";

/**
 * Intro beim allerersten Besuch der Startseite.
 *
 * Ablauf: Video laeuft formatfuellend ueber der Seite, und in der letzten
 * Sekunde – waehrend das Logo durch die Kamera fliegt – wird die Einblendung
 * transparent, sodass die Website darunter zum Vorschein kommt.
 *
 * Ob das Intro ueberhaupt starten soll, entscheidet ein winziges Skript im
 * <head> (siehe layout.tsx) noch vor dem ersten Bildaufbau. Es setzt
 * data-intro="pending" am <html>, damit Wiederkehrer nicht kurz das schwarze
 * Bild aufblitzen sehen und Erstbesucher nicht kurz die Seite.
 */

const SPEICHER_SCHLUESSEL = "vipcraft:intro-gesehen";
/** So lange dauert die Ausblendung – passend zum Logo-Flug am Ende. */
const AUSBLENDEN_SEKUNDEN = 1;

/**
 * Ob das Intro laufen soll, ist ein Zustand ausserhalb von React: Er steht im
 * DOM, gesetzt vom Skript im <head>. Deshalb ein kleiner eigener Speicher mit
 * Zuhoerern statt React-State.
 *
 * Wichtig ist der Modulzustand: Beim Wechsel auf eine andere Seite und zurueck
 * haengt Next.js die Komponente neu ein. Laege das "schon gelaufen" nur im
 * State der Komponente, waere es dann wieder weg – und das Intro liefe erneut.
 * Genau das war der Fehler.
 */
let sollLaufen: boolean | null = null;
const zuhoerer = new Set<() => void>();

function abonnieren(melden: () => void) {
  zuhoerer.add(melden);
  return () => {
    zuhoerer.delete(melden);
  };
}

function imBrowser() {
  sollLaufen ??= document.documentElement.dataset.intro === "pending";
  return sollLaufen;
}

function aufDemServer() {
  return false;
}

/** Beendet das Intro fuer diesen Seitenaufruf – endgueltig, auch ueber Remounts hinweg. */
function beendeIntro() {
  if (sollLaufen === false) return;
  sollLaufen = false;
  merken();
  delete document.documentElement.dataset.intro;
  for (const melden of zuhoerer) melden();
}

/**
 * Zweites Netz. Den Merker setzt eigentlich schon das Skript im <head>, sobald
 * feststeht, dass das Intro laeuft (siehe layout.tsx) – hier wird nur
 * sichergestellt, dass er auch dann steht, wenn dort etwas schiefging.
 */
function merken() {
  try {
    localStorage.setItem(SPEICHER_SCHLUESSEL, "1");
  } catch {
    // Privater Modus o. Ä.: dann laeuft das Intro eben noch einmal.
  }
}

export function IntroVideo({ src }: { src: string }) {
  const aktiv = useSyncExternalStore(abonnieren, imBrowser, aufDemServer);
  const [blendetAus, setBlendetAus] = useState(false);
  const [stumm, setStumm] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const ausblendenLaeuft = useRef(false);

  // Modulfunktion, also von sich aus stabil – kein useCallback noetig.
  const beenden = beendeIntro;

  /**
   * Ausblenden ueber die Web Animations API statt ueber eine CSS-Transition.
   *
   * Grund: Waehrend das Video laeuft, ist der Hauptthread mit dem Dekodieren
   * ausgelastet – gemessen kamen setInterval-Rueckrufe mit 120 ms Vorgabe erst
   * nach rund 1000 ms an. Eine Transition, die auf React-Rendern und den
   * Hauptthread angewiesen ist, springt dann sichtbar statt zu blenden.
   * animate() laeuft dagegen auf dem Compositor und bleibt auch unter Last weich.
   */
  const ausblenden = useCallback(() => {
    if (ausblendenLaeuft.current) return;
    ausblendenLaeuft.current = true;
    setBlendetAus(true);

    const overlay = overlayRef.current;
    if (!overlay?.animate) {
      window.setTimeout(beenden, AUSBLENDEN_SEKUNDEN * 1000);
      return;
    }

    const blende = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: AUSBLENDEN_SEKUNDEN * 1000,
      easing: "ease-in",
      fill: "forwards",
    });

    // Aufraeumen, sobald die Blende durch ist. Zusaetzlich eine feste Frist:
    // In einem Hintergrund-Tab laufen Animationen nicht, dann loest `finished`
    // nicht aus – ohne die Frist bliebe die schwarze Flaeche stehen, bis jemand
    // den Tab wieder nach vorn holt. Beide Wege enden in `beenden`, das durch
    // die Pruefung in beendeIntro ohnehin nur einmal wirkt.
    blende.finished.then(beenden, beenden);
    window.setTimeout(beenden, AUSBLENDEN_SEKUNDEN * 1000 + 500);
  }, [beenden]);

  // Sicherheitsnetz: Bleibt das Video haengen oder laedt es nicht, darf die
  // Seite nicht dauerhaft hinter einer schwarzen Flaeche verschwinden.
  useEffect(() => {
    if (!aktiv) return;
    const notbremse = window.setTimeout(beenden, 20_000);
    return () => window.clearTimeout(notbremse);
  }, [aktiv, beenden]);

  // Escape beendet das Intro – gleiche Erwartung wie bei jedem Overlay.
  useEffect(() => {
    if (!aktiv) return;
    const taste = (event: KeyboardEvent) => {
      if (event.key === "Escape") beenden();
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [aktiv, beenden]);

  if (!aktiv) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] bg-black"
      // Waehrend der Ausblendung soll die Seite darunter schon bedienbar sein.
      aria-hidden={blendetAus}
      // dito: sonst fingen die Knoepfe des Intros die Klicks ab.
      inert={blendetAus}
    >
      <video
        ref={videoRef}
        src={src}
        className="size-full object-cover"
        autoPlay
        muted={stumm}
        playsInline
        preload="auto"
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          if (!Number.isFinite(video.duration)) return;
          if (video.duration - video.currentTime <= AUSBLENDEN_SEKUNDEN) ausblenden();
        }}
        onEnded={ausblenden}
        onError={beenden}
      />

      <div className="absolute right-4 bottom-4 flex gap-2 sm:right-6 sm:bottom-6">
        <button
          type="button"
          onClick={() => {
            const video = videoRef.current;
            const neu = !stumm;
            if (video) video.muted = neu;
            setStumm(neu);
          }}
          className="btn btn-sm border border-white/25 bg-black/50 text-white/90 backdrop-blur hover:bg-black/70"
          aria-label={stumm ? "Ton einschalten" : "Ton ausschalten"}
        >
          {stumm ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        <button
          type="button"
          onClick={beenden}
          className="btn btn-sm border border-white/25 bg-black/50 text-white/90 backdrop-blur hover:bg-black/70"
        >
          <SkipForward className="size-4" /> Überspringen
        </button>
      </div>
    </div>
  );
}
