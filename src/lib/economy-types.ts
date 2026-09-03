/**
 * Typen der Wirtschaftsübersicht. Die Zahlen kommen aus den Numismatics-Bankkonten
 * des Servers (siehe economy-source.ts) – Beträge immer in Spurs, angezeigt wird
 * in Cog (siehe currency.ts).
 */

export type RichPlayer = {
  rank: number;
  player: string;
  balanceSpurs: number;
};

export type EconomyOverview = {
  summary: {
    totalCirculationSpurs: number;
    accountCount: number;
  };
  richest: RichPlayer[];
};

export const emptyEconomyOverview: EconomyOverview = {
  summary: { totalCirculationSpurs: 0, accountCount: 0 },
  richest: [],
};
