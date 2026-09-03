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
import { createServer } from "node:http";

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

/**
 * Reihenfolge ist Absicht: Erst alles vorbereiten, erst ganz zuletzt neu starten.
 * Bricht ein Schritt ab, laeuft die alte Fassung unveraendert weiter.
 *
 * `git merge --ff-only` statt `reset --hard`: Gibt es auf dem Server lokale
 * Commits, schlaegt der Deploy laut fehl, statt sie stillschweigend wegzuwerfen.
 */
const STEPS = [
  ["git", ["fetch", "--prune", "origin"]],
  ["git", ["merge", "--ff-only", `origin/${BRANCH}`]],
  ["npm", ["ci"]],
  // Ohne --accept-data-loss verweigert Prisma alles, was Daten kosten wuerde.
  ["npm", ["run", "db:push"]],
  ["npm", ["run", "build"]],
  ["pm2", ["restart", PM2_APP, "--update-env"]],
];

function run(command, args) {
  return new Promise((resolve) => {
    log(`$ ${command} ${args.join(" ")}`);
    const child = spawn(command, args, { cwd: REPO_DIR, env: process.env });

    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));

    child.on("error", (error) => {
      log(`  konnte nicht gestartet werden: ${error.message}`);
      resolve(false);
    });
    child.on("close", (code) => {
      if (code !== 0) log(`  fehlgeschlagen (Exit-Code ${code})`);
      resolve(code === 0);
    });
  });
}

let running = false;
/** Kam waehrend eines Laufs ein weiterer Push, wird genau einmal nachgelegt. */
let rerunPending = false;

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

      let ok = true;
      for (const [command, args] of STEPS) {
        ok = await run(command, args);
        if (!ok) {
          log("=== Abgebrochen. Die laufende Fassung bleibt unverändert. ===");
          break;
        }
      }
      if (ok) log("=== Deploy fertig ===");
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
