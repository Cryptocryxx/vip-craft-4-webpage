import { NextResponse } from "next/server";
import { getStreamers } from "@/lib/mock/streamers";

/** GET /api/streamers – Streamer des Servers inkl. Live-Status (Mock, später Twitch Helix API). */
export async function GET() {
  return NextResponse.json({
    source: "mock",
    updatedAt: new Date().toISOString(),
    streamers: getStreamers(),
  });
}
