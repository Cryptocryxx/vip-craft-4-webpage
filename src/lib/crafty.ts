import { unstable_rethrow } from "next/navigation";
import "server-only";

/**
 * Anbindung an den Crafty Controller (API v2).
 *
 * Einrichtung: In Crafty einen eigenen Benutzer mit einer Rolle anlegen, die nur
 * FILES (Statistiken lesen) und COMMANDS (Whitelist-Befehle) auf genau diesem
 * Server hat – nicht als Superuser. Unter Profil → API Keys einen Token erzeugen
 * und in die .env eintragen.
 *
 * ▸ Die Datei-Endpunkte (`/files`) stehen NICHT in der offiziellen OpenAPI-Spezifikation,
 *   existieren aber seit Crafty 4. Sie können sich zwischen Versionen ändern.
 *   Mit `npm run crafty:check` lässt sich gegen die eigene Instanz prüfen, ob alles passt.
 * ▸ `/stdin` verlangt laut Spezifikation die COMMANDS-Berechtigung und erwartet den
 *   Befehl OHNE führenden Schrägstrich.
 */

const TIMEOUT_MS = 15_000;

export const craftyConfig = {
  url: (process.env.CRAFTY_URL ?? "").replace(/\/+$/, ""),
  token: process.env.CRAFTY_TOKEN ?? "",
  serverId: process.env.CRAFTY_SERVER_ID ?? "",
};

export const craftyConfigured = Boolean(craftyConfig.url && craftyConfig.token && craftyConfig.serverId);

// Crafty liefert standardmäßig ein selbstsigniertes Zertifikat aus. Sauber ist
// NODE_EXTRA_CA_CERTS mit dem Zertifikat; als Notausgang gibt es dieses Flag.
if (process.env.CRAFTY_ALLOW_INSECURE_TLS === "true" && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.warn(
    "[crafty] CRAFTY_ALLOW_INSECURE_TLS=true: TLS-Zertifikate werden prozessweit NICHT mehr geprüft. " +
      "Besser wäre NODE_EXTRA_CA_CERTS mit dem Crafty-Zertifikat.",
  );
}

export class CraftyError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "CraftyError";
  }
}

type CraftyEnvelope<T> = {
  status?: string;
  data?: T;
  error?: string;
  error_data?: string;
};

async function craftyRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  contentType: "json" | "text" = "json",
): Promise<T> {
  if (!craftyConfigured) {
    throw new CraftyError("Crafty ist nicht konfiguriert (CRAFTY_URL, CRAFTY_TOKEN, CRAFTY_SERVER_ID).");
  }

  const url = `${craftyConfig.url}/api/v2${path}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${craftyConfig.token}` };
  let payload: string | undefined;

  if (body !== undefined) {
    if (contentType === "text") {
      headers["Content-Type"] = "text/plain";
      payload = String(body);
    } else {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, { method, headers, body: payload, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    // Next.js signalisiert dynamisches Rendern über geworfene Fehler – die dürfen wir nicht schlucken.
    unstable_rethrow(error);
    const reason = error instanceof Error ? error.message : String(error);
    throw new CraftyError(`Verbindung zu Crafty fehlgeschlagen: ${reason}`);
  }

  const text = await response.text();
  let json: CraftyEnvelope<T> | null = null;
  try {
    json = text ? (JSON.parse(text) as CraftyEnvelope<T>) : null;
  } catch {
    // Keine JSON-Antwort – etwa eine HTML-Fehlerseite des Reverse Proxy.
  }

  if (!response.ok || json?.status === "error") {
    const code = json?.error ?? `HTTP_${response.status}`;
    const detail = json?.error_data ? ` (${json.error_data})` : "";
    throw new CraftyError(`Crafty ${method} ${path}: ${code}${detail}`, response.status, json?.error);
  }

  return (json?.data ?? null) as T;
}

// ---------------------------------------------------------------------------
// Dateien
// ---------------------------------------------------------------------------

export type CraftyDirectoryEntry = {
  name: string;
  path?: string;
  /** Crafty markiert Verzeichnisse je nach Version unterschiedlich. */
  dir?: boolean;
  type?: string;
  size?: number;
};

/** Verzeichnis auflisten. `path` ist relativ zum Serververzeichnis. */
export async function craftyListDirectory(path: string): Promise<CraftyDirectoryEntry[]> {
  const data = await craftyRequest<unknown>("POST", `/servers/${craftyConfig.serverId}/files`, { path });
  return normaliseDirectory(data);
}

/**
 * Crafty liefert ein Objekt, dessen Schlüssel die Einträge sind:
 *
 *   { "root_path": {…}, "world": { "path": "world", "dir": true, … }, … }
 *
 * `root_path` beschreibt das Verzeichnis selbst und ist kein Eintrag.
 * Ältere Fassungen gaben ein Array zurück – das fangen wir mit ab.
 */
function normaliseDirectory(data: unknown): CraftyDirectoryEntry[] {
  if (Array.isArray(data)) return data as CraftyDirectoryEntry[];
  if (!data || typeof data !== "object") return [];

  const entries: CraftyDirectoryEntry[] = [];
  for (const [name, value] of Object.entries(data as Record<string, unknown>)) {
    if (name === "root_path" || !value || typeof value !== "object") continue;
    const item = value as { path?: string; dir?: boolean; size?: number };
    entries.push({ name, path: item.path, dir: Boolean(item.dir), size: item.size });
  }
  return entries;
}

/** Datei-Inhalt als Text lesen. Derselbe Endpunkt wie beim Auflisten. */
export async function craftyReadFile(path: string): Promise<string> {
  const data = await craftyRequest<unknown>("POST", `/servers/${craftyConfig.serverId}/files`, { path });

  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["contents", "content", "text", "data"]) {
      if (typeof obj[key] === "string") return obj[key] as string;
    }
  }
  throw new CraftyError(`Unerwartetes Antwortformat beim Lesen von ${path}.`);
}

/** Datei als JSON lesen. Gibt null zurück, wenn sie fehlt oder unlesbar ist. */
export async function craftyReadJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await craftyReadFile(path)) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Konsole
// ---------------------------------------------------------------------------

/**
 * Schickt einen Befehl an die Server-Konsole (ohne führenden Schrägstrich).
 * Braucht die COMMANDS-Berechtigung.
 */
export async function craftySendCommand(command: string): Promise<void> {
  const clean = command.trim().replace(/^\//, "");
  if (!clean) throw new CraftyError("Leerer Befehl.");
  if (/[\r\n]/.test(clean)) throw new CraftyError("Befehle dürfen keine Zeilenumbrüche enthalten.");

  await craftyRequest<unknown>("POST", `/servers/${craftyConfig.serverId}/stdin`, clean, "text");
}

// ---------------------------------------------------------------------------
// Diagnose
// ---------------------------------------------------------------------------

export type CraftyServerSummary = { server_id?: string; server_name?: string; server_uuid?: string };

export async function craftyListServers(): Promise<CraftyServerSummary[]> {
  const data = await craftyRequest<CraftyServerSummary[]>("GET", "/servers");
  return Array.isArray(data) ? data : [];
}

export async function craftyServerStats(): Promise<Record<string, unknown> | null> {
  return craftyRequest<Record<string, unknown>>("GET", `/servers/${craftyConfig.serverId}/stats`);
}
