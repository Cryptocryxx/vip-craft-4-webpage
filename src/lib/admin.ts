import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AdminUser = { id: string; name: string | null; image: string | null; role: string };

/** Gibt den eingeloggten Admin zurück – oder null, wenn kein Admin-Zugriff besteht. */
export async function getAdminUser(): Promise<AdminUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, image: true, role: true },
  });

  return user?.role === "ADMIN" ? user : null;
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
