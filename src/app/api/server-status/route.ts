import { NextResponse } from "next/server";
import { fetchServerStatus } from "@/lib/server-status";
import { getSiteSettings } from "@/lib/settings";

/** GET /api/server-status – Live-Status des Minecraft-Servers (Proxy zu mcsrvstat.us). */
export async function GET() {
  const settings = await getSiteSettings();
  const status = await fetchServerStatus(settings.serverIp);

  return NextResponse.json(status, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
