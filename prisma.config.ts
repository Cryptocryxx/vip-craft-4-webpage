import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Vorgabe wie in src/lib/prisma.ts, statt env("DATABASE_URL") aus prisma/config.
 *
 * Grund: `npm ci` ruft über postinstall `prisma generate` auf. Bei einem frischen
 * Clone gibt es die .env zu dem Zeitpunkt noch nicht, und env() bricht dann hart
 * ab – die Installation schlägt fehl, bevor man überhaupt konfigurieren kann.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
