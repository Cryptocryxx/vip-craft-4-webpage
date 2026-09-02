import { NextResponse } from "next/server";
import { getEconomyOverview } from "@/lib/mock/economy";

/** GET /api/economy – reichste Spieler & aktive Shops (Mock, später Plan-Plugin). */
export async function GET() {
  return NextResponse.json({
    source: "mock",
    updatedAt: new Date().toISOString(),
    ...getEconomyOverview(),
  });
}
