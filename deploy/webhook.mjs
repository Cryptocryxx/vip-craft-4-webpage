/**
 * Deploy-Webhook: nimmt GitHub-Push-Events entgegen und zieht das Projekt nach.
 *
 * Bewusst ein eigener Dienst neben der Website und keine Next.js-Route:
 * Nach einem kaputten Build waere die Website unten – und mit ihr das Werkzeug,
 * mit dem man den Fehler wieder ausbuegelt. Dieser Prozess laeuft unabhaengig
 * weiter und startet die Website neu, nicht sich selbst.
 *
 * Sicherheit:
 * ▸ Jede Anfrage muss die HMAC-Signatur von GitHub mitbringen (X-Hub-Signature-256),
 *   geprueft mit timingSafeEqual. Ohne gueltige Signatur passiert nichts.
 * ▸ Der Dienst lauscht nur auf 127.0.0.1. Von aussen erreichbar ist er allein
 *   ueber nginx, das TLS beisteuert.
 * ▸ Es gibt nichts zu parametrisieren: Die Schritte sind fest verdrahtet, aus dem
 *   Request wird ausser "war es ein Push auf den richtigen Branch" nichts gelesen.
 *
 * Ohne Abhaengigkeiten, laeuft mit dem Node, der ohnehin da ist.
 */
import { spawn } from "node:child_process";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat, symlink } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const PORT = Number(process.env.DEPLOY_PORT ?? 9000);
const SECRET = process.env.DEPLOY_WEBHOOK_SECRET ?? "";
const BRANCH = process.env.DEPLOY_BRANCH ?? "main";
const REPO_DIR = process.env.DEPLOY_REPO_DIR ?? process.cwd();
const PM2_APP = process.env.DEPLOY_PM2_APP ?? "vipcraft";

/** GitHub-Payloads sind klein; alles Groessere wird gar nicht erst gelesen. */
const MAX_BODY_BYTES = 1_000_000;

if (!SECRET) {
  console.error("[deploy] DEPLOY_WEBHOOK_SECRET ist nicht gesetzt – ohne Secret wird nicht gestartet.");
  process.exit(1);
}

const log = (...args) => console.log(`[deploy ${new Date().toISOString()}]`, ...args);

// ---------------------------------------------------------------------------
// Signaturpruefung
// ---------------------------------------------------------------------------

/**
 * Vergleicht die Signatur von GitHub mit der selbst berechneten.
 * timingSafeEqual statt "===", damit sich das Secret nicht ueber die
 * Antwortzeit Zeichen fuer Zeichen erraten laesst.
 */
function signatureValid(rawBody, headerValue) {
  if (typeof headerValue !== "string") return false;

  const expected = `sha256=${createHmac("sha256", SECRET).update(rawBody).digest("hex")}`;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(headerValue, "utf8");

  // Ungleiche Laenge kann timingSafeEqual nicht vergleichen – und ist ohnehin falsch.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Der Deploy selbst
// ---------------------------------------------------------------------------

/*
 * Gebaut wird in GitHub Actions (.github/workflows/build.yml), nicht hier.
 *
 * WARUM NICHT MEHR HIER: `npm ci` hat auf dieser Maschine 1,1 GB angefordert
 * und wurde vom OOM-Killer erschlagen (dmesg, 11.09.2026). Weil `npm ci`
 * node_modules VORHER loescht, war danach die Startdatei der laufenden Seite
 * weg - die Website kam beim naechsten Neustart nicht mehr hoch, ohne dass
 * jemand etwas gepusht hatte. Der alte Trostsatz "die laufende Fassung bleibt
 * unveraendert" stimmte also nicht: Der Abbruch hatte ihr den Boden
 * weggezogen.
 *
 * Jetzt wird nur noch das fertige Buendel geholt und DANEBEN ausgepackt. Die
 * laufende Fassung wird erst angefasst, wenn die neue nachweislich startet und
 * ausliefert. Bis dahin zeigt `current` unveraendert auf die alte, und ein
 * Fehlschlag kostet nichts ausser dem Platz des Downloads.
 *
 * Verzeichnisse (alles unterhalb von REPO_DIR, damit nichts umziehen muss):
 *   releases/<tag>/     ein entpacktes Buendel
 *   current             Symlink auf das, was gerade laeuft
 *   .env                die echten Geheimnisse - bleiben, wo sie sind
 *   prisma/dev.db       die Datenbank - bleibt, wo sie ist
 */
const RELEASES_DIR = process.env.DEPLOY_RELEASES_DIR ?? join(REPO_DIR, "releases");
const CURRENT_LINK = process.env.DEPLOY_CURRENT_LINK ?? join(REPO_DIR, "current");
const REPO_SLUG = process.env.DEPLOY_REPO_SLUG ?? "Cryptocryxx/vip-craft-4-webpage";

/**
 * Die Prisma-CLI ist eine devDependency und liegt deshalb NICHT im Buendel.
 * Sie wird einmalig getrennt installiert (siehe README, Abschnitt Deployment);
 * `npm i` fuer dieses eine Paket passt in den Speicher, ein volles `npm ci`
 * nicht.
 */
const PRISMA_CLI = process.env.DEPLOY_PRISMA_CLI ?? join(homedir(), "prisma-cli", "node_modules", ".bin", "prisma");

/** Auf diesem Port wird die neue Fassung zur Probe gestartet, bevor sie live darf. */
const PROBE_PORT = Number(process.env.DEPLOY_PROBE_PORT ?? 3999);

/** So viele alte Releases bleiben liegen - fuer den Fall, dass zurueckgerudert werden muss. */
const KEEP_RELEASES = Number(process.env.DEPLOY_KEEP_RELEASES ?? 3);

/**
 * Diese Seiten muss die neue Fassung mit 200 ausliefern.
 *
 * "/" und "/shops" sind die deutschen Adressen: Sie haben kein Sprachpraefix
 * und entstehen erst durch einen Rewrite der next-intl-Middleware. Genau der
 * geht im Standalone-Buendel kaputt, wenn HOSTNAME auf eine konkrete Adresse
 * zeigt - dann wird daraus eine 307-Weiterleitung auf sich selbst, waehrend
 * die englische Seite heil bleibt. Deshalb beide, und deshalb genau 200.
 */
const PROBE_PFADE = ["/", "/shops", "/en/shops"];

/**
 * `cwd` ist nicht immer der Projektordner - siehe den Prisma-Aufruf weiter
 * unten. git und pm2 wollen dorthin, die Schema-Angleichung ausdruecklich nicht.
 */
function run(command, args, cwd = REPO_DIR) {
  return new Promise((resolve) => {
    log(`$ ${command} ${args.join(" ")}`);
    const child = spawn(command, args, { cwd, env: process.env });

    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));

    child.on("error", (error) => {
      log(`  konnte nicht gestartet werden: ${error.message}`);
      resolve(false);
    });
    child.on("close", (code, signal) => {
      if (signal) {
        /*
         * Exit-Code null heisst: abgeschossen, nicht selbst beendet. Ohne den
         * Signalnamen im Log sucht man den Fehler im Programm statt im Kernel -
         * genau das ist am 11.09.2026 passiert, als der OOM-Killer `npm ci`
         * zweimal erschlagen hat und im Log nur "Exit-Code null" stand.
         */
        log(`  abgebrochen durch Signal ${signal}` + (signal === "SIGKILL" ? " - bei SIGKILL fast immer der OOM-Killer, nachzusehen mit: dmesg -T | grep -i \"killed process\"" : ""));
      } else if (code !== 0) {
        log(`  fehlgeschlagen (Exit-Code ${code})`);
      }
      resolve(code === 0 && !signal);
    });
  });
}

/**
 * Die Datenbank MUSS absolut konfiguriert sein.
 *
 * Das Standalone-server.js macht als allererstes `process.chdir(__dirname)`.
 * Ein relatives `file:./prisma/dev.db` zeigte damit in den Release-Ordner -
 * Prisma legte dort beim Schema-Abgleich eine frische, leere Datenbank an, die
 * Seite kaeme hoch und saehe aus, als waere alles geloescht. Die echte Datei
 * laege noch da, aber das wuesste in dem Moment niemand.
 *
 * Deshalb hier ein harter Riegel statt einer Fussnote im README.
 */
function datenbankPfadTaugt() {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("file:/")) return true;

  log(`DATABASE_URL ist relativ angegeben ("${url}") - so wird nicht deployt.`);
  log("  Das Standalone-Buendel wechselt beim Start in seinen eigenen Ordner;");
  log("  eine relative Angabe zeigte dort hinein, und der Deploy legte jedes Mal");
  log("  eine frische, leere Datenbank an.");
  log(`  Bitte in der .env absolut eintragen: DATABASE_URL="file:${join(REPO_DIR, "prisma", "dev.db")}"`);
  return false;
}

/** Das neueste Release samt Tarball-Adresse. Oeffentliches Repo, also ohne Token. */
async function neuestesRelease() {
  let antwort;
  try {
    antwort = await fetch(`https://api.github.com/repos/${REPO_SLUG}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "vipcraft-deploy" },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    log(`GitHub nicht erreichbar: ${error.message}`);
    return null;
  }

  if (!antwort.ok) {
    log(`GitHub antwortete mit ${antwort.status} auf die Frage nach dem neuesten Release.`);
    return null;
  }

  const daten = await antwort.json();
  const asset = (daten.assets ?? []).find((eintrag) => String(eintrag.name).endsWith(".tar.gz"));
  if (!asset) {
    log(`Im Release ${daten.tag_name} liegt kein .tar.gz - hat der Build-Lauf ihn wirklich angehaengt?`);
    return null;
  }

  return { tag: String(daten.tag_name), url: String(asset.browser_download_url) };
}

/**
 * Laedt den Tarball und packt ihn in einen frischen Ordner.
 *
 * Gestreamt statt in den Speicher geladen - auf genau dieser Maschine ist der
 * letzte Deploy am Arbeitsspeicher gescheitert.
 */
async function holeUndEntpacke(release) {
  const ziel = join(RELEASES_DIR, release.tag);
  const tarball = join(RELEASES_DIR, ".download.tar.gz");

  await mkdir(RELEASES_DIR, { recursive: true });
  await rm(ziel, { recursive: true, force: true });
  await rm(tarball, { force: true });

  log(`$ herunterladen ${release.url}`);
  let antwort;
  try {
    antwort = await fetch(release.url, {
      headers: { Accept: "application/octet-stream", "User-Agent": "vipcraft-deploy" },
      signal: AbortSignal.timeout(600_000),
    });
  } catch (error) {
    log(`  Download fehlgeschlagen: ${error.message}`);
    return null;
  }
  if (!antwort.ok || !antwort.body) {
    log(`  Download fehlgeschlagen: HTTP ${antwort.status}`);
    return null;
  }

  try {
    await pipeline(Readable.fromWeb(antwort.body), createWriteStream(tarball));
  } catch (error) {
    log(`  Schreiben fehlgeschlagen: ${error.message}`);
    return null;
  }

  await mkdir(ziel, { recursive: true });
  if (!(await run("tar", ["-xzf", tarball, "-C", ziel]))) return null;
  await rm(tarball, { force: true });

  /*
   * Die .env liegt bewusst NICHT im Tarball (der Build-Lauf entfernt sie
   * ausdruecklich) - sie kommt per Symlink aus dem Projektordner dazu. So gibt
   * es weiterhin genau eine Datei mit den echten Geheimnissen.
   */
  await symlink(join(REPO_DIR, ".env"), join(ziel, ".env"));

  return ziel;
}

/**
 * Startet die neue Fassung zur Probe und fragt ein paar Seiten ab.
 *
 * Das ist das Tor, durch das jeder Deploy muss. Solange hier etwas klemmt,
 * laeuft die alte Fassung unangetastet weiter.
 */
async function neueFassungTraegt(zielDir) {
  const env = { ...process.env, PORT: String(PROBE_PORT), NODE_ENV: "production" };

  /*
   * Der Beobachter darf bei der Probe NICHT mitlaufen: Er kann den
   * Minecraft-Server starten und neu starten (lib/server-watchdog.ts), und
   * zwei davon gleichzeitig sind genau das, was ecosystem.config.cjs mit
   * "eine Instanz" verhindert. Die Umgebungsvariable sticht die .env, weil
   * Next vorhandene Werte nicht ueberschreibt.
   */
  env.SERVER_WATCHDOG = "false";

  // Siehe PROBE_PFADE: ein gesetztes HOSTNAME zerlegt alle deutschen Adressen.
  delete env.HOSTNAME;

  log(`$ Probelauf auf Port ${PROBE_PORT}`);
  const kind = spawn(process.execPath, ["server.js"], { cwd: zielDir, env });
  kind.stdout.on("data", (chunk) => process.stdout.write(chunk));
  kind.stderr.on("data", (chunk) => process.stderr.write(chunk));

  let gestorben = null;
  kind.on("exit", (code, signal) => {
    gestorben = signal ? `Signal ${signal}` : `Exit-Code ${code}`;
  });

  try {
    // Erst warten, bis ueberhaupt jemand antwortet.
    let erreichbar = false;
    for (let versuch = 0; versuch < 60 && !gestorben; versuch++) {
      try {
        await fetch(`http://127.0.0.1:${PROBE_PORT}/en/shops`, {
          redirect: "manual",
          signal: AbortSignal.timeout(5_000),
        });
        erreichbar = true;
        break;
      } catch {
        await new Promise((weiter) => setTimeout(weiter, 1_000));
      }
    }

    if (gestorben) {
      log(`  Der Probelauf ist beendet worden (${gestorben}).`);
      return false;
    }
    if (!erreichbar) {
      log("  Der Probelauf hat 60 Sekunden lang nicht geantwortet.");
      return false;
    }

    // Und dann: liefert er auch aus, was er soll?
    for (const pfad of PROBE_PFADE) {
      let status = 0;
      try {
        const antwort = await fetch(`http://127.0.0.1:${PROBE_PORT}${pfad}`, {
          redirect: "manual",
          signal: AbortSignal.timeout(20_000),
        });
        status = antwort.status;
      } catch (error) {
        log(`  ${pfad}: keine Antwort (${error.message})`);
        return false;
      }

      log(`  ${pfad} -> ${status}`);
      if (status !== 200) {
        log("  Erwartet war 200. Bei 307 auf den deutschen Adressen: HOSTNAME pruefen (siehe PROBE_PFADE).");
        return false;
      }
    }

    return true;
  } finally {
    kind.kill("SIGTERM");
    // Ein haengender Probelauf blockierte sonst den Port des naechsten Deploys.
    const notbremse = setTimeout(() => kind.kill("SIGKILL"), 10_000);
    await new Promise((weiter) => kind.on("close", weiter));
    clearTimeout(notbremse);
  }
}

/**
 * Legt `current` auf das neue Release um.
 *
 * Ueber rename(), nicht ueber loeschen-und-neu-anlegen: rename ersetzt den
 * Symlink in einem Zug. Es gibt keinen Moment, in dem `current` ins Leere
 * zeigt - und damit keinen, in dem ein pm2-Neustart danebengreifen koennte.
 */
async function legeUm(zielDir) {
  const zwischen = `${CURRENT_LINK}.neu`;
  await rm(zwischen, { force: true });
  await symlink(zielDir, zwischen);
  await rename(zwischen, CURRENT_LINK);
  log(`current -> ${zielDir}`);
}

/** Alte Releases wegraeumen, die juengsten bleiben fuer den Rueckweg liegen. */
async function raeumeAlteReleasesWeg(aktuellerTag) {
  let eintraege;
  try {
    eintraege = await readdir(RELEASES_DIR, { withFileTypes: true });
  } catch {
    return;
  }

  const ordner = [];
  for (const eintrag of eintraege) {
    if (!eintrag.isDirectory()) continue;
    const pfad = join(RELEASES_DIR, eintrag.name);
    ordner.push({ name: eintrag.name, pfad, zeit: (await stat(pfad)).mtimeMs });
  }

  ordner.sort((a, b) => b.zeit - a.zeit);
  for (const alt of ordner.slice(KEEP_RELEASES)) {
    if (alt.name === aktuellerTag) continue;
    log(`  raeume auf: ${alt.name}`);
    await rm(alt.pfad, { recursive: true, force: true });
  }
}

let running = false;
/** Kam waehrend eines Laufs ein weiterer Push, wird genau einmal nachgelegt. */
let rerunPending = false;

/**
 * Ein Durchgang.
 *
 * Die Reihenfolge ist die ganze Sicherheit dieses Skripts: Alles, was
 * schiefgehen kann, passiert VOR dem Umlegen von `current`.
 */
async function einDurchgang() {
  /*
   * Der Projektordner wird weiter nachgezogen - nicht wegen der Website (die
   * kommt fertig aus dem Tarball), sondern wegen dieses Skripts selbst, der
   * pm2-Konfiguration und des Schemas. Beides kostet kein nennenswertes
   * Gedaechtnis.
   */
  if (!(await run("git", ["fetch", "--prune", "origin"]))) return false;
  if (!(await run("git", ["merge", "--ff-only", `origin/${BRANCH}`]))) return false;

  if (!datenbankPfadTaugt()) return false;

  const release = await neuestesRelease();
  if (!release) return false;
  log(`Neuestes Release: ${release.tag}`);

  const zielDir = await holeUndEntpacke(release);
  if (!zielDir) return false;

  /*
   * Schema nachziehen, bevor die neue Fassung es zu sehen bekommt: Eine neue
   * Tabelle muss da sein, bevor Code sie abfragt. Ohne --accept-data-loss -
   * was Daten kosten wuerde, soll hier laut scheitern.
   */
  /*
   * NICHT im Projektordner ausfuehren, sondern im Release-Ordner.
   *
   * Die Prisma-CLI sucht im aktuellen Verzeichnis (nur dort, nicht in den
   * uebergeordneten - am 11.09.2026 nachgemessen) nach einer
   * prisma.config.ts. Im Projektordner liegt eine, und die beginnt mit
   * `import "dotenv/config"` - ein Paket, das es hier seit der Umstellung
   * nicht mehr gibt. Die CLI bricht dann ab, noch bevor sie --url ueberhaupt
   * ansieht. Im Release-Ordner liegt keine Config, also auch kein Problem.
   */
  const schemaOk = await run(
    PRISMA_CLI,
    ["db", "push", "--schema", join(zielDir, "prisma", "schema.prisma"), "--url", process.env.DATABASE_URL],
    zielDir,
  );
  if (!schemaOk) {
    log("  Schema-Abgleich fehlgeschlagen. Liegt die Prisma-CLI da, wo DEPLOY_PRISMA_CLI hinzeigt?");
    log(`  Erwartet: ${PRISMA_CLI}`);
    return false;
  }

  if (!(await neueFassungTraegt(zielDir))) return false;

  await legeUm(zielDir);
  if (!(await run("pm2", ["restart", PM2_APP, "--update-env"]))) return false;

  await raeumeAlteReleasesWeg(release.tag);
  return true;
}

async function deploy() {
  if (running) {
    rerunPending = true;
    log("Läuft bereits – ein weiterer Durchgang wird angehängt.");
    return;
  }

  running = true;
  try {
    do {
      rerunPending = false;
      log(`=== Deploy startet (${BRANCH}) ===`);

      let ok = false;
      try {
        ok = await einDurchgang();
      } catch (error) {
        log(`Unerwarteter Fehler: ${error.stack ?? error.message}`);
      }

      if (ok) {
        log("=== Deploy fertig ===");
      } else {
        log("=== Abgebrochen. Die laufende Fassung laeuft unveraendert weiter. ===");
      }
    } while (rerunPending);
  } finally {
    running = false;
  }
}


// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

const server = createServer((req, res) => {
  const reply = (status, text) => {
    res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(text);
  };

  if (req.method === "GET" && req.url === "/health") {
    return reply(200, running ? "deploy läuft" : "bereit");
  }
  if (req.method !== "POST") return reply(405, "Nur POST.");

  const chunks = [];
  let size = 0;
  let aborted = false;

  req.on("data", (chunk) => {
    if (aborted) return;
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      aborted = true;
      reply(413, "Zu groß.");
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on("end", () => {
    if (aborted) return;
    const body = Buffer.concat(chunks);

    // Erst die Signatur, dann alles andere. Vorher wird nichts ausgewertet.
    if (!signatureValid(body, req.headers["x-hub-signature-256"])) {
      log(`Abgewiesen: ungültige oder fehlende Signatur (${req.socket.remoteAddress}).`);
      return reply(401, "Signatur ungültig.");
    }

    const event = req.headers["x-github-event"];
    if (event === "ping") return reply(200, "pong");
    if (event !== "push") return reply(200, `Ereignis "${event}" wird ignoriert.`);

    let payload;
    try {
      payload = JSON.parse(body.toString("utf8"));
    } catch {
      return reply(400, "Kein gültiges JSON.");
    }

    if (payload.ref !== `refs/heads/${BRANCH}`) {
      log(`Push auf ${payload.ref} – ignoriert, erwartet wird refs/heads/${BRANCH}.`);
      return reply(200, "Anderer Branch, nichts zu tun.");
    }

    // GitHub gibt einem 10 Sekunden. Der Deploy dauert länger, also sofort
    // quittieren und im Hintergrund arbeiten.
    reply(202, "Deploy angestoßen.");
    log(`Push von ${payload.pusher?.name ?? "unbekannt"} auf ${BRANCH}.`);
    void deploy();
  });
});

server.listen(PORT, "127.0.0.1", () => {
  log(`Lauscht auf 127.0.0.1:${PORT}, Branch ${BRANCH}, Projekt ${REPO_DIR}.`);
});
