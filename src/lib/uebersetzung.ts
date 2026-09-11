import "server-only";
import { createHash } from "node:crypto";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import type { KopfgeldZeile } from "@/lib/bounties";
import type { ShopDTO } from "@/lib/shop-types";
import type { SuggestionDTO } from "@/lib/suggestion-types";

/**
 * Maschinenuebersetzung fuer das, was Spieler selbst schreiben.
 *
 * Die Oberflaeche der Seite liegt uebersetzt in `messages/de.json` und
 * `messages/en.json`. Was Spieler eintragen - Shop-Beschreibungen,
 * Bewertungen, Vorschlaege, Kopfgeld-Begruendungen - steht dort naturgemaess
 * nicht: Es entsteht erst im Betrieb und ist fast immer deutsch. Auf der
 * englischen Fassung stand es deshalb bisher unuebersetzt mitten im
 * englischen Text.
 *
 * Diese Datei schiebt genau diese Texte durch Google Translate, bevor sie
 * angezeigt werden. Drei Dinge sind dabei wichtig:
 *
 * ▸ ES WIRD NUR ANGEZEIGT, NIE GESPEICHERT. In der Datenbank bleibt das
 *   Original stehen. Die Bearbeitungsformulare (ShopForm im Dashboard)
 *   bekommen deshalb absichtlich die unuebersetzten Daten - sonst wuerde beim
 *   naechsten Speichern die Rueckuebersetzung zum neuen Original.
 * ▸ ES WIRD ZWISCHENGESPEICHERT (Modell `Translation`). Ohne das waere jeder
 *   Seitenaufruf ein Schwung Anfragen nach draussen.
 * ▸ EIN AUSFALL DARF NICHTS KAPUTTMACHEN. Geht Google nicht ran, erscheint
 *   der deutsche Originaltext - genau wie vorher. Keine Fehlerseite, kein
 *   leeres Feld.
 *
 * Namen werden nicht uebersetzt: Laeden heissen, wie sie heissen, und ein
 * "Iron Trade North" liesse sich im Spiel nicht wiederfinden.
 */

/** Ausgangssprache. Was hier geschrieben wird, ist im Zweifel deutsch. */
const QUELLSPRACHE = "de";

/**
 * Laengere Texte gehen unuebersetzt durch.
 *
 * Die Eingabefelder begrenzen ohnehin schon (Vorschlagstext: 2000 Zeichen) -
 * die Grenze hier ist nur die Bremse fuer den Fall, dass irgendwo doch etwas
 * Langes durchrutscht.
 */
const MAX_LAENGE = 2_000;

/** So viele Anfragen gleichzeitig, wenn ohne API-Schluessel uebersetzt wird. */
const GLEICHZEITIG = 4;

/** Der offizielle Dienst nimmt bis zu 128 Texte auf einmal - wir bleiben drunter. */
const BUENDEL = 64;

/**
 * Prozessweiter Zwischenspeicher vor der Datenbank.
 *
 * Die Shop-Seite fragt dieselben Texte bei jedem Aufruf erneut an; das hier
 * spart die SQLite-Abfrage. Schluessel ist `hash|sprache`.
 */
const speicher = new Map<string, string>();

/**
 * Bis wann nicht mehr gefragt wird.
 *
 * Wenn Google dichtmacht (429) oder nicht antwortet, hat es keinen Zweck, es
 * beim naechsten Seitenaufruf sofort wieder zu versuchen - das verlangsamt nur
 * jede Anfrage um den Zeitablauf. Eine Minute Ruhe, dann darf es wieder.
 */
let pauseBis = 0;
const PAUSE_MS = 60_000;

// ---------------------------------------------------------------------------
// Kern
// ---------------------------------------------------------------------------

function schluessel(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

/**
 * In welche Sprache uebersetzt werden soll - oder `null`, wenn gar nichts zu
 * tun ist (deutsche Fassung, oder eine Sprache, die es nicht gibt).
 */
async function zielsprache(): Promise<string | null> {
  const locale = await getLocale();
  if (locale === QUELLSPRACHE) return null;
  if (!(routing.locales as readonly string[]).includes(locale)) return null;
  return locale;
}

/**
 * Lohnt sich die Uebersetzung ueberhaupt?
 *
 * Reine Zahlen, Koordinaten oder ein "<3" haben nichts zu uebersetzen; die
 * Anfrage waere verschenkt. Verlangt wird mindestens ein Buchstabe.
 */
function brauchbar(text: string): boolean {
  const roh = text.trim();
  if (roh.length === 0 || roh.length > MAX_LAENGE) return false;
  return /\p{L}/u.test(roh);
}

/**
 * Uebersetzt eine Liste von Texten und liefert die Zuordnung
 * Original → Uebersetzung. Texte, die nicht uebersetzt werden konnten, fehlen
 * in der Antwort - die Aufrufer nehmen dann das Original.
 */
async function uebersetzeTexte(texte: string[], ziel: string): Promise<Map<string, string>> {
  const ergebnis = new Map<string, string>();

  const offen = [...new Set(texte.filter(brauchbar))];
  if (offen.length === 0) return ergebnis;

  // 1. Was schon im Arbeitsspeicher liegt.
  const fehlend: string[] = [];
  for (const text of offen) {
    const treffer = speicher.get(`${schluessel(text)}|${ziel}`);
    if (treffer !== undefined) ergebnis.set(text, treffer);
    else fehlend.push(text);
  }
  if (fehlend.length === 0) return ergebnis;

  // 2. Was in der Datenbank steht.
  const zuHash = new Map(fehlend.map((text) => [schluessel(text), text]));
  let ausDb: Array<{ hash: string; text: string }> = [];
  try {
    ausDb = await prisma.translation.findMany({
      where: { locale: ziel, hash: { in: [...zuHash.keys()] } },
      select: { hash: true, text: true },
    });
  } catch (fehler) {
    console.error("[uebersetzung] Zwischenspeicher nicht lesbar:", fehler);
  }

  for (const zeile of ausDb) {
    const original = zuHash.get(zeile.hash);
    if (!original) continue;
    ergebnis.set(original, zeile.text);
    speicher.set(`${zeile.hash}|${ziel}`, zeile.text);
    zuHash.delete(zeile.hash);
  }
  if (zuHash.size === 0) return ergebnis;

  // 3. Der Rest muss wirklich uebersetzt werden.
  if (Date.now() < pauseBis) return ergebnis;

  const rest = [...zuHash.values()];
  let frisch: Map<string, string>;
  try {
    frisch = await frageGoogle(rest, ziel);
    pauseBis = 0;
  } catch (fehler) {
    pauseBis = Date.now() + PAUSE_MS;
    console.error("[uebersetzung] Google nicht erreichbar, zeige Originaltexte:", fehler);
    return ergebnis;
  }

  for (const [original, uebersetzt] of frisch) {
    ergebnis.set(original, uebersetzt);
    speicher.set(`${schluessel(original)}|${ziel}`, uebersetzt);
  }

  /*
   * Der Zwischenspeicher ist eine Bequemlichkeit, kein Teil der Antwort:
   * Schlaegt das Schreiben fehl, wird beim naechsten Mal eben neu gefragt.
   *
   * `upsert` statt `createMany`, weil zwei Besucher gleichzeitig denselben
   * Text anfragen koennen - der zweite Schreibvorgang soll dann nicht am
   * Schluessel scheitern (und SQLite kann `skipDuplicates` ohnehin nicht).
   */
  for (const [source, text] of frisch) {
    try {
      const hash = schluessel(source);
      await prisma.translation.upsert({
        where: { hash_locale: { hash, locale: ziel } },
        create: { hash, locale: ziel, source, text },
        update: { text },
      });
    } catch (fehler) {
      console.error("[uebersetzung] Zwischenspeicher nicht schreibbar:", fehler);
    }
  }

  return ergebnis;
}

// ---------------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------------

/**
 * Ohne Schluessel laeuft es ueber den Endpunkt, den auch die Weboberflaeche
 * von Google Translate benutzt: kostenlos, ohne Anmeldung, aber ohne Zusage,
 * dass er morgen noch genauso antwortet. Fuer die Handvoll Saetze, die hier
 * anfallen (und die danach in der Datenbank liegen), reicht das.
 *
 * Liegt `GOOGLE_TRANSLATE_API_KEY` in der Umgebung, wird stattdessen die
 * offizielle Cloud Translation API benutzt - gleiche Uebersetzungen, aber mit
 * Vertrag, Kontingent und Rechnung.
 */
const GRATIS_ENDPUNKT = "https://translate.googleapis.com/translate_a/single";
const CLOUD_ENDPUNKT = "https://translation.googleapis.com/language/translate/v2";

/** Wirft, wenn Google nicht mitspielt - der Aufrufer legt dann die Pause ein. */
async function frageGoogle(texte: string[], ziel: string): Promise<Map<string, string>> {
  const schluesselAusUmgebung = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
  if (schluesselAusUmgebung) return cloudUebersetzung(texte, ziel, schluesselAusUmgebung);

  const ergebnis = new Map<string, string>();

  // Der Gratis-Endpunkt kann nur einen Text pro Anfrage. Ein paar davon
  // gleichzeitig, damit eine Seite mit zwanzig Laeden nicht zwanzig mal
  // nacheinander wartet.
  for (let i = 0; i < texte.length; i += GLEICHZEITIG) {
    const teil = texte.slice(i, i + GLEICHZEITIG);
    const antworten = await Promise.all(teil.map((text) => gratisUebersetzung(text, ziel)));
    teil.forEach((text, index) => {
      const uebersetzt = antworten[index];
      if (uebersetzt) ergebnis.set(text, uebersetzt);
    });
  }

  return ergebnis;
}

async function gratisUebersetzung(text: string, ziel: string): Promise<string | null> {
  const antwort = await fetch(`${GRATIS_ENDPUNKT}?client=gtx&sl=auto&tl=${encodeURIComponent(ziel)}&dt=t`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({ q: text }),
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });

  if (!antwort.ok) throw new Error(`translate_a antwortete mit ${antwort.status}`);

  /*
   * Die Antwort ist ein verschachteltes Array. Der erste Eintrag ist die
   * Liste der Satzstuecke, jedes Stueck `[uebersetzt, original, ...]` - lange
   * Texte kommen in mehreren Stuecken zurueck und werden hier wieder
   * zusammengesetzt.
   */
  const daten = (await antwort.json()) as unknown;
  const stuecke = Array.isArray(daten) && Array.isArray(daten[0]) ? (daten[0] as unknown[]) : [];
  const zusammen = stuecke
    .map((stueck) => (Array.isArray(stueck) && typeof stueck[0] === "string" ? stueck[0] : ""))
    .join("");

  return zusammen.trim().length > 0 ? zusammen : null;
}

async function cloudUebersetzung(texte: string[], ziel: string, apiSchluessel: string): Promise<Map<string, string>> {
  const ergebnis = new Map<string, string>();

  for (let i = 0; i < texte.length; i += BUENDEL) {
    const teil = texte.slice(i, i + BUENDEL);
    const antwort = await fetch(`${CLOUD_ENDPUNKT}?key=${encodeURIComponent(apiSchluessel)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Ohne `source` erkennt Google die Ausgangssprache selbst. Das ist hier
      // richtig so: Es schreiben auch Leute auf Englisch, und deren Text soll
      // nicht durch eine Uebersetzung "aus dem Deutschen" gedreht werden.
      body: JSON.stringify({ q: teil, target: ziel, format: "text" }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!antwort.ok) throw new Error(`Cloud Translation antwortete mit ${antwort.status}`);

    const daten = (await antwort.json()) as { data?: { translations?: Array<{ translatedText?: string }> } };
    const zeilen = daten.data?.translations ?? [];
    teil.forEach((text, index) => {
      const uebersetzt = zeilen[index]?.translatedText;
      if (typeof uebersetzt === "string" && uebersetzt.trim().length > 0) {
        ergebnis.set(text, entschaerfteZeichen(uebersetzt));
      }
    });
  }

  return ergebnis;
}

/**
 * Die offizielle API gibt auch bei `format: "text"` HTML-Entities zurueck
 * ("Steve&#39;s Laden"). Hier zurueckgedreht - React setzt den Text ohnehin
 * als Text, ein maskiertes Apostroph bliebe also sichtbar stehen.
 */
function entschaerfteZeichen(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// ---------------------------------------------------------------------------
// Fertige Helfer fuer die Seiten
// ---------------------------------------------------------------------------

/** Nimmt die Uebersetzung, wenn es eine gibt - sonst das Original. */
function ersetze(text: string | null, tabelle: Map<string, string>): string | null {
  if (!text) return text;
  return tabelle.get(text) ?? text;
}

/**
 * Shops fuer die Anzeige uebersetzen: Beschreibung, Warenliste und die
 * Kommentare unter den Bewertungen.
 *
 * Der Name des Ladens und die Namen der Spieler bleiben, wie sie sind.
 */
export async function uebersetzeShops(shops: ShopDTO[]): Promise<ShopDTO[]> {
  const ziel = await zielsprache();
  if (!ziel || shops.length === 0) return shops;

  const texte: string[] = [];
  for (const shop of shops) {
    if (shop.description) texte.push(shop.description);
    texte.push(...shop.sells);
    for (const bewertung of shop.bewertungen.letzte) {
      if (bewertung.comment) texte.push(bewertung.comment);
    }
  }

  const tabelle = await uebersetzeTexte(texte, ziel);
  if (tabelle.size === 0) return shops;

  return shops.map((shop) => ({
    ...shop,
    description: ersetze(shop.description, tabelle),
    sells: shop.sells.map((ware) => tabelle.get(ware) ?? ware),
    bewertungen: {
      ...shop.bewertungen,
      letzte: shop.bewertungen.letzte.map((bewertung) => ({
        ...bewertung,
        comment: ersetze(bewertung.comment, tabelle),
      })),
    },
  }));
}

/** Vorschlaege fuer die Anzeige uebersetzen: Titel und Text. */
export async function uebersetzeVorschlaege(vorschlaege: SuggestionDTO[]): Promise<SuggestionDTO[]> {
  const ziel = await zielsprache();
  if (!ziel || vorschlaege.length === 0) return vorschlaege;

  const tabelle = await uebersetzeTexte(
    vorschlaege.flatMap((eintrag) => [eintrag.title, eintrag.body]),
    ziel,
  );
  if (tabelle.size === 0) return vorschlaege;

  return vorschlaege.map((eintrag) => ({
    ...eintrag,
    title: tabelle.get(eintrag.title) ?? eintrag.title,
    body: tabelle.get(eintrag.body) ?? eintrag.body,
  }));
}

/**
 * Kopfgelder fuer die Anzeige uebersetzen: nur die Begruendung.
 *
 * Die Todesmeldung darunter kommt so aus dem Spiel und bleibt unangetastet -
 * sie soll mit dem uebereinstimmen, was im Chat stand.
 */
export async function uebersetzeKopfgelder(zeilen: KopfgeldZeile[]): Promise<KopfgeldZeile[]> {
  const ziel = await zielsprache();
  if (!ziel || zeilen.length === 0) return zeilen;

  const gruende = zeilen.map((zeile) => zeile.reason).filter((grund): grund is string => Boolean(grund));
  if (gruende.length === 0) return zeilen;

  const tabelle = await uebersetzeTexte(gruende, ziel);
  if (tabelle.size === 0) return zeilen;

  return zeilen.map((zeile) => ({ ...zeile, reason: ersetze(zeile.reason, tabelle) }));
}

/**
 * Fuer die Seiten: Steht auf dieser Sprachfassung ueberhaupt Uebersetztes?
 * Nur dann lohnt der Hinweis "automatisch uebersetzt" unter der Liste.
 */
export async function zeigtUebersetzung(): Promise<boolean> {
  return (await zielsprache()) !== null;
}
