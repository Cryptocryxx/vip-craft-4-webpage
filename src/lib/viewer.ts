import "server-only";
import { auth } from "@/auth";
import { imTeam } from "@/lib/roles";

/**
 * Darf der aktuelle Besucher die Server-Adresse sehen?
 *
 * Nur wer freigeschaltet ist – die Adresse nützt vorher ohnehin niemandem, weil
 * der Server eine Whitelist hat. Das Team sieht sie ebenfalls, sonst könnte es
 * im Kontrollraum nicht nachvollziehen, was eingetragen ist.
 *
 * Wichtig fuer alles, was diese Funktion benutzt: Die Antwort haengt an der
 * Sitzung und darf deshalb nie in einem gemeinsamen Cache landen.
 */
export async function viewerMaySeeServerIp(): Promise<boolean> {
  const session = await auth();
  return session?.user?.whitelisted === true || imTeam(session?.user?.role);
}
