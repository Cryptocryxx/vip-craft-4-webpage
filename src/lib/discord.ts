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

/**
 * Ergebnis einer Nachprüfung. `neu-anmelden` ist der Sonderfall, der sich sonst
 * als ewiges „unklar" tarnt: Der gespeicherte Token deckt die Frage nicht ab –
 * etwa weil er aus einer Anmeldung stammt, bei der es den nötigen Scope noch
 * nicht gab. Erneuern hilft dann nicht, denn eine Erneuerung behält die
 * ursprünglich erteilten Rechte. Nur ein neuer Login hilft, und das muss man
 * den Leuten auch sagen können.
 */
export type Mitgliedspruefung =
  | { status: "mitglied" }
  | { status: "nicht-mitglied" }
  | { status: "neu-anmelden" }
  | { status: "unklar" };

/**
 * Fragt Discord und übersetzt den HTTP-Status.
 *
 * 200 = Mitglied, 404 = nicht im Server, 401 = das Token darf die Frage nicht
 * stellen. Alles andere (429, 5xx) ist eine Störung und keine Aussage.
 */
async function frageDiscord(accessToken: string): Promise<Mitgliedspruefung["status"]> {
  let response: Response;
  try {
    response = await fetch(`${API}/users/@me/guilds/${discordGuildId}/member`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("[discord] Mitgliedschaft nicht abfragbar:", error);
    return "unklar";
  }

  if (response.status === 200) return "mitglied";
  if (response.status === 404) return "nicht-mitglied";
  if (response.status === 401) return "neu-anmelden";

  console.error(`[discord] Unerwartete Antwort ${response.status} bei der Mitgliedschaftsabfrage.`);
  return "unklar";
}

/** Fragt Discord direkt mit einem frischen Access-Token (nur beim Login). */
export async function checkGuildMembership(accessToken: string): Promise<MembershipResult> {
  if (!discordCheckEnabled) return null;

  const status = await frageDiscord(accessToken);
  if (status === "mitglied") return true;
  if (status === "nicht-mitglied") return false;
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

/**
 * Fragt die Mitgliedschaft mit dem gespeicherten Token ab.
 *
 * Bewusst NICHT anhand der Spalte `scope` entschieden: Auth.js legt die
 * Account-Zeile nur beim ersten Verknüpfen an, danach steht dort weiter, was
 * bei der allerersten Anmeldung galt (deshalb schreibt auth.ts sie inzwischen
 * bei jeder Anmeldung fort). Ein Wert, der nachweislich veralten kann, taugt
 * nicht als Entscheidungsgrundlage – also fragen wir Discord und lesen die
 * Antwort: 401 heißt „dieses Token darf das nicht".
 *
 * Vor der 401-Diagnose noch ein Erneuerungsversuch, denn ein abgelaufenes
 * Token sieht genauso aus. Erst wenn auch das frische Token abgelehnt wird,
 * steht fest: Es fehlt die Erlaubnis, und nur ein neuer Login hilft.
 */
async function pruefeMitToken(userId: string): Promise<Mitgliedspruefung["status"]> {
  let account: DiscordAccount | null;
  try {
    account = await prisma.account.findFirst({
      where: { userId, provider: "discord" },
      select: { access_token: true, refresh_token: true, expires_at: true },
    });
  } catch (error) {
    console.error("[discord] Account nicht lesbar:", error);
    return "unklar";
  }

  if (!account) return "unklar";

  const abgelaufen = account.expires_at !== null && account.expires_at * 1000 <= Date.now();
  let token = abgelaufen ? null : account.access_token;

  if (!token) {
    token = account.refresh_token ? await refreshAccessToken(userId, account.refresh_token) : null;
    if (!token) return "neu-anmelden";
  }

  const ergebnis = await frageDiscord(token);
  if (ergebnis !== "neu-anmelden" || !account.refresh_token) return ergebnis;

  const frisch = await refreshAccessToken(userId, account.refresh_token);
  return frisch ? frageDiscord(frisch) : "neu-anmelden";
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

/** Was dabei herauskam – damit der Hinweis auch während der Sperrfrist steht. */
const letzteAntwort = new Map<string, Mitgliedspruefung["status"]>();

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

  const zuletzt = Math.max(user.discordCheckedAt?.getTime() ?? 0, letzterVersuch.get(user.id) ?? 0);
  if (Date.now() - zuletzt < NACHFRAGE_ABSTAND_MS) {
    // Innerhalb der Sperrfrist keine neue Anfrage, aber das zuletzt Gesehene
    // weiterhin melden – sonst verschwände der Hinweis beim Neuladen.
    return { joined: user.discordJoined, neuAnmelden: letzteAntwort.get(user.id) === "neu-anmelden" };
  }

  letzterVersuch.set(user.id, Date.now());
  const status = await pruefeMitToken(user.id);
  letzteAntwort.set(user.id, status);

  if (status === "mitglied" || status === "nicht-mitglied") {
    await speichern(user.id, status === "mitglied");
  }

  return { joined: status === "mitglied", neuAnmelden: status === "neu-anmelden" };
}

/**
 * Prüft auf Zuruf nach – etwa wenn jemand im Dashboard auf „Erneut prüfen"
 * klickt, nachdem er dem Discord beigetreten ist.
 */
export async function refreshMembership(userId: string): Promise<Mitgliedspruefung> {
  if (!discordCheckEnabled) return { status: "unklar" };

  const status = await pruefeMitToken(userId);
  letzterVersuch.set(userId, Date.now());
  letzteAntwort.set(userId, status);

  if (status === "mitglied" || status === "nicht-mitglied") {
    await speichern(userId, status === "mitglied");
  }

  return { status };
}
