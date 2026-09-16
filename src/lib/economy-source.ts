import { unstable_rethrow } from "next/navigation";
import "server-only";
import { craftyConfigured, craftyDownloadFile, craftyListDirectory, craftyReadJson } from "@/lib/crafty";
import {
  emptyEconomyOverview,
  type EconomyOverview,
  type Organisation,
  type Unterkonto,
  type Vermoegen,
} from "@/lib/economy-types";
import { buildUuidToName, type UserCacheEntry } from "@/lib/minecraft-stats";
import { leseBargeld, type BargeldErgebnis } from "@/lib/muenzen";
import { alsCompound, alsListe, alsText, alsZahl, leseNbt, uuidAusNbt, type NbtCompound } from "@/lib/nbt";

/**
 * Die Wirtschaft des Servers: Bankkonten, Organisationen und Bargeld.
 *
 * ERSTE QUELLE ist `world/data/numismatics_bank.dat` – die Datei, in die
 * Numismatics seine Bank schreibt. Sie enthält alles, was die Mod überhaupt
 * speichert: Kontostand, Kontoart, Name des Kontos, die Vertrauensliste eines
 * Blaze-Banker-Kontos und dessen Unterkonten (ausgegebene Bankkarten mit
 * Limit). Gelesen wird sie binär über den Crafty-Download (siehe crafty.ts),
 * weil Craftys Textzugriff an gzip-Daten scheitert.
 *
 * ZWEITE QUELLE, nur als Rückfall, ist `kubejs/data/numismatics.json` aus
 * server_scripts/numismatics-export.js. Darin stehen nur Kontostände, keine
 * Mitglieder – reicht, damit die Seite nicht leer ist, wenn die Bankdatei
 * einmal nicht lesbar sein sollte.
 *
 * WAS ES NICHT GIBT: Numismatics führt kein Buch über einzelne Zahlungen.
 * Weder Konto noch Bank speichern, wer wann wem etwas überwiesen hat – es
 * gibt nur den aktuellen Stand. Eine Historie könnte nur entstehen, wenn wir
 * ab sofort selbst mitschreiben.
 *
 * AKTUALITÄT: Die Datei wird beim Weltspeichern geschrieben, also im
 * Autosave-Takt. Der Stand steht deshalb auf der Seite mit dabei.
 */

const BANK_DATEI = "world/data/numismatics_bank.dat";

/** Kontostände ändern sich oft genug, um sie regelmäßig neu zu holen. */
const BANK_TTL_MS = 5 * 60_000;
/** Münzen in Taschen ändern sich selten und kosten 35 Dateien – seltener nachsehen. */
const BARGELD_TTL_MS = 15 * 60_000;

export type EconomyResult = {
  overview: EconomyOverview;
  /** "live" = echte Daten vom Server, "unavailable" = nichts lesbar. */
  source: "live" | "unavailable";
};

const unavailable: EconomyResult = { overview: emptyEconomyOverview, source: "unavailable" };

// ---------------------------------------------------------------------------
// Rohdaten
// ---------------------------------------------------------------------------

type Konto = {
  id: string;
  organisation: boolean;
  spurs: number;
  label: string | null;
  /** UUIDs der Vertrauensliste, ohne Doppelte. */
  vertraute: string[];
  unterkonten: Unterkonto[];
};

const ZUGRIFF: Record<string, string> = {
  TRUSTED_PLAYERS: "Nur Vertraute",
  TRUSTED_AUTOMATION: "Vertraute und ihre Automatik",
  ANYBODY: "Alle mit der Kennung",
};

/** Ein Konto aus der Bankdatei: balance, AccountType, id, Label, TrustList, SubAccounts. */
function zuKonto(roh: NbtCompound): Konto | null {
  const id = uuidAusNbt(roh.id);
  if (!id) return null;

  // additionalBalance steht nur da, wenn der Kontostand über die int-Grenze
  // hinausgewachsen ist – bei uns nie, aber sonst fehlte genau das Vermögen.
  const spurs = (alsZahl(roh.balance) ?? 0) + (alsZahl(roh.additionalBalance) ?? 0);

  const vertraute: string[] = [];
  for (const eintrag of alsListe(roh.TrustList)) {
    // Numismatics dedupliziert nicht: Wer zweimal eingetragen wurde, steht
    // zweimal drin. Für „Mitglieder" zählt jeder trotzdem nur einmal.
    const uuid = uuidAusNbt(alsCompound(eintrag)?.UUID);
    if (uuid && !vertraute.includes(uuid)) vertraute.push(uuid);
  }

  const unterkonten: Unterkonto[] = [];
  for (const eintrag of alsListe(roh.SubAccounts)) {
    const unter = alsCompound(eintrag);
    if (!unter) continue;
    const grenze = alsCompound(unter.TotalLimit);
    unterkonten.push({
      name: alsText(unter.label) || "Ohne Namen",
      zugriff: ZUGRIFF[alsText(unter.authorizationType) ?? ""] ?? "Nur Vertraute",
      // "limit" fehlt, wenn keine Grenze gesetzt ist (Limit.java).
      limitSpurs: alsZahl(grenze?.limit),
      ausgegebenSpurs: alsZahl(grenze?.spent) ?? 0,
    });
  }

  return {
    id,
    organisation: alsText(roh.AccountType) === "BLAZE_BANKER",
    spurs,
    label: alsText(roh.Label),
    vertraute,
    unterkonten,
  };
}

type BankStand = { konten: Konto[]; stand: string | null; herkunft: "bankdatei" | "export" };

async function leseBankdatei(): Promise<BankStand | null> {
  try {
    const [roh, verzeichnis] = await Promise.all([
      craftyDownloadFile(BANK_DATEI),
      craftyListDirectory("world/data").catch(() => []),
    ]);
    const datei = leseNbt(roh);
    const liste = alsListe(alsCompound(datei.data)?.Accounts);
    if (liste.length === 0) return null;

    const konten: Konto[] = [];
    for (const eintrag of liste) {
      const compound = alsCompound(eintrag);
      const konto = compound ? zuKonto(compound) : null;
      if (konto) konten.push(konto);
    }
    if (konten.length === 0) return null;

    return { konten, stand: geaendert(verzeichnis.find((e) => e.name.endsWith("numismatics_bank.dat"))?.modified), herkunft: "bankdatei" };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[economy] Bankdatei nicht lesbar:", error);
    return null;
  }
}

type ExportKonto = { id: string; type: string; balanceSpurs: number; label?: string | null };
type NumismaticsExport = { generatedAt?: string; stage?: string; accounts?: ExportKonto[] };

/** Rückfall: der KubeJS-Export. Nur Kontostände, keine Mitglieder. */
async function leseExport(): Promise<BankStand | null> {
  try {
    const datei = await craftyReadJson<NumismaticsExport>("kubejs/data/numismatics.json");
    if (!datei || datei.stage !== "ok" || !Array.isArray(datei.accounts)) return null;

    const konten = datei.accounts.map<Konto>((konto) => ({
      id: konto.id.toLowerCase(),
      organisation: konto.type === "BLAZE_BANKER",
      spurs: konto.balanceSpurs || 0,
      label: konto.label ?? null,
      vertraute: [],
      unterkonten: [],
    }));
    return { konten, stand: null, herkunft: "export" };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[economy] Kontenexport nicht lesbar:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Zusammenbauen
// ---------------------------------------------------------------------------

function baueUebersicht(bank: BankStand, bargeld: BargeldErgebnis, uuidZuName: Map<string, string>): EconomyOverview {
  const name = (uuid: string) => uuidZuName.get(uuid.toLowerCase()) ?? uuid.slice(0, 8);

  // Welcher Spieler trägt eine Karte für welches Konto?
  const kartenProKonto = new Map<string, string[]>();
  for (const [spieler, konten] of bargeld.kartenProSpieler) {
    for (const konto of konten) {
      const liste = kartenProKonto.get(konto) ?? [];
      liste.push(spieler);
      kartenProKonto.set(konto, liste);
    }
  }

  const organisationen: Organisation[] = [];
  /** UUID des Spielers → seine Anteile, damit die Rangliste sie mitzählen kann. */
  const anteile = new Map<string, { spurs: number; namen: string[] }>();

  for (const konto of bank.konten) {
    if (!konto.organisation) continue;

    const anzeigename = konto.label?.trim() || `Konto ${konto.id.slice(0, 8)}`;
    const anteilSpurs = konto.vertraute.length > 0 ? Math.floor(konto.spurs / konto.vertraute.length) : 0;

    for (const mitglied of konto.vertraute) {
      const bisher = anteile.get(mitglied) ?? { spurs: 0, namen: [] };
      bisher.spurs += anteilSpurs;
      bisher.namen.push(anzeigename);
      anteile.set(mitglied, bisher);
    }

    const traeger = (kartenProKonto.get(konto.id) ?? []).filter((uuid) => !konto.vertraute.includes(uuid));

    organisationen.push({
      id: konto.id,
      name: anzeigename,
      balanceSpurs: konto.spurs,
      mitglieder: konto.vertraute.map(name).sort((a, b) => a.localeCompare(b, "de")),
      anteilSpurs,
      kartentraeger: traeger.map(name).sort((a, b) => a.localeCompare(b, "de")),
      unterkonten: konto.unterkonten,
    });
  }
  organisationen.sort((a, b) => b.balanceSpurs - a.balanceSpurs);

  // Jeder, der ein persönliches Konto, Bargeld oder einen Anteil hat.
  const spieler = new Map<string, Vermoegen>();
  const nimm = (uuid: string): Vermoegen => {
    const schluessel = uuid.toLowerCase();
    const vorhanden = spieler.get(schluessel);
    if (vorhanden) return vorhanden;
    const neu: Vermoegen = {
      rank: 0,
      player: name(schluessel),
      balanceSpurs: 0,
      bargeldSpurs: 0,
      anteilSpurs: 0,
      gesamtSpurs: 0,
      organisationen: [],
    };
    spieler.set(schluessel, neu);
    return neu;
  };

  for (const konto of bank.konten) {
    if (konto.organisation) continue;
    nimm(konto.id).balanceSpurs = konto.spurs;
  }
  for (const [uuid, spurs] of bargeld.proSpieler) nimm(uuid).bargeldSpurs = spurs;
  for (const [uuid, anteil] of anteile) {
    const zeile = nimm(uuid);
    zeile.anteilSpurs = anteil.spurs;
    zeile.organisationen = anteil.namen;
  }

  // Vollstaendig und sortiert: Die Seiten schneiden sich heraus, was sie
  // brauchen, und die Spielerseite findet ihre eigene Zeile darin wieder.
  const vermoegen = [...spieler.values()]
    .map((zeile) => ({ ...zeile, gesamtSpurs: zeile.balanceSpurs + zeile.bargeldSpurs + zeile.anteilSpurs }))
    .filter((zeile) => zeile.gesamtSpurs > 0)
    .sort((a, b) => b.gesamtSpurs - a.gesamtSpurs)
    .map((zeile, index) => ({ ...zeile, rank: index + 1 }));

  const bankSpurs = bank.konten.reduce((summe, konto) => summe + konto.spurs, 0);
  const organisationSpurs = bank.konten.reduce((summe, konto) => summe + (konto.organisation ? konto.spurs : 0), 0);
  const bargeldSpurs = [...bargeld.proSpieler.values()].reduce((summe, spurs) => summe + spurs, 0);

  return {
    summary: {
      totalCirculationSpurs: bankSpurs + bargeldSpurs,
      bankSpurs,
      bargeldSpurs,
      organisationSpurs,
      accountCount: bank.konten.length,
      organisationCount: organisationen.length,
    },
    vermoegen,
    organisationen,
    herkunft: bank.herkunft,
    bargeldGezaehlt: bargeld.ok,
    stand: bank.stand,
  };
}

/** "2026/09/16 14:46" → "16.09. 14:46" – es ist bereits Serverzeit. */
function geaendert(roh: string | undefined): string | null {
  const teile = roh ? /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}:\d{2})/.exec(roh) : null;
  return teile ? `${teile[3]}.${teile[2]}. ${teile[4]}` : (roh ?? null);
}

// ---------------------------------------------------------------------------
// Zwischenspeicher
// ---------------------------------------------------------------------------

type Speicher<T> = { wert: T; geholt: number };

let bankSpeicher: Speicher<BankStand | null> | null = null;
let bargeldSpeicher: Speicher<BargeldErgebnis> | null = null;
let ergebnisSpeicher: Speicher<EconomyResult> | null = null;
/** Läuft gerade ein Abruf, warten weitere Anfragen darauf, statt ihn zu wiederholen. */
let laufend: Promise<EconomyResult> | null = null;

function frisch<T>(speicher: Speicher<T> | null, ttl: number): speicher is Speicher<T> {
  return speicher !== null && Date.now() - speicher.geholt < ttl;
}

/** Wirtschaftsdaten, gebündelt und zwischengespeichert. */
export async function getEconomyData(): Promise<EconomyResult> {
  if (!craftyConfigured) return unavailable;
  if (frisch(ergebnisSpeicher, BANK_TTL_MS)) return ergebnisSpeicher.wert;
  if (laufend) return laufend;

  laufend = holeAlles().finally(() => {
    laufend = null;
  });
  return laufend;
}

async function holeAlles(): Promise<EconomyResult> {
  try {
    const [bank, bargeld, userCache] = await Promise.all([
      holeBank(),
      holeBargeld(),
      craftyReadJson<UserCacheEntry[]>("usercache.json").catch(() => null),
    ]);

    if (!bank) {
      const ergebnis = ergebnisSpeicher?.wert ?? unavailable;
      ergebnisSpeicher = { wert: ergebnis, geholt: Date.now() };
      return ergebnis;
    }

    const uuidZuName = buildUuidToName(Array.isArray(userCache) ? userCache : []);
    const ergebnis: EconomyResult = { overview: baueUebersicht(bank, bargeld, uuidZuName), source: "live" };
    ergebnisSpeicher = { wert: ergebnis, geholt: Date.now() };
    return ergebnis;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[economy] Wirtschaftsdaten nicht ladbar:", error);
    return ergebnisSpeicher?.wert ?? unavailable;
  }
}

async function holeBank(): Promise<BankStand | null> {
  if (frisch(bankSpeicher, BANK_TTL_MS)) return bankSpeicher.wert;
  const wert = (await leseBankdatei()) ?? (await leseExport());
  bankSpeicher = { wert, geholt: Date.now() };
  return wert;
}

async function holeBargeld(): Promise<BargeldErgebnis> {
  if (frisch(bargeldSpeicher, BARGELD_TTL_MS)) return bargeldSpeicher.wert;
  const wert = await leseBargeld();
  // Ein Fehlschlag darf nicht dazu führen, dass gleich der nächste Aufruf
  // wieder 35 Dateien zieht – auch der leere Stand wird gespeichert.
  bargeldSpeicher = { wert, geholt: Date.now() };
  return wert;
}

/**
 * Die Vermögenszeile eines Spielers samt seiner Organisationen – für die
 * Spielerseite, die nur ihre eigene Zeile braucht.
 */
export async function vermoegenFuer(name: string): Promise<{ zeile: Vermoegen | null; organisationen: Organisation[] }> {
  const { overview, source } = await getEconomyData();
  if (source !== "live") return { zeile: null, organisationen: [] };

  const gesucht = name.toLowerCase();
  return {
    zeile: overview.vermoegen.find((eintrag) => eintrag.player.toLowerCase() === gesucht) ?? null,
    organisationen: overview.organisationen.filter((organisation) =>
      organisation.mitglieder.some((mitglied) => mitglied.toLowerCase() === gesucht),
    ),
  };
}
