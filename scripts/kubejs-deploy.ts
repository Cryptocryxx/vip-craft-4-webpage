/**
 * Legt die KubeJS-Skripte aus minecraft/kubejs/server_scripts/ über die
 * Crafty-Dateiverwaltung auf dem Server ab.
 *
 *   npm run kubejs:deploy                 alle Skripte hochladen
 *   npm run kubejs:deploy -- insights     nur die, deren Name das enthält
 *
 * Danach muss der Server neu starten: server_scripts werden nur beim Start
 * geladen, und „kubejs reload server_scripts" scheitert auf diesem Server mit
 * einem Parse-Fehler (siehe numismatics-export.js).
 *
 * Eigene fetch-Aufrufe statt lib/crafty.ts, weil das Modul "server-only"
 * importiert und ausserhalb von Next.js gar nicht erst lädt – genauso wie in
 * scripts/crafty-check.ts.
 *
 * Die benutzten Endpunkte stehen in keiner offiziellen Spezifikation, sind aber
 * gegen die eigene Instanz erprobt:
 *   PUT   /servers/{id}/files/create  { parent, name, directory:false }
 *   PATCH /servers/{id}/files         { path, contents, overwrite:true }
 */
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const url = (process.env.CRAFTY_URL ?? "").replace(/\/+$/, "");
const token = process.env.CRAFTY_TOKEN ?? "";
const serverId = process.env.CRAFTY_SERVER_ID ?? "";
const filter = process.argv[2] ?? "";

const QUELLE = "minecraft/kubejs/server_scripts";
const ZIEL = "kubejs/server_scripts";

if (process.env.CRAFTY_ALLOW_INSECURE_TLS === "true") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

if (!url || !token || !serverId) {
  console.error("CRAFTY_URL, CRAFTY_TOKEN und CRAFTY_SERVER_ID müssen in der .env stehen.");
  process.exit(1);
}

type Antwort = { status: number; body: unknown };

async function api(method: string, pfad: string, body: unknown): Promise<Antwort> {
  const res = await fetch(`${url}/api/v2${pfad}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text.slice(0, 200) };
  }
}

function fehlertext(antwort: Antwort): string {
  const b = antwort.body as { error?: string; error_data?: string } | string;
  if (typeof b === "string") return `HTTP ${antwort.status}: ${b}`;
  return `HTTP ${antwort.status}: ${b.error ?? "unbekannt"}${b.error_data ? ` (${b.error_data})` : ""}`;
}

async function lege(name: string, inhalt: string): Promise<void> {
  // Anlegen darf scheitern – beim Aktualisieren gibt es die Datei ja schon.
  const angelegt = await api("PUT", `/servers/${serverId}/files/create`, {
    parent: ZIEL,
    name,
    directory: false,
  });
  const existiert =
    typeof angelegt.body === "object" &&
    angelegt.body !== null &&
    /exist/i.test(String((angelegt.body as { error_data?: string }).error_data ?? ""));

  if (angelegt.status !== 200 && !existiert) {
    throw new Error(`Anlegen fehlgeschlagen: ${fehlertext(angelegt)}`);
  }

  const geschrieben = await api("PATCH", `/servers/${serverId}/files`, {
    path: `${ZIEL}/${name}`,
    contents: inhalt,
    overwrite: true,
  });
  if (geschrieben.status !== 200) {
    throw new Error(`Schreiben fehlgeschlagen: ${fehlertext(geschrieben)}`);
  }
}

async function main(): Promise<void> {
  const dateien = readdirSync(QUELLE)
    .filter((name) => name.endsWith(".js"))
    .filter((name) => !filter || name.includes(filter));

  if (dateien.length === 0) {
    console.log(`Nichts zu tun – keine passende .js-Datei in ${QUELLE}.`);
    return;
  }

  for (const name of dateien) {
    const inhalt = readFileSync(join(QUELLE, name), "utf8");
    try {
      await lege(name, inhalt);
      console.log(`[ok]   ${ZIEL}/${name} (${inhalt.length} Zeichen)`);
    } catch (error) {
      console.log(`[FEHL] ${name}: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }

  console.log("\nDamit die Skripte greifen, muss der Server neu starten.");
}

void main();
