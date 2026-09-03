/**
 * Mock-API für persönliche Ingame-Statistiken.
 * Werte werden deterministisch aus dem Spielernamen abgeleitet, damit sie zwischen Aufrufen stabil bleiben.
 * TODO: Später aus der Vanilla-Statistikdatei des Spielers (world/stats/<uuid>.json) lesen.
 */
import { hashString, mulberry32 } from "@/lib/utils";

export type PlayerStats = {
  player: string;
  rank: number;
  playtimeHours: number;
  blocksMined: number;
  blocksPlaced: number;
  ironMined: number;
  deaths: number;
  lavaDeaths: number;
  trainDistanceKm: number;
  andesiteAlloyCrafted: number;
  peakStressUnits: number;
  schematicsUploaded: number;
  firstJoined: string;
  lastSeen: string;
};

const SEASON_START = new Date("2026-08-15T18:00:00+02:00").getTime();
const DAY = 24 * 60 * 60 * 1000;

export function getPlayerStats(player: string, now: Date = new Date()): PlayerStats {
  const rnd = mulberry32(hashString(player.toLowerCase()));
  const round = (n: number, digits = 0) => Number(n.toFixed(digits));

  const playtimeHours = round(20 + rnd() * 300, 1);
  const deaths = Math.floor(rnd() * 80);

  return {
    player,
    rank: 1 + Math.floor(rnd() * 40),
    playtimeHours,
    blocksMined: Math.floor(playtimeHours * (800 + rnd() * 900)),
    blocksPlaced: Math.floor(playtimeHours * (500 + rnd() * 900)),
    ironMined: Math.floor(playtimeHours * (40 + rnd() * 120)),
    deaths,
    lavaDeaths: Math.floor(deaths * rnd() * 0.6),
    trainDistanceKm: round(rnd() * 700, 1),
    andesiteAlloyCrafted: Math.floor(playtimeHours * (60 + rnd() * 200)),
    peakStressUnits: Math.floor(256 * (1 + Math.floor(rnd() * 64))),
    schematicsUploaded: Math.floor(rnd() * 5),
    firstJoined: new Date(SEASON_START + rnd() * 10 * DAY).toISOString(),
    lastSeen: new Date(now.getTime() - rnd() * 2 * DAY).toISOString(),
  };
}
