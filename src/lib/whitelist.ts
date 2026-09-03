import "server-only";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import {
  toApplicationStatus,
  type ApplicationInput,
  type ApplicationStatus,
  type WhitelistApplicationDTO,
} from "@/lib/whitelist-types";

export * from "@/lib/whitelist-types";

const applicantSelect = {
  id: true,
  name: true,
  image: true,
  email: true,
  minecraftName: true,
  whitelisted: true,
  role: true,
  discordJoined: true,
} as const;

type ApplicationRow = {
  id: string;
  status: string;
  minecraftName: string | null;
  message: string | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    email: string | null;
    minecraftName: string | null;
    whitelisted: boolean;
    role: string;
    discordJoined: boolean;
  };
  reviewer: { id: string; name: string | null } | null;
};

function toDTO(row: ApplicationRow): WhitelistApplicationDTO {
  return {
    id: row.id,
    status: toApplicationStatus(row.status),
    minecraftName: row.minecraftName,
    message: row.message,
    reviewNote: row.reviewNote,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    applicant: row.user,
    reviewer: row.reviewer,
  };
}

const includeRelations = {
  user: { select: applicantSelect },
  reviewer: { select: { id: true, name: true } },
} as const;

/** Der aktuellste Antrag eines Users (oder null). */
export async function getApplicationForUser(userId: string): Promise<WhitelistApplicationDTO | null> {
  const row = await prisma.whitelistApplication.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: includeRelations,
  });
  return row ? toDTO(row) : null;
}

export async function listApplications(status?: ApplicationStatus): Promise<WhitelistApplicationDTO[]> {
  const rows = await prisma.whitelistApplication.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: includeRelations,
  });
  return rows.map(toDTO);
}

export async function countPendingApplications(): Promise<number> {
  return prisma.whitelistApplication.count({ where: { status: "PENDING" } });
}

/**
 * Legt beim Login automatisch einen Antrag an – aber nur, wenn der User noch
 * keinen hat und noch nicht gewhitelisted ist.
 */
export async function ensureWhitelistApplication(user: {
  id: string;
  whitelisted: boolean;
  minecraftName: string | null;
}): Promise<void> {
  if (user.whitelisted) return;

  const settings = await getSiteSettings();
  if (!settings.whitelistOpen) return;

  const existing = await prisma.whitelistApplication.findFirst({ where: { userId: user.id } });
  if (existing) return;

  await prisma.whitelistApplication.create({
    data: { userId: user.id, minecraftName: user.minecraftName, status: "PENDING" },
  });
}

/** Erster Login ohne vorhandenen Admin (oder Discord-ID aus ADMIN_DISCORD_IDS) macht zum Admin. */
async function ensureAdminBootstrap(user: {
  id: string;
  role: string;
  accounts: Array<{ providerAccountId: string }>;
}): Promise<boolean> {
  if (user.role === "ADMIN") return true;

  const allowlist = (process.env.ADMIN_DISCORD_IDS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const discordId = user.accounts[0]?.providerAccountId;
  const onAllowlist = Boolean(discordId && allowlist.includes(discordId));
  const isFirstEver = allowlist.length === 0 && (await prisma.user.count({ where: { role: "ADMIN" } })) === 0;

  if (!onAllowlist && !isFirstEver) return false;

  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN", whitelisted: true } });
  return true;
}

/** Wird vom Auth.js `signIn`-Event aufgerufen. */
export async function onUserSignIn(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      whitelisted: true,
      minecraftName: true,
      accounts: { where: { provider: "discord" }, select: { providerAccountId: true } },
    },
  });
  if (!user) return;

  const promoted = await ensureAdminBootstrap(user);
  if (promoted) return; // Admins brauchen keinen Antrag.

  await ensureWhitelistApplication(user);
}

/** Antrag des Users anlegen bzw. aktualisieren (Gamertag + Nachricht). */
export async function upsertApplication(userId: string, input: ApplicationInput): Promise<void> {
  const current = await prisma.whitelistApplication.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  await prisma.$transaction(async (tx) => {
    // Gamertag am Profil mitpflegen, damit Stats und Skin-Kopf passen.
    await tx.user.update({ where: { id: userId }, data: { minecraftName: input.minecraftName } });

    if (current && current.status === "PENDING") {
      await tx.whitelistApplication.update({
        where: { id: current.id },
        data: { minecraftName: input.minecraftName, message: input.message },
      });
      return;
    }

    // Kein Antrag oder ein abgelehnter/angenommener: neuen anlegen.
    await tx.whitelistApplication.create({
      data: { userId, minecraftName: input.minecraftName, message: input.message, status: "PENDING" },
    });
  });
}

/** Antrag annehmen: User wird gewhitelisted, Gamertag wird übernommen. */
export async function approveApplication(applicationId: string, reviewerId: string, note: string | null): Promise<void> {
  const application = await prisma.whitelistApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, userId: true, minecraftName: true },
  });
  if (!application) throw new Error("Antrag nicht gefunden.");

  await prisma.$transaction(async (tx) => {
    await tx.whitelistApplication.update({
      where: { id: application.id },
      data: { status: "APPROVED", reviewerId, reviewedAt: new Date(), reviewNote: note },
    });
    await tx.user.update({
      where: { id: application.userId },
      data: {
        whitelisted: true,
        ...(application.minecraftName ? { minecraftName: application.minecraftName } : {}),
      },
    });
  });
}

/** Antrag ablehnen: Whitelist bleibt/wird entzogen. */
export async function rejectApplication(applicationId: string, reviewerId: string, note: string | null): Promise<void> {
  const application = await prisma.whitelistApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, userId: true },
  });
  if (!application) throw new Error("Antrag nicht gefunden.");

  await prisma.$transaction(async (tx) => {
    await tx.whitelistApplication.update({
      where: { id: application.id },
      data: { status: "REJECTED", reviewerId, reviewedAt: new Date(), reviewNote: note },
    });
    await tx.user.update({ where: { id: application.userId }, data: { whitelisted: false } });
  });
}

export async function deleteApplication(applicationId: string): Promise<void> {
  await prisma.whitelistApplication.delete({ where: { id: applicationId } });
}
