import { NextResponse, type NextRequest } from "next/server";
import { getLeaderboards } from "@/lib/mock/leaderboards";

/**
 * GET /api/leaderboards?kind=fame|shame
 * Mock-API – wird später mit dem Plan-Plugin verknüpft.
 */
export async function GET(request: NextRequest) {
  const kindParam = request.nextUrl.searchParams.get("kind");
  const kind = kindParam === "fame" || kindParam === "shame" ? kindParam : undefined;

  return NextResponse.json({
    source: "mock",
    updatedAt: new Date().toISOString(),
    boards: getLeaderboards(kind),
  });
}
