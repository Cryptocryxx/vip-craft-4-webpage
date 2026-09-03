import { NextResponse } from "next/server";
import { getEconomyData } from "@/lib/economy-source";

/**
 * GET /api/economy – reichste Spieler & Umlauf aus den Create-Numismatics-Bankkonten.
 * Beträge sind in Spurs; ein Cog entspricht 64 Spurs (siehe lib/currency.ts).
 * Ohne Crafty-Konfiguration oder ohne kubejs/data/numismatics.json kommt eine leere
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
