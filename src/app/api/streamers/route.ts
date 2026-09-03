import { NextResponse } from "next/server";
import { getStreamers } from "@/lib/streamers";

/** GET /api/streamers – verknüpfte Twitch-Kanäle inkl. Live-Status aus der Twitch-API. */
export async function GET() {
  const { streamers, liveStatusAvailable } = await getStreamers();

  return NextResponse.json({
    source: liveStatusAvailable ? "twitch" : "database",
    liveStatusAvailable,
    updatedAt: new Date().toISOString(),
    streamers,
  });
}
