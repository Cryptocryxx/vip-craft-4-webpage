/**
 * pm2-Konfiguration für den Produktivbetrieb.
 *
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup     (einmalig, damit es den Reboot überlebt)
 *
 * Bewusst EINE Instanz im fork-Modus, kein Cluster:
 *
 * ▸ Der Watchdog (siehe src/lib/server-watchdog.ts) läuft als Intervall im
 *   Prozess. Bei mehreren Instanzen würde jede für sich einen Absturz erkennen
 *   und alle würden gleichzeitig einen Startbefehl an Crafty schicken.
 * ▸ Die SQLite-Datei verträgt nebenläufige Schreiber schlecht.
 *
 * Umgebungsvariablen kommen aus der .env im Projektordner – die liest Next.js
 * beim Start selbst ein. Sie gehört NICHT ins Repo.
 */
module.exports = {
  apps: [
    {
      name: "vipcraft",
      // Direkt die Next-Binary statt "npm run start": spart den npm-Wrapper-Prozess,
      // dadurch trifft pm2 stop/restart wirklich den Server und nicht nur die Hülle.
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      // Absichtlich kein max_memory_restart: Jeder Neustart setzt den Watchdog
      // zurück, der dann erst wieder eine Runde nur beobachtet, bevor er handelt.
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      time: true,
    },
  ],
};
