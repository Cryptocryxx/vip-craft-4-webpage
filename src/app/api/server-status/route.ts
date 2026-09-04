import { NextResponse } from "next/server";
import { fetchServerStatus } from "@/lib/server-status";
import { getSiteSettings } from "@/lib/settings";
import { viewerMaySeeServerIp } from "@/lib/viewer";

/**
 * GET /api/server-status – Live-Status des Minecraft-Servers (Proxy zu mcsrvstat.us).
 *
 * Die Adresse bekommt nur, wer freigeschaltet ist; fuer alle anderen steht dort
 * null. Deshalb darf die Antwort auch nicht mehr oeffentlich zwischengespeichert
 * werden – sonst bekaeme der naechste Abrufer die Adresse aus dem Cache serviert.
 */
export async function GET() {
  const [settings, darfAdresseSehen] = await Promise.all([getSiteSettings(), viewerMaySeeServerIp()]);
  const status = await fetchServerStatus(settings.serverIp);

  return NextResponse.json(
    { ...status, address: darfAdresseSehen ? status.address : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
