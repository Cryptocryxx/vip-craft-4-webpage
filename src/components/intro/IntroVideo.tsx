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
 * Die Entscheidung wird genau einmal pro Seitenaufruf aus dem DOM gelesen und
 * dann festgehalten. useSyncExternalStore verlangt einen stabilen Wert – und
 * das Attribut selbst raeumen wir spaeter weg.
 */
let entscheidung: boolean | null = null;

function abonnieren() {
  // Nach dem ersten Bildaufbau aendert sich daran nichts mehr.
  return () => {};
}

function imBrowser() {
  entscheidung ??= document.documentElement.dataset.intro === "pending";
  return entscheidung;
}

function aufDemServer() {
  return false;
}

function merken() {
  try {
    localStorage.setItem(SPEICHER_SCHLUESSEL, "1");
  } catch {
    // Privater Modus o. Ä.: dann laeuft das Intro eben noch einmal.
  }
}

export function IntroVideo({ src }: { src: string }) {
  const sollLaufen = useSyncExternalStore(abonnieren, imBrowser, aufDemServer);
  const [beendet, setBeendet] = useState(false);
  const [blendetAus, setBlendetAus] = useState(false);
  const [stumm, setStumm] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const ausblendenLaeuft = useRef(false);

  const aktiv = sollLaufen && !beendet;

  const beenden = useCallback(() => {
    merken();
    delete document.documentElement.dataset.intro;
    setBeendet(true);
  }, []);

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
    // setBeendet ohnehin nur einmal wirkt.
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
        onPlaying={merken}
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
