import "server-only";
import { auth } from "@/auth";
import { discordCheckEnabled, ensureMembershipFresh } from "@/lib/discord";
import { prisma } from "@/lib/prisma";
import { naechsterSchritt, type SchrittBeschreibung } from "@/lib/whitelist-steps";

/**
 * Der nächste offene Schritt der angemeldeten Person – oder `null`.
 *
 * Damit blendet die Startseite einen kurzen Hinweis ein, statt darauf zu
 * hoffen, dass jemand von selbst ins Dashboard schaut. Die Bedingungen kommen
 * aus lib/whitelist-steps, es steht hier also nichts, was der Checkliste im
 * Dashboard widersprechen könnte.
 */
export async function offenerSchritt(): Promise<SchrittBeschreibung | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      minecraftName: true,
      discordJoined: true,
      discordCheckedAt: true,
      modpackDownloadedAt: true,
      applications: { select: { minecraftName: true }, take: 1, orderBy: { createdAt: "desc" } },
    },
  });
  if (!user) return null;

  // Mit Bot-Token kostet das eine Abfrage pro Minute und Person; ohne wird nur
  // der gespeicherte Stand gelesen. So zeigt der Hinweis nicht noch tagelang
  // „tritt dem Discord bei", wenn das laengst passiert ist.
  const discord = await ensureMembershipFresh(user);

  return naechsterSchritt({
    gamertagDa: Boolean(user.applications[0]?.minecraftName ?? user.minecraftName),
    discordJoined: discord.joined,
    discordCheckable: discordCheckEnabled,
    modpackGeladen: user.modpackDownloadedAt !== null,
  });
}
