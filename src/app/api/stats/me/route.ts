import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPlayerStats } from "@/lib/mock/player-stats";

/**
 * GET /api/stats/me – persönliche Ingame-Statistiken des eingeloggten Users.
 * Mock-API: Werte werden aus dem verknüpften Gamertag abgeleitet (später Plan-Plugin).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { minecraftName: true },
  });

  if (!user?.minecraftName) {
    return NextResponse.json({ linked: false as const, stats: null });
  }

  return NextResponse.json({
    linked: true as const,
    source: "mock",
    stats: getPlayerStats(user.minecraftName),
  });
}
