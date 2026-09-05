import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { imTeam, istAdmin } from "@/lib/roles";

/**
 * Die Wachen für den Kontrollraum.
 *
 * Zwei Stufen, weil es zwei Rollen gibt (siehe lib/roles.ts):
 * `requireTeam()` für alles, was zur Moderation gehört, `requireAdmin()` für
 * das, was den Server oder die Rollen selbst betrifft. Jede Server-Action
 * entscheidet sich für eine davon – die Navigation auszublenden reicht nicht,
 * ein Formular lässt sich auch ohne Knopf abschicken.
 */

export type TeamUser = { id: string; name: string | null; image: string | null; role: string };
export type AdminUser = TeamUser;

async function angemeldeterBenutzer(): Promise<TeamUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, image: true, role: true },
  });

  return user ?? null;
}

/** Admin oder Moderator – oder null, wenn beides nicht zutrifft. */
export async function getTeamUser(): Promise<TeamUser | null> {
  const user = await angemeldeterBenutzer();
  return user && imTeam(user.role) ? user : null;
}

/** Für Server Actions: liefert das Team-Mitglied oder wirft. */
export async function requireTeam(): Promise<TeamUser> {
  const user = await getTeamUser();
  if (!user) throw new Error("Kein Zugriff auf den Kontrollraum.");
  return user;
}

/** Gibt den eingeloggten Admin zurück – oder null, wenn kein Admin-Zugriff besteht. */
export async function getAdminUser(): Promise<AdminUser | null> {
  const user = await angemeldeterBenutzer();
  return user && istAdmin(user.role) ? user : null;
}

export async function isAdmin(): Promise<boolean> {
  return (await getAdminUser()) !== null;
}

/** Für Server Actions: liefert den Admin oder wirft. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Kein Admin-Zugriff.");
  return admin;
}
