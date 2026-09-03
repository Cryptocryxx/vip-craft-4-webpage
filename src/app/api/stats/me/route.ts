import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPlayerStats } from "@/lib/mock/player-stats";
import { loadPlayerStats } from "@/lib/stats-source";

/**
 * GET /api/stats/me – persönliche Ingame-Statistiken des eingeloggten Users.
 * Quelle sind die Vanilla-Statistikdateien des Servers (über Crafty).
 * Ohne Crafty-Konfiguration werden Beispielwerte aus dem Gamertag abgeleitet.
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

  const live = await loadPlayerStats(user.minecraftName);

  if (live) {
    const s = live.stats;
    return NextResponse.json({
      linked: true as const,
      source: "server",
      stats: {
        player: live.name,
        playtimeHours: s.playtimeHours,
        blocksMined: s.blocksMined,
        blocksPlaced: s.blocksPlaced,
        ironMined: s.ironMined,
        deaths: s.deaths,
        mobKills: s.mobKills,
        deathsByCreeper: s.deathsByCreeper,
        walkedKm: s.walkedKm,
        andesiteAlloyCrafted: s.andesiteAlloyCrafted,
        damageTaken: s.damageTaken,
      },
    });
  }

  // Kein Eintrag: entweder Crafty nicht konfiguriert oder der Spieler war noch nie online.
  const mock = getPlayerStats(user.minecraftName);
  return NextResponse.json({
    linked: true as const,
    source: "mock",
    stats: {
      player: mock.player,
      playtimeHours: mock.playtimeHours,
      blocksMined: mock.blocksMined,
      blocksPlaced: mock.blocksPlaced,
      ironMined: mock.ironMined,
      deaths: mock.deaths,
      mobKills: 0,
      deathsByCreeper: 0,
      walkedKm: mock.trainDistanceKm,
      andesiteAlloyCrafted: mock.andesiteAlloyCrafted,
      damageTaken: 0,
    },
  });
}
