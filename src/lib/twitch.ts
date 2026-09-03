import { unstable_rethrow } from "next/navigation";
import "server-only";

/**
 * Anbindung an die offizielle Twitch-API (Helix).
 *
 * Verwendet ein App Access Token (Client-Credentials-Flow). Damit lassen sich
 * öffentliche Daten abfragen – Live-Status, Titel, Zuschauerzahl, Profilbild.
 * Ein Login der Spielerinnen und Spieler bei Twitch ist dafür nicht nötig.
 *
 * Einrichtung: https://dev.twitch.tv/console/apps → Anwendung registrieren →
 * TWITCH_CLIENT_ID und TWITCH_CLIENT_SECRET in die .env eintragen.
 *
 * Die Abfrage läuft ausschließlich serverseitig; die IP-Adresse der Besucher
 * wird dabei nicht an Twitch übermittelt.
 */

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const HELIX = "https://api.twitch.tv/helix";

/** Live-Status wird so lange zwischengespeichert (Twitch aktualisiert ohnehin nur grob minütlich). */
const CACHE_TTL_MS = 60_000;
/** Twitch erlaubt maximal 100 Logins pro Anfrage. */
const MAX_LOGINS_PER_REQUEST = 100;

export const twitchConfigured = Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);

export type TwitchChannelInfo = {
  login: string;
  displayName: string | null;
  profileImageUrl: string | null;
  live: boolean;
  viewers: number;
  title: string | null;
  gameName: string | null;
  startedAt: string | null;
};

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

async function fetchAppToken(force = false): Promise<string | null> {
  if (!twitchConfigured) return null;
  if (!force && tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;

  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID!,
    client_secret: process.env.TWITCH_CLIENT_SECRET!,
    grant_type: "client_credentials",
  });

  try {
    const res = await fetch(`${TOKEN_URL}?${params.toString()}`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[twitch] Token konnte nicht geholt werden: HTTP ${res.status}`);
      return null;
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    // Eine Minute Sicherheitsabstand vor dem Ablauf.
    tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
    return tokenCache.token;
  } catch (error) {
    unstable_rethrow(error);
    // Netzwerkfehler oder Zeitüberschreitung dürfen die Seite nicht abstürzen lassen.
    console.error("[twitch] Token-Anfrage fehlgeschlagen:", error);
    return null;
  }
}

async function helix<T>(path: string, search: URLSearchParams): Promise<T | null> {
  let token = await fetchAppToken();
  if (!token) return null;

  const call = (bearer: string) =>
    fetch(`${HELIX}${path}?${search.toString()}`, {
      headers: { "Client-Id": process.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${bearer}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

  try {
    let res = await call(token);

    // Abgelaufenes Token: einmal mit frischem Token wiederholen.
    if (res.status === 401) {
      token = await fetchAppToken(true);
      if (!token) return null;
      res = await call(token);
    }

    if (!res.ok) {
      console.error(`[twitch] ${path} antwortete mit HTTP ${res.status}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (error) {
    unstable_rethrow(error);
    console.error(`[twitch] Anfrage an ${path} fehlgeschlagen:`, error);
    return null;
  }
}

type HelixStream = {
  user_login: string;
  user_name: string;
  game_name: string;
  title: string;
  viewer_count: number;
  started_at: string;
};

type HelixUser = {
  login: string;
  display_name: string;
  profile_image_url: string;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type ChannelCache = { data: Map<string, TwitchChannelInfo>; expiresAt: number; key: string };
let channelCache: ChannelCache | null = null;

/**
 * Fragt Live-Status und Profildaten für die übergebenen Kanäle ab.
 * Ohne konfigurierte Zugangsdaten wird eine leere Map zurückgegeben – die
 * Kanäle werden dann ohne Live-Status angezeigt.
 */
export async function getTwitchChannels(logins: string[]): Promise<Map<string, TwitchChannelInfo>> {
  const normalised = [...new Set(logins.map((l) => l.trim().toLowerCase()).filter(Boolean))].sort();
  if (normalised.length === 0 || !twitchConfigured) return new Map();

  const cacheKey = normalised.join(",");
  if (channelCache && channelCache.key === cacheKey && channelCache.expiresAt > Date.now()) {
    return channelCache.data;
  }

  const result = new Map<string, TwitchChannelInfo>();
  for (const login of normalised) {
    result.set(login, {
      login,
      displayName: null,
      profileImageUrl: null,
      live: false,
      viewers: 0,
      title: null,
      gameName: null,
      startedAt: null,
    });
  }

  for (const batch of chunk(normalised, MAX_LOGINS_PER_REQUEST)) {
    const search = new URLSearchParams();
    for (const login of batch) search.append("login", login);

    const users = await helix<{ data: HelixUser[] }>("/users", search);
    for (const user of users?.data ?? []) {
      const entry = result.get(user.login.toLowerCase());
      if (entry) {
        entry.displayName = user.display_name;
        entry.profileImageUrl = user.profile_image_url;
      }
    }

    const streamSearch = new URLSearchParams();
    for (const login of batch) streamSearch.append("user_login", login);

    const streams = await helix<{ data: HelixStream[] }>("/streams", streamSearch);
    for (const stream of streams?.data ?? []) {
      const entry = result.get(stream.user_login.toLowerCase());
      if (entry) {
        entry.live = true;
        entry.viewers = stream.viewer_count;
        entry.title = stream.title;
        entry.gameName = stream.game_name;
        entry.startedAt = stream.started_at;
        if (!entry.displayName) entry.displayName = stream.user_name;
      }
    }
  }

  channelCache = { data: result, expiresAt: Date.now() + CACHE_TTL_MS, key: cacheKey };
  return result;
}
