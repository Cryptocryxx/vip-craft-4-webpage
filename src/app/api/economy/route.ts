import { NextResponse } from "next/server";
import { getEconomyData } from "@/lib/economy-source";

/**
 * GET /api/economy – reichste Spieler & Umlauf aus den Create-Numismatics-Bankkonten.
 * Ohne Crafty-Konfiguration oder ohne kubejs/data/numismatics.json werden Beispieldaten
 * geliefert (`source: "mock"`). Shops kennt Numismatics nicht, die bleiben Beispieldaten.
 */
export async function GET() {
  const { overview, source, shopsSource } = await getEconomyData();

  return NextResponse.json({
    source,
    shopsSource,
    updatedAt: new Date().toISOString(),
    ...overview,
  });
}
