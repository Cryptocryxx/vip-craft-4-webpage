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

/** Ohne diese Erlaubnis lässt sich die Mitgliedschaft nicht abfragen (siehe auth.ts). */
const NOETIGER_SCOPE = "guilds.members.read";

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

/**
 * Ergebnis einer Nachprüfung. `neu-anmelden` ist der Sonderfall, der sich sonst
 * als ewiges „unklar" tarnt: Der gespeicherte Token stammt aus einer Anmeldung,
 * bei der es den nötigen Scope noch nicht gab. Da hilft nur ein neuer Login –
 * und das muss man den Leuten auch sagen können.
 */
export type Mitgliedspruefung =
  | { status: "mitglied" }
  | { status: "nicht-mitglied" }
  | { status: "neu-anmelden" }
  | { status: "unklar" };

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
  scope: string | null;
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

/**
 * Warum ein Token nicht taugt – das macht einen Unterschied für die Meldung im
 * Dashboard.
 */
type Zugang = { ok: true; token: string } | { ok: false; grund: "kein-token" | "scope-fehlt" };

/** Holt ein brauchbares Access-Token aus der Datenbank, erneuert es bei Bedarf. */
async function usableAccessToken(userId: string): Promise<Zugang> {
  let account: DiscordAccount | null;
  try {
    account = await prisma.account.findFirst({
      where: { userId, provider: "discord" },
      select: { access_token: true, refresh_token: true, expires_at: true, scope: true },
    });
  } catch (error) {
    console.error("[discord] Account nicht lesbar:", error);
    return { ok: false, grund: "kein-token" };
  }

  if (!account) return { ok: false, grund: "kein-token" };

  /*
   * Stammt der Token aus einer Anmeldung von vor der Scope-Erweiterung, kennt
   * er guilds.members.read nicht. Discord antwortet dann mit 401 – und daran
   * aendert auch eine Token-Erneuerung nichts, denn die behaelt die urspruenglich
   * erteilten Rechte. Der einzige Weg ist eine neue Anmeldung. Also fragen wir
   * gar nicht erst und sagen stattdessen Bescheid.
   */
  if (!account.scope?.split(/\s+/).includes(NOETIGER_SCOPE)) {
    return { ok: false, grund: "scope-fehlt" };
  }

  const abgelaufen = account.expires_at !== null && account.expires_at * 1000 <= Date.now();
  if (abgelaufen) {
    const frisch = account.refresh_token ? await refreshAccessToken(userId, account.refresh_token) : null;
    return frisch ? { ok: true, token: frisch } : { ok: false, grund: "kein-token" };
  }

  return account.access_token ? { ok: true, token: account.access_token } : { ok: false, grund: "kein-token" };
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
 * Wie lange ein „noch nicht drin" reicht, bevor beim nächsten Dashboard-Aufruf
 * erneut bei Discord nachgefragt wird. Verhindert, dass schnelles Neuladen
 * jedes Mal eine Anfrage auslöst.
 */
const NACHFRAGE_ABSTAND_MS = 60_000;

/**
 * Letzter Versuch je Nutzer – auch der erfolglose. `discordCheckedAt` allein
 * genügt nicht: Bleibt das Ergebnis unklar (Token abgelaufen, Discord streikt),
 * wird dort nichts vermerkt, und jeder Seitenaufruf liefe erneut ins Leere.
 */
const letzterVersuch = new Map<string, number>();

/**
 * Hält den Mitgliedsstatus beim Aufruf des Dashboards von selbst aktuell –
 * ohne dass jemand auf „Erneut prüfen" drücken muss.
 *
 * Nachgefragt wird nur, solange jemand noch nicht als Mitglied bekannt ist.
 * Wer einmal beigetreten ist, bleibt hier abgehakt: Für den Whitelist-Antrag
 * zählt der Beitritt, und ein späterer Austritt ist ein Fall fürs Team, nicht
 * für eine Discord-Anfrage bei jedem Seitenaufruf.
 */
export async function ensureMembershipFresh(user: {
  id: string;
  discordJoined: boolean;
  discordCheckedAt: Date | null;
}): Promise<{ joined: boolean; neuAnmelden: boolean }> {
  if (!discordCheckEnabled || user.discordJoined) return { joined: user.discordJoined, neuAnmelden: false };

  // Bewusst vor der Zeitsperre: Das ist nur ein Datenbankzugriff, und ob die
  // Erlaubnis fehlt, soll bei jedem Aufruf sichtbar sein – nicht nur einmal
  // pro Minute.
  const zugang = await usableAccessToken(user.id);
  if (!zugang.ok) return { joined: false, neuAnmelden: zugang.grund === "scope-fehlt" };

  const zuletzt = Math.max(user.discordCheckedAt?.getTime() ?? 0, letzterVersuch.get(user.id) ?? 0);
  if (Date.now() - zuletzt < NACHFRAGE_ABSTAND_MS) return { joined: user.discordJoined, neuAnmelden: false };

  letzterVersuch.set(user.id, Date.now());
  const joined = await checkGuildMembership(zugang.token);
  if (joined !== null) await speichern(user.id, joined);

  return { joined: joined ?? user.discordJoined, neuAnmelden: false };
}

/**
 * Prüft auf Zuruf nach – etwa wenn jemand im Dashboard auf „Erneut prüfen"
 * klickt, nachdem er dem Discord beigetreten ist.
 */
export async function refreshMembership(userId: string): Promise<Mitgliedspruefung> {
  if (!discordCheckEnabled) return { status: "unklar" };

  const zugang = await usableAccessToken(userId);
  if (!zugang.ok) return { status: zugang.grund === "scope-fehlt" ? "neu-anmelden" : "unklar" };

  const joined = await checkGuildMembership(zugang.token);
  if (joined !== null) await speichern(userId, joined);

  if (joined === true) return { status: "mitglied" };
  if (joined === false) return { status: "nicht-mitglied" };
  return { status: "unklar" };
}
