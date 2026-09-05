import { unstable_rethrow } from "next/navigation";
import "server-only";
import { discordBotToken } from "@/lib/discord";
import { schreibeGameLogZeilen } from "@/lib/game-log";
import { prisma } from "@/lib/prisma";

/**
 * Holt Nachrichten aus dem Discord-Kanal, der per DiscordLinker mit dem
 * Minecraft-Chat verbunden ist, und schreibt sie in dieselbe Tabelle wie den
 * Spielverlauf (siehe game-log.ts). Damit taucht eine Unterhaltung, die auf
 * Discord anfängt, im Kontrollraum genau dort auf, wo sie im Spielchat auch
 * stünde – im selben Verlauf, in derselben Reihenfolge.
 *
 * WARUM NICHT ÜBER DAS SPIEL SELBST: DiscordLinker setzt die Nachricht direkt
 * als Chat-Paket an die Spieler ab, ohne den normalen Chat-Ablauf zu
 * durchlaufen, den `PlayerEvents.chat` im KubeJS-Skript abfängt (der ist an
 * einen echten Spieler als Absender gebunden). Auf der Discord-Seite direkt
 * abzufragen ist deshalb der einzige Weg – und nebenbei der einfachere, weil
 * er ganz ohne Änderung am Server auskommt.
 *
 * WARUM EIN EIGENER ABGLEICH STATT runId/sourceSeq WIE BEIM KUBEJS-SKRIPT:
 * Ein Serverlauf ergibt für einen Discord-Kanal keinen Sinn – der besteht
 * unabhängig davon, ob der Minecraft-Server gerade an ist. Stattdessen merkt
 * sich diese Datei die zuletzt gesehene Discord-Nachrichten-ID (als String –
 * als Zahl verliert JavaScript ab 2^53 Präzision, und Discord-IDs sind
 * 64-Bit-Snowflakes) in der `Setting`-Tabelle und fragt beim nächsten Mal nur
 * danach, was neuer ist.
 *
 * VORAUSSETZUNGEN, die nur im Discord-Server selbst einzurichten sind:
 * 1. In der `.env`: DISCORD_CHAT_CHANNEL_ID auf den Bridge-Kanal setzen.
 * 2. Discord Developer Portal → Bot → "Message Content Intent" einschalten.
 *    Ohne dieses (kostenlose) Häkchen liefert Discord jede Nachricht mit
 *    leerem `content` aus – kein Fehler, nur stille Leere.
 * 3. Dem Bot in genau diesem Kanal "Kanal anzeigen" und "Nachrichtenverlauf
 *    anzeigen" erlauben. Ohne Mitgliederliste zu holen reicht das; keine
 *    weiteren Berechtigungen nötig.
 */

const DISCORD_API = "https://discord.com/api/v10";
const MAX_TEXT = 500;
/** Wie beim KubeJS-Skript: unter zehn Sekunden lohnt der Abruf nicht. */
const ABSTAND_MS = 10_000;
/** Schutz gegen einen sehr großen Nachhol-Rückstand in einem einzigen Durchgang. */
const MAX_SEITEN = 5;
const SETTING_KEY = "discordChatAfterId";

export const discordChatChannelId = process.env.DISCORD_CHAT_CHANNEL_ID ?? "";
export const discordChatConfigured = Boolean(discordBotToken && discordChatChannelId);

export type DiscordErfassungsStand = {
  konfiguriert: boolean;
  erreichbar: boolean;
  neu: number;
  /** Wahrscheinlich fehlt das "Message Content Intent" im Developer Portal. */
  vermutlichOhneInhalt: boolean;
  meldung: string | null;
  geprueftAm: string | null;
};

let letzterStand: DiscordErfassungsStand = {
  konfiguriert: false,
  erreichbar: false,
  neu: 0,
  vermutlichOhneInhalt: false,
  meldung: "Noch nicht nachgesehen.",
  geprueftAm: null,
};

export function letzterDiscordErfassungsStand(): DiscordErfassungsStand {
  return letzterStand;
}

// ---------------------------------------------------------------------------
// Discord-Nachrichten, roh
// ---------------------------------------------------------------------------

type DiscordAutor = { id: string; username: string; global_name?: string | null; bot?: boolean };
type DiscordNachricht = {
  id: string;
  content?: string;
  timestamp: string;
  author?: DiscordAutor;
  webhook_id?: string;
  type?: number;
};

/** Snowflakes als BigInt vergleichen – als `number` verlöre man ab 2^53 die Präzision. */
function neuer(a: string, b: string): boolean {
  return BigInt(a) > BigInt(b);
}

async function holeSeite(after: string | null, limit: number): Promise<{ status: number; daten: DiscordNachricht[] }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);

  const response = await fetch(`${DISCORD_API}/channels/${discordChatChannelId}/messages?${params}`, {
    headers: { Authorization: `Bot ${discordBotToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (response.status !== 200) return { status: response.status, daten: [] };
  const daten = (await response.json()) as DiscordNachricht[];
  return { status: 200, daten: Array.isArray(daten) ? daten : [] };
}

/**
 * "Nachrichten, die tatsächlich jemand getippt hat." Ausgefiltert werden
 * Webhook-Nachrichten (das ist die Bridge selbst, die Minecraft-Chat nach
 * Discord spiegelt – die steht schon über das KubeJS-Skript in der Tabelle),
 * andere Bots und Systemzeilen wie "X hat eine Nachricht anpinnt".
 */
function istEchteNachricht(nachricht: DiscordNachricht): boolean {
  if (nachricht.webhook_id) return false;
  if (nachricht.author?.bot) return false;
  // 0 = normale Nachricht, 19 = Antwort auf eine andere. Alles andere sind
  // Systemzeilen (Pins, Thread-Ereignisse, Boosts, …).
  return nachricht.type === 0 || nachricht.type === 19;
}

function kuerze(text: string): string {
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text;
}

// ---------------------------------------------------------------------------
// Cursor
// ---------------------------------------------------------------------------

async function holeCursor(): Promise<string | null> {
  const zeile = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  return zeile?.value ?? null;
}

async function speichereCursor(id: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: id },
    create: { key: SETTING_KEY, value: id },
  });
}

// ---------------------------------------------------------------------------
// Zuordnung zu Website-Accounts
// ---------------------------------------------------------------------------

/**
 * Ist die Person mit ihrem Discord-Account bei uns angemeldet, erscheint die
 * Nachricht unter ihrem Minecraft-Namen – derselbe Verlauf wie im Spiel selbst.
 * Sonst unter "Discord: <Anzeigename>", klar als Discord-Herkunft erkennbar
 * und ohne mit einem echten Minecraft-Namen zu kollidieren.
 */
async function accountsZuordnen(
  discordIds: string[],
): Promise<Map<string, { userId: string; minecraftName: string | null }>> {
  const ergebnis = new Map<string, { userId: string; minecraftName: string | null }>();
  if (discordIds.length === 0) return ergebnis;

  const konten = await prisma.account.findMany({
    where: { provider: "discord", providerAccountId: { in: discordIds } },
    select: { providerAccountId: true, userId: true },
  });
  if (konten.length === 0) return ergebnis;

  const nutzer = await prisma.user.findMany({
    where: { id: { in: konten.map((k) => k.userId) } },
    select: { id: true, minecraftName: true },
  });
  const nameVonUser = new Map(nutzer.map((n) => [n.id, n.minecraftName]));

  for (const konto of konten) {
    ergebnis.set(konto.providerAccountId, {
      userId: konto.userId,
      minecraftName: nameVonUser.get(konto.userId) ?? null,
    });
  }
  return ergebnis;
}

// ---------------------------------------------------------------------------
// Durchgang
// ---------------------------------------------------------------------------

let letzterLauf = 0;
let laeuft = false;

export async function holeDiscordNachrichten(erzwingen = false): Promise<DiscordErfassungsStand> {
  if (!discordChatConfigured) {
    letzterStand = {
      konfiguriert: false,
      erreichbar: false,
      neu: 0,
      vermutlichOhneInhalt: false,
      meldung: "DISCORD_CHAT_CHANNEL_ID ist nicht gesetzt (oder es fehlt der Bot-Token).",
      geprueftAm: letzterStand.geprueftAm,
    };
    return letzterStand;
  }
  if (laeuft) return letzterStand;
  if (!erzwingen && Date.now() - letzterLauf < ABSTAND_MS) return letzterStand;

  laeuft = true;
  try {
    letzterStand = await durchgang();
  } catch (error) {
    unstable_rethrow(error);
    console.error("[discord-chat] Durchgang fehlgeschlagen:", error);
    letzterStand = {
      konfiguriert: true,
      erreichbar: false,
      neu: 0,
      vermutlichOhneInhalt: false,
      meldung: error instanceof Error ? error.message : String(error),
      geprueftAm: new Date().toISOString(),
    };
  } finally {
    laeuft = false;
    letzterLauf = Date.now();
  }
  return letzterStand;
}

async function durchgang(): Promise<DiscordErfassungsStand> {
  const jetzt = new Date().toISOString();
  let cursor = await holeCursor();

  // Erster Durchlauf überhaupt: nicht die ganze Kanalgeschichte aufrollen,
  // sondern erst ab jetzt mitschreiben.
  if (cursor === null) {
    const { status, daten } = await holeSeite(null, 1);
    if (status !== 200) return fehlerStatus(status, jetzt);

    if (daten.length > 0) await speichereCursor(daten[0].id);
    return {
      konfiguriert: true,
      erreichbar: true,
      neu: 0,
      vermutlichOhneInhalt: false,
      meldung: "Eingerichtet – erfasst wird ab der nächsten Nachricht.",
      geprueftAm: jetzt,
    };
  }

  const gesehen: DiscordNachricht[] = [];
  for (let seite = 0; seite < MAX_SEITEN; seite += 1) {
    const { status, daten } = await holeSeite(cursor, 100);
    if (status !== 200) return fehlerStatus(status, jetzt);
    if (daten.length === 0) break;

    gesehen.push(...daten);
    // Discords Sortierung von /messages ist bei Gebrauch von `after` nicht
    // dokumentiert genug, um sich blind darauf zu verlassen – deshalb hier
    // selbst nach der (als BigInt verglichenen) ID sortieren.
    const groesste = daten.reduce((m, n) => (neuer(n.id, m) ? n.id : m), daten[0].id);
    cursor = groesste;

    if (daten.length < 100) break;
  }

  if (gesehen.length === 0) {
    return { konfiguriert: true, erreichbar: true, neu: 0, vermutlichOhneInhalt: false, meldung: null, geprueftAm: jetzt };
  }

  await speichereCursor(cursor);

  const echte = gesehen.filter(istEchteNachricht).sort((a, b) => (neuer(a.id, b.id) ? 1 : -1));
  if (echte.length === 0) {
    return { konfiguriert: true, erreichbar: true, neu: 0, vermutlichOhneInhalt: false, meldung: null, geprueftAm: jetzt };
  }

  const autorenIds = [...new Set(echte.map((n) => n.author?.id).filter((id): id is string => Boolean(id)))];
  const zuordnung = await accountsZuordnen(autorenIds);

  const zeilen = echte.map((nachricht) => {
    const autor = nachricht.author;
    const anzeigename = autor?.global_name || autor?.username || "Unbekannt";
    const verknuepft = autor ? zuordnung.get(autor.id) : undefined;

    return {
      externalId: nachricht.id,
      kind: "DISCORD_CHAT",
      playerName: verknuepft?.minecraftName ?? `Discord: ${anzeigename}`,
      playerUuid: null,
      userId: verknuepft?.userId ?? null,
      text: kuerze(nachricht.content ?? ""),
      at: new Date(nachricht.timestamp),
    };
  });

  const geschrieben = await schreibeGameLogZeilen(zeilen);

  // Stille Leere ist der typische Fingerabdruck des fehlenden Intents – nicht
  // sicher, aber ein Hinweis, den man sonst erst durch Zufall entdeckt.
  const vermutlichOhneInhalt = zeilen.length > 0 && zeilen.every((z) => z.text === "");

  return {
    konfiguriert: true,
    erreichbar: true,
    neu: geschrieben,
    vermutlichOhneInhalt,
    meldung: null,
    geprueftAm: jetzt,
  };
}

function fehlerStatus(status: number, jetzt: string): DiscordErfassungsStand {
  const meldung =
    status === 403
      ? `Discord meldet HTTP 403 – der Bot darf den Kanal nicht lesen. In Discord dem Bot dort "Kanal anzeigen" und "Nachrichtenverlauf anzeigen" erlauben.`
      : status === 404
        ? "Discord meldet HTTP 404 – die Kanal-ID stimmt vermutlich nicht (DISCORD_CHAT_CHANNEL_ID)."
        : `Discord antwortete mit HTTP ${status}.`;

  console.error(`[discord-chat] ${meldung}`);
  return { konfiguriert: true, erreichbar: false, neu: 0, vermutlichOhneInhalt: false, meldung, geprueftAm: jetzt };
}
