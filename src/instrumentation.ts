/**
 * Wird einmal beim Start der Next.js-Serverinstanz ausgeführt.
 *
 * Hier hängt der Watchdog dran, der den Minecraft-Server im Blick behält und
 * ihn nach einem Absturz neu startet. Er läuft nur, wenn SERVER_WATCHDOG="true"
 * gesetzt ist – siehe server-watchdog.ts.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startWatchdog } = await import("@/lib/server-watchdog");
  startWatchdog();
}
