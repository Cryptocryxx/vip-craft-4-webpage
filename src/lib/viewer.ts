import "server-only";
import { auth } from "@/auth";

/**
 * Darf der aktuelle Besucher die Server-Adresse sehen?
 *
 * Nur wer freigeschaltet ist – die Adresse nützt vorher ohnehin niemandem, weil
 * der Server eine Whitelist hat. Admins sehen sie ebenfalls, sonst könnten sie
 * im Kontrollraum nicht nachvollziehen, was eingetragen ist.
 *
 * Wichtig fuer alles, was diese Funktion benutzt: Die Antwort haengt an der
 * Sitzung und darf deshalb nie in einem gemeinsamen Cache landen.
 */
export async function viewerMaySeeServerIp(): Promise<boolean> {
  const session = await auth();
  return session?.user?.whitelisted === true || session?.user?.role === "ADMIN";
}
