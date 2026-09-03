/**
 * Prüft die Crafty-Anbindung gegen die eigene Instanz, ohne die Website zu starten.
 *
 *   npm run crafty:check              nur lesende Prüfungen
 *   npm run crafty:check -- --command lesend + ein harmloser Testbefehl (whitelist list)
 *
 * Nötig, weil die Datei-Endpunkte von Crafty nicht offiziell dokumentiert sind
 * und sich zwischen Versionen unterscheiden können.
 */
import "dotenv/config";

const url = (process.env.CRAFTY_URL ?? "").replace(/\/+$/, "");
const token = process.env.CRAFTY_TOKEN ?? "";
const serverId = process.env.CRAFTY_SERVER_ID ?? "";
const worldDir = process.env.CRAFTY_WORLD_DIR ?? "world";
const withCommand = process.argv.includes("--command");

if (process.env.CRAFTY_ALLOW_INSECURE_TLS === "true") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.warn("⚠  TLS-Prüfung ist abgeschaltet (CRAFTY_ALLOW_INSECURE_TLS=true).\n");
}

const ok = (msg: string) => console.log(`[ok]   ${msg}`);
const fail = (msg: string) => console.log(`[FEHL] ${msg}`);
const info = (msg: string) => console.log(`       ${msg}`);

/** Crafty liefert Verzeichnisse als Objekt mit den Einträgen als Schlüssel. */
function entryNames(data: unknown): string[] {
  if (Array.isArray(data)) {
    return data.map((e) => (e as { name?: string })?.name).filter((n): n is string => typeof n === "string");
  }
  if (!data || typeof data !== "object") return [];
  return Object.keys(data as Record<string, unknown>).filter((k) => k !== "root_path");
}

/** Dateiinhalte stecken in `data.content`. */
function fileContent(data: unknown): string | null {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    for (const key of ["content", "contents", "text"]) {
      const value = (data as Record<string, unknown>)[key];
      if (typeof value === "string") return value;
    }
  }
  return null;
}

async function call(method: string, path: string, body?: unknown, asText = false) {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  let payload: string | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = asText ? "text/plain" : "application/json";
    payload = asText ? String(body) : JSON.stringify(body);
  }

  const res = await fetch(`${url}/api/v2${path}`, {
    method,
    headers,
    body: payload,
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* keine JSON-Antwort */
  }
  return { res, json, text };
}

async function main() {
  console.log("Crafty-Verbindungstest\n");

  if (!url || !token || !serverId) {
    fail("CRAFTY_URL, CRAFTY_TOKEN und CRAFTY_SERVER_ID müssen in der .env stehen.");
    process.exit(1);
  }
  info(`URL:       ${url}`);
  info(`Server-ID: ${serverId}`);
  info(`Weltordner: ${worldDir}\n`);

  // 1. Erreichbarkeit + Token
  try {
    const { res, json } = await call("GET", "/servers");
    if (!res.ok) {
      fail(`GET /servers → HTTP ${res.status}. Token oder URL stimmen nicht.`);
      process.exit(1);
    }
    const list = (json?.data ?? []) as Array<Record<string, unknown>>;
    ok(`Verbindung steht, Token gültig. ${list.length} Server sichtbar.`);
    for (const s of list) {
      const id = String(s.server_id ?? s.server_uuid ?? "?");
      const marker = id === serverId ? "  ← konfiguriert" : "";
      info(`- ${s.server_name ?? "ohne Namen"} (${id})${marker}`);
    }
    if (!list.some((s) => String(s.server_id ?? s.server_uuid ?? "") === serverId)) {
      fail("Die konfigurierte CRAFTY_SERVER_ID kommt in dieser Liste nicht vor.");
    }
  } catch (error) {
    fail(`Verbindung fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
    info("Bei Zertifikatsfehlern: NODE_EXTRA_CA_CERTS setzen oder CRAFTY_ALLOW_INSECURE_TLS=true.");
    process.exit(1);
  }

  // 2. Dateizugriff (FILES-Berechtigung)
  console.log("");
  try {
    const { res, json } = await call("POST", `/servers/${serverId}/files`, { path: `${worldDir}/stats` });
    if (!res.ok) {
      fail(`Verzeichnis lesen → HTTP ${res.status}. Fehlt die FILES-Berechtigung, oder heißt der Weltordner anders?`);
      info("Anderen Ordnernamen über CRAFTY_WORLD_DIR setzen, z. B. CRAFTY_WORLD_DIR=\"vipcraft\".");
    } else {
      const names = entryNames(json?.data).filter((n) => n.endsWith(".json"));
      if (names.length === 0) {
        fail(`Keine Statistikdateien in ${worldDir}/stats gefunden.`);
        info("Heißt der Weltordner anders? Dann CRAFTY_WORLD_DIR in der .env setzen.");
      } else {
        ok(`Dateizugriff funktioniert. ${names.length} Statistikdateien in ${worldDir}/stats.`);

        const read = await call("POST", `/servers/${serverId}/files`, { path: `${worldDir}/stats/${names[0]}` });
        const content = fileContent(read.json?.data);
        if (content) {
          const parsed = JSON.parse(content) as { stats?: Record<string, unknown> };
          const groups = Object.keys(parsed.stats ?? {});
          ok(`Beispieldatei gelesen. Enthaltene Gruppen: ${groups.join(", ") || "keine"}`);
        } else {
          fail("Dateiinhalt konnte nicht gelesen werden.");
        }
      }
    }
  } catch (error) {
    fail(`Dateizugriff fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 3. usercache.json (Zuordnung UUID → Name)
  console.log("");
  try {
    const { json } = await call("POST", `/servers/${serverId}/files`, { path: "usercache.json" });
    const raw = fileContent(json?.data);
    if (raw) {
      const parsed = JSON.parse(raw) as Array<{ name: string }>;
      ok(`usercache.json gelesen: ${parsed.length} bekannte Spielernamen.`);
    } else {
      fail("usercache.json konnte nicht gelesen werden – Namen bleiben dann UUIDs.");
    }
  } catch (error) {
    fail(`usercache.json: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 4. Konsolenbefehl (COMMANDS-Berechtigung) – nur auf ausdrücklichen Wunsch
  console.log("");
  if (!withCommand) {
    info("Konsolenbefehl nicht getestet. Mit `npm run crafty:check -- --command` wird `whitelist list` geschickt.");
  } else {
    try {
      const { res } = await call("POST", `/servers/${serverId}/stdin`, "whitelist list", true);
      if (res.ok) ok("Konsolenbefehl abgesetzt (whitelist list). Ergebnis steht in der Server-Konsole.");
      else fail(`Konsolenbefehl → HTTP ${res.status}. Fehlt die COMMANDS-Berechtigung?`);
    } catch (error) {
      fail(`Konsolenbefehl fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log("\nFertig.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
