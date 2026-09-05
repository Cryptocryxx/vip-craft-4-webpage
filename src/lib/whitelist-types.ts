/**
 * Typen, Konstanten und Validierung für Whitelist-Anträge.
 * Bewusst ohne Datenbank-Import, damit Client-Komponenten sie nutzen können.
 */
export const APPLICATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/**
 * Beschriftungen kommen aus den Übersetzungen, Namespace "ApplicationStatuses"
 * (`useTranslations`/`getTranslations`) – die Schlüssel entsprechen den Werten
 * von APPLICATION_STATUSES.
 */

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

/** `t` ist der Übersetzer für den Namespace "Validation". */
export type ValidationTranslator = (key: string) => string;

export function validateApplicationInput(
  raw: {
    minecraftName?: unknown;
    message?: unknown;
  },
  t: ValidationTranslator,
): { ok: true; data: ApplicationInput } | { ok: false; error: string } {
  const minecraftName = typeof raw.minecraftName === "string" ? raw.minecraftName.trim() : "";
  const messageRaw = typeof raw.message === "string" ? raw.message.trim() : "";

  if (!GAMERTAG_RE.test(minecraftName)) {
    return { ok: false, error: t("minecraftNamePattern") };
  }
  // Pflichtfeld: Wer niemanden auf dem Server kennt, soll das trotzdem kurz
  // dazuschreiben (z. B. "niemanden, kam über Discord") - leer soll es aber
  // nicht bleiben, sonst laesst sich der Antrag nicht einordnen.
  if (messageRaw.length === 0) {
    return { ok: false, error: t("messageRequired") };
  }
  if (messageRaw.length > 1000) {
    return { ok: false, error: t("messageTooLong") };
  }

  return { ok: true, data: { minecraftName, message: messageRaw } };
}
