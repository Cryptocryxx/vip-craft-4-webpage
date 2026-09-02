import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/config";
import { fetchServerStatus } from "@/lib/server-status";

/** GET /api/server-status – Live-Status des Minecraft-Servers (Proxy zu mcsrvstat.us). */
export async function GET() {
  const status = await fetchServerStatus(siteConfig.serverIp);

  return NextResponse.json(status, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
