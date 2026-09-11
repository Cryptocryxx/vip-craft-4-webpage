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
      /*
       * Gestartet wird das fertige Bündel aus GitHub Actions, nicht mehr die
       * Next-Binary aus node_modules.
       *
       * `current` ist ein Symlink auf das zuletzt erfolgreich geprüfte Release
       * unter releases/ (siehe deploy/webhook.mjs). Ein Deploy legt diesen
       * Symlink in einem Zug um; ein `pm2 restart vipcraft` greift danach die
       * neue Fassung. Zurückrudern heißt: Symlink auf ein älteres Release
       * zeigen lassen und neu starten - mehr ist es nicht.
       *
       * node_modules gibt es auf dem Server nicht mehr. Genau darum geht es:
       * `npm ci` hat die Maschine den Arbeitsspeicher gekostet und dabei die
       * laufende Seite mitgerissen.
       */
      script: "current/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      // Absichtlich kein max_memory_restart: Jeder Neustart setzt den Watchdog
      // zurück, der dann erst wieder eine Runde nur beobachtet, bevor er handelt.
      /*
       * HOSTNAME wird hier BEWUSST nicht gesetzt, obwohl die Next-Doku es beim
       * Standalone-Betrieb nebenbei erwähnt.
       *
       * Die deutschen Adressen haben kein Sprachpräfix (/shops statt
       * /de/shops) und entstehen erst durch einen Rewrite der
       * next-intl-Middleware. Steht HOSTNAME auf einer konkreten Adresse, hält
       * das Standalone-Bündel diesen Rewrite für fremde Herkunft und macht
       * eine 307-Weiterleitung auf sich selbst daraus: Jede deutsche Seite
       * landet im Ring, während die englische heil bleibt. Am 11.09.2026 genau
       * so nachgestellt. Ohne HOSTNAME lauscht der Server ohnehin auf allen
       * Adressen, und nginx spricht ihn über 127.0.0.1:3000 an.
       */
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      time: true,
    },

    {
      // Deploy-Webhook (siehe deploy/webhook.mjs). Laeuft absichtlich getrennt
      // von der Website: nach einem kaputten Build waere die Seite unten, und
      // mit ihr das Werkzeug, mit dem man den Fehler behebt.
      name: "deploy-webhook",
      script: "deploy/webhook.mjs",
      // Das Skript hat keine Abhaengigkeiten und ueberlebt deshalb das
      // "npm ci", das es selbst ausloest. --env-file liest das Secret aus der
      // .env (Node >= 20.6); pm2 selbst kennt keine .env-Dateien.
      node_args: ["--env-file=.env"],
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      time: true,
    },
  ],
};
