import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadPlayerStats } from "@/lib/stats-source";

/**
 * GET /api/stats/me – persönliche Ingame-Statistiken des eingeloggten Users.
 * Quelle sind ausschließlich die Vanilla-Statistikdateien des Servers (über
 * Crafty). Gibt es dort keinen Eintrag, kommt `stats: null` zurück – lieber
 * nichts anzeigen als ausgedachte Zahlen.
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
  return NextResponse.json({ linked: true as const, source: "none", stats: null });
}
