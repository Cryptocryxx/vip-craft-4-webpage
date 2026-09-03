/**
 * Seed-Daten für die lokale Entwicklung.
 * Ausführen mit: npx prisma db seed
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const users = [
  // twitchName: echte, dauerhaft existierende Kanaele, damit der Live-Status lokal testbar ist
  { email: "lorenz@example.com", name: "Lorenz", minecraftName: "Lorenz", twitchName: "twitch", whitelisted: true, role: "ADMIN" },
  { email: "jonas@example.com", name: "Jonas", minecraftName: "Jonas_MC", twitchName: null, whitelisted: true, role: "PLAYER" },
  { email: "mia@example.com", name: "Mia", minecraftName: "Mia_builds", twitchName: "twitchgaming", whitelisted: true, role: "PLAYER" },
  { email: "tim@example.com", name: "TechnoTim", minecraftName: "TechnoTim", twitchName: "twitchpresents", whitelisted: false, role: "PLAYER" },
  { email: "kaya@example.com", name: "Kaya", minecraftName: null, twitchName: null, whitelisted: false, role: "PLAYER" },
];

const applications = [
  {
    email: "jonas@example.com",
    minecraftName: "Jonas_MC",
    message: "Bin über den Discord der Fachschaft hier gelandet. Will hauptsächlich am Zugnetz bauen.",
    status: "APPROVED",
    reviewer: "lorenz@example.com",
    reviewNote: "Kennen wir aus Season 3. Willkommen zurück!",
  },
  {
    email: "mia@example.com",
    minecraftName: "Mia_builds",
    message: "Ich baue gerne Städte und Bahnhöfe. Create kenne ich seit 0.5.",
    status: "APPROVED",
    reviewer: "lorenz@example.com",
    reviewNote: null,
  },
  {
    email: "tim@example.com",
    minecraftName: "TechnoTim",
    message: "Automatisiere gerne alles, was sich automatisieren lässt. Streame nebenbei auf Twitch.",
    status: "PENDING",
    reviewer: null,
    reviewNote: null,
  },
  {
    // Antrag direkt nach dem Login, Gamertag fehlt noch.
    email: "kaya@example.com",
    minecraftName: null,
    message: null,
    status: "PENDING",
    reviewer: null,
    reviewNote: null,
  },
];

const suggestions = [
  {
    author: "jonas@example.com",
    type: "MOD",
    title: "Create: Steam 'n' Rails hinzufügen",
    body: "Mehr Zug-Content: Bogies, Oberleitungen und Weichen-Varianten. Passt perfekt zu unserem Streckennetz und läuft stabil mit Create 6.",
    status: "PLANNED",
    voters: ["lorenz@example.com", "mia@example.com", "tim@example.com"],
  },
  {
    author: "mia@example.com",
    type: "BUG",
    title: "Bahnhof am Spawn: Zug bleibt am Signal hängen",
    body: "Seit dem letzten Umbau bleibt der Nordexpress am zweiten Signal vor dem Spawn-Bahnhof stehen, obwohl die Strecke frei ist. Reproduzierbar gegen 20 Uhr, wenn viele online sind.",
    status: "OPEN",
    voters: ["jonas@example.com", "lorenz@example.com"],
  },
  {
    author: "lorenz@example.com",
    type: "FEATURE",
    title: "Gemeinsames Shop-Viertel am Hauptbahnhof",
    body: "Ein Viertel mit einheitlichen Parzellen, in dem jeder einen Shop mit Numismatics-Automaten aufbauen kann. Vorschlag: 12×12 Parzellen, Anbindung direkt an Gleis 3.",
    status: "OPEN",
    voters: ["tim@example.com"],
  },
  {
    author: "tim@example.com",
    type: "MOD",
    title: "Create Enchantment Industry",
    body: "Verzauberungen automatisieren – Erfahrungs-Flüssigkeit in Tanks lagern und Bücher über Deployer verzaubern. Wäre ein guter Late-Game-Anreiz.",
    status: "OPEN",
    voters: [],
  },
];

async function main() {
  const userByEmail = new Map<string, string>();

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, minecraftName: u.minecraftName, twitchName: u.twitchName, whitelisted: u.whitelisted, role: u.role },
      create: u,
    });
    userByEmail.set(u.email, user.id);
  }

  for (const a of applications) {
    const userId = userByEmail.get(a.email)!;
    const existing = await prisma.whitelistApplication.findFirst({ where: { userId } });
    if (existing) continue;

    await prisma.whitelistApplication.create({
      data: {
        userId,
        minecraftName: a.minecraftName,
        message: a.message,
        status: a.status,
        reviewNote: a.reviewNote,
        reviewerId: a.reviewer ? userByEmail.get(a.reviewer) : null,
        reviewedAt: a.reviewer ? new Date() : null,
      },
    });
  }

  for (const s of suggestions) {
    const authorId = userByEmail.get(s.author)!;
    // Idempotent über Titel + Autor
    const existing = await prisma.suggestion.findFirst({ where: { title: s.title, authorId } });
    const suggestion =
      existing ??
      (await prisma.suggestion.create({
        data: { title: s.title, body: s.body, type: s.type, status: s.status, authorId },
      }));

    for (const voterEmail of s.voters) {
      const userId = userByEmail.get(voterEmail)!;
      await prisma.vote.upsert({
        where: { userId_suggestionId: { userId, suggestionId: suggestion.id } },
        update: {},
        create: { userId, suggestionId: suggestion.id },
      });
    }
  }

  console.log(
    `Seed abgeschlossen: ${users.length} User, ${applications.length} Whitelist-Anträge, ${suggestions.length} Vorschläge.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
