/**
 * Rolle eines Accounts von der Kommandozeile setzen – zum Testen und für den
 * Notfall, wenn im Kontrollraum niemand mehr Admin ist.
 *
 *   npx tsx scripts/rolle.ts                      alle Accounts auflisten
 *   npx tsx scripts/rolle.ts <Name> MODERATOR     Rolle setzen
 *
 * Gesucht wird über Discord-Name, Minecraft-Name oder Account-Id.
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { ROLLEN, istRolle } from "../src/lib/roles";

// Dieselbe Anbindung wie lib/prisma.ts – Prisma 7 braucht den Driver-Adapter.
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});

async function main(): Promise<void> {
  const [suche, rolle] = process.argv.slice(2);

  if (!suche) {
    const alle = await prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, minecraftName: true, role: true },
    });
    for (const u of alle) {
      console.log(`${u.role.padEnd(10)} ${u.name ?? "?"} (${u.minecraftName ?? "kein MC-Name"}) ${u.id}`);
    }
    return;
  }

  if (!rolle || !istRolle(rolle)) {
    console.error(`Rolle fehlt oder ist unbekannt. Erlaubt: ${ROLLEN.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const treffer = await prisma.user.findFirst({
    where: { OR: [{ id: suche }, { name: suche }, { minecraftName: suche }] },
    select: { id: true, name: true, role: true },
  });

  if (!treffer) {
    console.error(`Keinen Account gefunden für „${suche}".`);
    process.exitCode = 1;
    return;
  }

  await prisma.user.update({ where: { id: treffer.id }, data: { role: rolle } });
  console.log(`${treffer.name ?? treffer.id}: ${treffer.role} → ${rolle}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
