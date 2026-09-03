import { NextResponse, type NextRequest } from "next/server";
import { getLeaderboardData } from "@/lib/leaderboard-source";

/**
 * GET /api/leaderboards?kind=fame|shame
 * Speist sich aus den Vanilla-Statistikdateien des Servers (über Crafty).
 * Ohne Crafty-Konfiguration werden Beispieldaten geliefert (`source: "mock"`).
 */
export async function GET(request: NextRequest) {
  const kindParam = request.nextUrl.searchParams.get("kind");
  const kind = kindParam === "fame" || kindParam === "shame" ? kindParam : undefined;

  const { boards, source } = await getLeaderboardData(kind);

  return NextResponse.json({
    source,
    updatedAt: new Date().toISOString(),
    boards,
  });
}
