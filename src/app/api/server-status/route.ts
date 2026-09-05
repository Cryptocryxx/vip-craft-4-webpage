import { NextResponse } from "next/server";
import { holeEreignisse } from "@/lib/game-log";
import { fetchServerStatus } from "@/lib/server-status";
import { getSiteSettings } from "@/lib/settings";
import { viewerMaySeeServerIp } from "@/lib/viewer";
import { verarbeiteVormerkungen } from "@/lib/whitelist-queue";

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

  /*
   * Der Server ist wieder da: vorgemerkte Freigaben nachholen (siehe
   * lib/whitelist-queue). Bewusst hier – diesen Abruf macht das Status-Feld im
   * Seitenkopf ohnehin regelmaessig, und "als online gerendert" ist genau der
   * Moment, in dem die Konsole wieder Befehle annimmt.
   *
   * Nicht abgewartet, damit der Statuscheck schnell bleibt; die Sperre in der
   * Warteschlange sorgt dafuer, dass daraus hoechstens alle 30 Sekunden ein
   * Durchlauf wird, egal wie viele Tabs gerade offen sind.
   */
  if (status.online) {
    void verarbeiteVormerkungen();
    // Aus demselben Grund hier: So laufen Chat und Befehle auch dann ein, wenn
    // der Watchdog auf diesem Host nicht laeuft. Eigene Sperre, hoechstens alle
    // 10 Sekunden ein echter Abruf.
    void holeEreignisse();
  }

  return NextResponse.json(
    { ...status, address: darfAdresseSehen ? status.address : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
