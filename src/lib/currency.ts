/**
 * Die Währung des Servers: Create: Numismatics.
 *
 * Intern rechnet Numismatics alles in Spurs – so kommen die Kontostände auch aus
 * dem KubeJS-Export. Angezeigt wird auf der Website aber in Cog, weil ingame in
 * Cog gehandelt und gepreist wird. Ein Cog sind 64 Spurs.
 */
import { formatNumber } from "@/lib/format";

export const SPURS_PER_COG = 64;

/** Alle Numismatics-Münzen mit ihrem Wert in Spurs, aufsteigend. */
export const COINS = [
  { name: "Spur", spurs: 1 },
  { name: "Bevel", spurs: 8 },
  { name: "Sprocket", spurs: 16 },
  { name: "Cog", spurs: 64 },
  { name: "Crown", spurs: 512 },
  { name: "Sun", spurs: 4096 },
] as const;

export const currencyName = { singular: "Cog", plural: "Cogs" } as const;

/** Spurs in Cog umrechnen (kann Nachkommastellen haben). */
export function toCogs(spurs: number): number {
  return spurs / SPURS_PER_COG;
}

/**
 * Kontostand für die Anzeige: „2.440 Cog", bei krummen Beträgen „2.440 Cog 12 Spur".
 * Ohne Einheit, damit Tabellen die Spalte selbst beschriften können, siehe `formatCogsLong`.
 */
export function formatCogs(spurs: number): string {
  const cogs = Math.floor(spurs / SPURS_PER_COG);
  const rest = spurs % SPURS_PER_COG;
  return rest === 0 ? formatNumber(cogs) : `${formatNumber(cogs)} + ${rest} Spur`;
}

/** Wie `formatCogs`, aber mit ausgeschriebener Einheit: „2.440 Cog". */
export function formatCogsLong(spurs: number): string {
  const cogs = Math.floor(spurs / SPURS_PER_COG);
  const rest = spurs % SPURS_PER_COG;
  const base = `${formatNumber(cogs)} Cog`;
  return rest === 0 ? base : `${base} ${rest} Spur`;
}

/** Exakter Betrag für Tooltips – die Spurs, die tatsächlich auf dem Konto liegen. */
export function formatSpurs(spurs: number): string {
  return `${formatNumber(spurs)} Spur`;
}
