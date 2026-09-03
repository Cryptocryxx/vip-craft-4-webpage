import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Prüft, ob jemand im Discord-Server ist.
 *
 * Genutzt wird der OAuth-Scope `guilds.members.read`. Der erlaubt genau eine
 * Sache: die Mitgliedschaft des angemeldeten Nutzers in EINEM bestimmten Server
 * abzufragen. Bewusst nicht `guilds` – der wuerde die vollstaendige Liste aller
 * Server liefern, in denen jemand ist. Fuer eine Ja/Nein-Frage ist das zu viel.
 *
 * Ohne DISCORD_GUILD_ID ist die Pruefung abgeschaltet und niemand wird
 * ausgebremst (siehe `discordCheckEnabled`).
 */

const API = "https://discord.com/api/v10";

export const discordGuildId = process.env.DISCORD_GUILD_ID ?? "";

/** Nur wenn Server-ID und OAuth-App konfiguriert sind, wird überhaupt geprüft. */
export const discordCheckEnabled = Boolean(
  discordGuildId && process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET,
);

/**
 * `null` heißt „konnte nicht geklärt werden" – etwa weil Discord nicht
 * antwortet oder das Token abgelaufen ist. Das ist ausdrücklich etwas anderes
 * als `false` („nicht im Server"), damit ein Aussetzer niemandem den Antrag
 * blockiert.
 */
export type MembershipResult = boolean | null;

/** Fragt Discord direkt mit einem gültigen Access-Token. */
export async function checkGuildMembership(accessToken: string): Promise<MembershipResult> {
  if (!discordCheckEnabled) return null;

  let response: Response;
  try {
    response = await fetch(`${API}/users/@me/guilds/${discordGuildId}/member`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("[discord] Mitgliedschaft nicht abfragbar:", error);
    return null;
  }

  // 200 = Mitglied, 404 = nicht im Server. Alles andere (401, 429, 5xx) ist
  // eine Stoerung und keine Aussage ueber die Mitgliedschaft.
  if (response.status === 200) return true;
  if (response.status === 404) return false;

  console.error(`[discord] Unerwartete Antwort ${response.status} bei der Mitgliedschaftsabfrage.`);
  return null;
}

// ---------------------------------------------------------------------------
// Token-Verwaltung
// ---------------------------------------------------------------------------

type DiscordAccount = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
};

/** Discord-Tokens laufen nach sieben Tagen ab – dann mit dem Refresh-Token erneuern. */
async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch(`${API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_DISCORD_ID ?? "",
        client_secret: process.env.AUTH_DISCORD_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error(`[discord] Token-Erneuerung fehlgeschlagen (HTTP ${response.status}).`);
      return null;
    }

    const data = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!data.access_token) return null;

    await prisma.account.updateMany({
      where: { userId, provider: "discord" },
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? refreshToken,
        expires_at: data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : null,
      },
    });

    return data.access_token;
  } catch (error) {
    console.error("[discord] Token-Erneuerung fehlgeschlagen:", error);
    return null;
  }
}

/** Holt ein brauchbares Access-Token aus der Datenbank, erneuert es bei Bedarf. */
async function usableAccessToken(userId: string): Promise<string | null> {
  let account: DiscordAccount | null;
  try {
    account = await prisma.account.findFirst({
      where: { userId, provider: "discord" },
      select: { access_token: true, refresh_token: true, expires_at: true },
    });
  } catch (error) {
    console.error("[discord] Account nicht lesbar:", error);
    return null;
  }

  if (!account) return null;

  const abgelaufen = account.expires_at !== null && account.expires_at * 1000 <= Date.now();
  if (abgelaufen) {
    return account.refresh_token ? refreshAccessToken(userId, account.refresh_token) : null;
  }

  return account.access_token;
}

// ---------------------------------------------------------------------------
// Ergebnis speichern
// ---------------------------------------------------------------------------

async function speichern(userId: string, joined: boolean): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { discordJoined: joined, discordCheckedAt: new Date() },
    });
  } catch (error) {
    console.error("[discord] Mitgliedschaft konnte nicht gespeichert werden:", error);
  }
}

/**
 * Prüft mit einem frisch aus dem Login stammenden Token und merkt sich das
 * Ergebnis. Wird im signIn-Event aufgerufen.
 */
export async function recordMembershipFromLogin(userId: string, accessToken: string): Promise<MembershipResult> {
  const joined = await checkGuildMembership(accessToken);
  if (joined !== null) await speichern(userId, joined);
  return joined;
}

/**
 * Prüft auf Zuruf nach – etwa wenn jemand im Dashboard auf „Erneut prüfen"
 * klickt, nachdem er dem Discord beigetreten ist.
 */
export async function refreshMembership(userId: string): Promise<MembershipResult> {
  if (!discordCheckEnabled) return null;

  const token = await usableAccessToken(userId);
  if (!token) return null;

  const joined = await checkGuildMembership(token);
  if (joined !== null) await speichern(userId, joined);
  return joined;
}
