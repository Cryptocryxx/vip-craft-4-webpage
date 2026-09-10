import { NextResponse } from "next/server";
import { rechneKopfgelderAb } from "@/lib/bounties";
import { holeDiscordNachrichten } from "@/lib/discord-chat";
import { holeFlugdaten } from "@/lib/flight";
import { holeEreignisse } from "@/lib/game-log";
import { schreibeGehaltsListe } from "@/lib/salary";
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
  if (status.online) void verarbeiteVormerkungen();

  /*
   * Chat und Befehle laufen auch dann ein, wenn der Watchdog auf diesem Host
   * nicht laeuft. Bewusst OHNE die Bedingung oben: `status.online` kommt von
   * mcsrvstat.us und stand nach einem Neustart des Spielservers noch minutenlang
   * auf "offline", waehrend der Server laengst wieder lief - die Ereignisse
   * waeren so erst beim naechsten Seitenaufruf angekommen. Die Datei liegt bei
   * Crafty; ist der Server aus, aendert sie sich einfach nicht. Eigene Sperre,
   * hoechstens alle 10 Sekunden ein echter Abruf.
   */
  void holeEreignisse();
  // Flugzeit/-strecke von den Luftschiffen, gezaehlt vom KubeJS-Skript.
  void holeFlugdaten();
  /*
   * Kopfgelder: faellige Auszahlungen und abgelaufene Ausschreibungen. Muss
   * NACH holeEreignisse laufen, denn die Todesmeldung, die eine Auszahlung
   * ausloest, kommt von dort - beides ist bewusst nicht abgewartet, die
   * Reihenfolge stellt die eigene Sperre in lib/bounties.ts sicher.
   */
  void rechneKopfgelderAb();
  /*
   * Wer sein Gehalt heute noch nicht geholt hat, wird beim Betreten des
   * Servers daran erinnert. Die Liste dafuer muss regelmaessig neu
   * geschrieben werden - um Mitternacht sind sonst alle faelschlich als
   * erledigt vermerkt (eigene Sperre, hoechstens alle fuenf Minuten).
   */
  void schreibeGehaltsListe();
  // Unabhaengig vom Minecraft-Server: Im Discord-Kanal wird auch geschrieben,
  // waehrend der Server aus ist.
  void holeDiscordNachrichten();

  return NextResponse.json(
    { ...status, address: darfAdresseSehen ? status.address : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
