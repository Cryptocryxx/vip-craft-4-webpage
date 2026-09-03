/**
 * Typen, Konstanten und Validierung für Whitelist-Anträge.
 * Bewusst ohne Datenbank-Import, damit Client-Komponenten sie nutzen können.
 */
export const APPLICATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  PENDING: "In Prüfung",
  APPROVED: "Angenommen",
  REJECTED: "Abgelehnt",
};

export type ApplicantSummary = {
  id: string;
  name: string | null;
  image: string | null;
  email: string | null;
  minecraftName: string | null;
  whitelisted: boolean;
  role: string;
  /** Im Discord-Server? Siehe lib/discord.ts */
  discordJoined: boolean;
};

export type WhitelistApplicationDTO = {
  id: string;
  status: ApplicationStatus;
  minecraftName: string | null;
  message: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  applicant: ApplicantSummary;
  reviewer: { id: string; name: string | null } | null;
};

export function toApplicationStatus(value: string): ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value) ? (value as ApplicationStatus) : "PENDING";
}

/** Minecraft-Namen: 3–16 Zeichen, Buchstaben, Zahlen, Unterstrich. */
export const GAMERTAG_RE = /^[A-Za-z0-9_]{3,16}$/;

export type ApplicationInput = { minecraftName: string; message: string | null };

export function validateApplicationInput(raw: {
  minecraftName?: unknown;
  message?: unknown;
}): { ok: true; data: ApplicationInput } | { ok: false; error: string } {
  const minecraftName = typeof raw.minecraftName === "string" ? raw.minecraftName.trim() : "";
  const messageRaw = typeof raw.message === "string" ? raw.message.trim() : "";

  if (!GAMERTAG_RE.test(minecraftName)) {
    return { ok: false, error: "Ein Minecraft-Name hat 3–16 Zeichen (Buchstaben, Zahlen, Unterstrich)." };
  }
  if (messageRaw.length > 1000) {
    return { ok: false, error: "Die Nachricht darf höchstens 1000 Zeichen haben." };
  }

  return { ok: true, data: { minecraftName, message: messageRaw.length > 0 ? messageRaw : null } };
}
