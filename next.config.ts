import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Projekt-Root explizit setzen (verhindert, dass Turbopack fremde Lockfiles im Home-Verzeichnis findet).
  turbopack: { root: process.cwd() },
  // Native SQLite-Bindings dürfen nicht vom Bundler angefasst werden.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],

  /*
   * Gebaut wird in GitHub Actions, nicht auf dem Server: Dort hat `npm ci`
   * zuletzt 1,1 GB angefordert und wurde vom OOM-Killer erschlagen — mit ihm
   * verschwand node_modules und damit die Startdatei der laufenden Seite.
   *
   * "standalone" legt unter .next/standalone einen Ordner ab, der alles
   * Nötige schon enthält (inklusive der wirklich benutzten Teile von
   * node_modules) und sich mit `node server.js` starten lässt. Auf dem Server
   * läuft dann gar kein npm mehr.
   *
   * `next start` funktioniert unverändert weiter - diese Zeile nimmt nichts
   * weg, sie legt nur zusätzlich den Standalone-Ordner an.
   */
  output: "standalone",

  /*
   * better-sqlite3 lädt seine kompilierte .node-Datei zur Laufzeit über einen
   * zusammengesetzten Pfad. Die statische Analyse (@vercel/nft), die den
   * Standalone-Ordner füllt, sieht solche Pfade nicht zuverlässig - genau für
   * diesen Fall nennt die Next-Doku `outputFileTracingIncludes` (Beispiel dort:
   * sharp). Ohne das fehlt die Bindung im Bundle und der Server startet nicht.
   */
  outputFileTracingIncludes: {
    "/*": ["node_modules/better-sqlite3/**/*"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "mc-heads.net" },
      { protocol: "https", hostname: "static-cdn.jtvnw.net" },
    ],
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
