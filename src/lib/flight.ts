import "server-only";
import { unstable_rethrow } from "next/navigation";
import { craftyConfigured, craftyReadJson } from "@/lib/crafty";
import { prisma } from "@/lib/prisma";

/**
 * Flugzeit und Flugstrecke auf Luftschiffen.
 *
 * Gezählt wird im Spiel (minecraft/kubejs/server_scripts/flight-log.js), weil
 * es im Spielstand nichts dazu gibt: Minecraft führt Streckenzähler nur für
 * seine eigenen Fahrzeuge und für Elytren – eine Create-Contraption ist keins
 * davon. Ohne eigenes Skript wäre die Zahl nicht zu haben.
 *
 * Die Datei kennt immer nur den LAUFENDEN Serverlauf. Deshalb wird hier pro
 * Lauf eine Zeile gepflegt und die Gesamtsumme daraus gebildet – so ist jedes
 * Abholen wiederholbar, und ein verpasster oder doppelter Abruf verfälscht
 * nichts (siehe FlightStat im Schema).
 */

const QUELLDATEI = "kubejs/data/flight.json";

/** Wie bei den Ereignissen: nicht bei jedem Seitenaufruf zu Crafty rennen. */
const ABSTAND_MS = 30_000;
let letzterLauf = 0;
let laeuft = false;

type FlugDatei = {
  generatedAt?: string;
  runId?: string;
  ready?: boolean;
  errors?: Array<{ at?: string; error?: string }>;
  seen?: Record<string, { gezaehlt?: number; uebersprungen?: number }>;
  players?: Record<string, { name?: string; seconds?: number; meters?: number }>;
};

/**
 * Holt den Stand vom Server ab und schreibt ihn fort.
 *
 * Fehler bleiben folgenlos – beim nächsten Durchgang steht dieselbe Datei
 * wieder da, es geht also nichts verloren.
 */
export async function holeFlugdaten(erzwingen = false): Promise<number> {
  if (!craftyConfigured) return 0;
  if (!erzwingen && (laeuft || Date.now() - letzterLauf < ABSTAND_MS)) return 0;
  laeuft = true;
  letzterLauf = Date.now();

  try {
    const datei = await craftyReadJson<FlugDatei>(QUELLDATEI);
    const runId = datei?.runId;
    const spieler = datei?.players;
    if (!runId || !spieler) return 0;

    let geschrieben = 0;
    for (const [uuid, wert] of Object.entries(spieler)) {
      const seconds = Math.max(0, Math.round(wert.seconds ?? 0));
      const meters = Math.max(0, Math.round(wert.meters ?? 0));
      if (seconds === 0 && meters === 0) continue;

      await prisma.flightStat.upsert({
        where: { runId_uuid: { runId, uuid } },
        create: { runId, uuid, name: wert.name ?? uuid.slice(0, 8), seconds, meters },
        update: { name: wert.name ?? uuid.slice(0, 8), seconds, meters },
      });
      geschrieben += 1;
    }
    return geschrieben;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[flug] Flugdaten konnten nicht geholt werden:", error);
    return 0;
  } finally {
    laeuft = false;
  }
}

export type FlugBilanz = { sekunden: number; meter: number };

const leer: FlugBilanz = { sekunden: 0, meter: 0 };

/**
 * Summe über alle Serverläufe – nach UUID, sonst nach Name.
 *
 * Die UUID ist der verlässliche Schlüssel; der Name ist nur der Notnagel für
 * Leute, zu denen wir (noch) keine UUID kennen.
 */
export async function flugBilanz(uuid: string | null, name: string): Promise<FlugBilanz> {
  const zeilen = await prisma.flightStat.findMany({
    where: uuid ? { uuid } : { name },
    select: { seconds: true, meters: true },
  });
  if (zeilen.length === 0) return leer;

  return zeilen.reduce<FlugBilanz>(
    (summe, zeile) => ({ sekunden: summe.sekunden + zeile.seconds, meter: summe.meter + zeile.meters }),
    { ...leer },
  );
}

/** Läuft das Skript auf dem Server, und was hat es dabei gesehen? */
export async function flugDiagnose(): Promise<FlugDatei | null> {
  if (!craftyConfigured) return null;
  try {
    return await craftyReadJson<FlugDatei>(QUELLDATEI);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}
