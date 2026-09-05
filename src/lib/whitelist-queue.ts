import "server-only";
import { serverStartZeit } from "@/lib/event-types";
import { prisma } from "@/lib/prisma";
import { imTeam } from "@/lib/roles";
import { whitelistAdd } from "@/lib/server-commands";

/**
 * Vorgemerkte Whitelist-Einträge.
 *
 * Der Befehl `whitelist add` geht über Crafty an die Server-Konsole – und die
 * gibt es nur, solange der Server läuft. Ist er aus, scheiterte die Freigabe
 * bisher mit einer Fehlermeldung, obwohl in der Datenbank längst alles stimmte.
 * Für die betroffene Person sah das aus, als sei sie nicht freigeschaltet.
 *
 * Jetzt wird stattdessen vorgemerkt: Die Freigabe gilt sofort, der Befehl wird
 * nachgeholt, sobald der Server wieder oben ist.
 */

/**
 * Ist die Freigabe auf dem Server noch gesperrt?
 *
 * Bis zum Serverstart wird niemand ausser Admins wirklich auf die
 * Server-Whitelist geschrieben – auch dann nicht, wenn der Server schon läuft.
 * Anträge werden trotzdem angenommen und gelten; sie stehen nur alle
 * gleichzeitig zum Start bereit, statt dass die Ersten schon vorher allein
 * losziehen. Das Team bleibt ausgenommen, sonst käme vor dem Start niemand zum
 * Vorbereiten auf den Server.
 */
export function freigabeGesperrt(): boolean {
  const start = serverStartZeit();
  return start !== null && Date.now() < start.getTime();
}

/** Vor dem Start bekommt nur das Team den Befehl, alle anderen eine Vormerkung. */
export function nurVormerken(rolle: string): boolean {
  return freigabeGesperrt() && !imTeam(rolle);
}

/** Die Freigabe steht, der Serverbefehl fehlt noch. */
export async function merkeVor(userId: string): Promise<void> {
  try {
    await prisma.user.update({ where: { id: userId }, data: { whitelistPending: true } });
  } catch (error) {
    console.error("[whitelist] Vormerkung konnte nicht gespeichert werden:", error);
  }
}

/** Wie viele warten gerade? Billiger als die ganze Liste zu holen. */
export async function anzahlVormerkungen(): Promise<number> {
  try {
    return await prisma.user.count({ where: { whitelistPending: true } });
  } catch (error) {
    console.error("[whitelist] Vormerkungen nicht zaehlbar:", error);
    return 0;
  }
}

/**
 * Wie lange mindestens zwischen zwei Durchläufen liegen muss.
 *
 * Ausgelöst wird das unter anderem vom Status-Abruf im Kopf der Seite, und den
 * ruft jeder offene Tab regelmäßig auf. Ohne Sperre liefen bei zehn Besuchern
 * zehn Durchläufe gleichzeitig.
 */
const ABSTAND_MS = 30_000;
let letzterLauf = 0;
let laeuft = false;

/**
 * Holt die vorgemerkten Freigaben nach. Wird aufgerufen, sobald der Server als
 * laufend erkannt wird – vom Watchdog und vom Status-Abruf der Website.
 *
 * Fehler bleiben folgenlos: Wer nicht durchgeht, bleibt vorgemerkt und kommt
 * beim nächsten Mal wieder dran.
 */
export async function verarbeiteVormerkungen(): Promise<{ erledigt: number; offen: number }> {
  // Vor dem Serverstart bleiben alle vorgemerkt, auch wenn der Server laeuft.
  if (freigabeGesperrt()) return { erledigt: 0, offen: 0 };
  if (laeuft || Date.now() - letzterLauf < ABSTAND_MS) return { erledigt: 0, offen: 0 };
  laeuft = true;
  letzterLauf = Date.now();

  try {
    const wartende = await prisma.user.findMany({
      where: {
        whitelistPending: true,
        whitelisted: true,
        // Wer gerade ausgesetzt ist, soll nicht durch die Hintertuer zurueck.
        whitelistSuspended: false,
        NOT: { minecraftName: null },
      },
      select: { id: true, minecraftName: true },
    });

    let erledigt = 0;
    for (const person of wartende) {
      if (!person.minecraftName) continue;

      const ergebnis = await whitelistAdd(person.minecraftName, "Vorgemerkte Freigabe nachgeholt", null);
      if (!ergebnis.ok) continue;

      await prisma.user.update({ where: { id: person.id }, data: { whitelistPending: false } });
      erledigt += 1;
    }

    return { erledigt, offen: wartende.length - erledigt };
  } catch (error) {
    console.error("[whitelist] Vormerkungen konnten nicht verarbeitet werden:", error);
    return { erledigt: 0, offen: 0 };
  } finally {
    laeuft = false;
  }
}
