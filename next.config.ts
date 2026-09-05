import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Projekt-Root explizit setzen (verhindert, dass Turbopack fremde Lockfiles im Home-Verzeichnis findet).
  turbopack: { root: process.cwd() },
  // Native SQLite-Bindings dürfen nicht vom Bundler angefasst werden.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
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
