import { NextResponse } from "next/server";
import { getEconomyData } from "@/lib/economy-source";

/**
 * GET /api/economy – Umlauf, Vermögen und Organisationen aus der Numismatics-Bank
 * des Servers, dieselben Daten wie auf /economy.
 *
 * Beträge stehen in Spurs; ein Cog entspricht 64 Spurs (siehe lib/currency.ts).
 * `vermoegen` ist die vollständige Liste, absteigend sortiert – wer nur die
 * Spitze braucht, schneidet sich die ersten Einträge heraus.
 *
 * Ohne Crafty-Konfiguration oder ohne lesbare Bankdaten kommt eine leere
 * Übersicht mit `source: "unavailable"` zurück.
 */
export async function GET() {
  const { overview, source } = await getEconomyData();

  return NextResponse.json({
    source,
    updatedAt: new Date().toISOString(),
    ...overview,
  });
}
