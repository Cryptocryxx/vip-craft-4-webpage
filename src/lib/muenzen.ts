import "server-only";
import { unstable_rethrow } from "next/navigation";
import { craftyConfigured, craftyDownloadFile, craftyListDirectory } from "@/lib/crafty";
import { alsCompound, alsListe, alsText, alsZahl, leseNbt, uuidAusNbt, type NbtCompound, type NbtWert } from "@/lib/nbt";

/**
 * Das Bargeld: Numismatics-Münzen, die nicht auf der Bank liegen, sondern in
 * den Taschen der Spieler.
 *
 * Gelesen wird dasselbe wie beim Inventar im Kontrollraum (siehe inventar.ts),
 * nur ohne Anzeige: `world/playerdata/<uuid>.dat` für Inventar, Endertruhe und
 * Curios-Slots, dazu `world/data/sophisticatedbackpacks.dat` für die Rucksäcke.
 * Münzen in Shulkerkisten und Bündeln zählen mit, weil die Komponenten
 * `minecraft:container` und `minecraft:bundle_contents` mitgelesen werden.
 *
 * NICHT enthalten: Münzen in Truhen, Fässern und Vitrinen irgendwo in der
 * Welt. Die stehen in den Regionsdateien, und die sind zusammen mehrere
 * Gigabyte groß – das wäre für eine Webseite nicht zu bezahlen. Auf der Seite
 * steht deshalb ausdrücklich „in den Taschen", nicht „im Umlauf".
 */

/** Die sechs Münzen mit ihrem Wert in Spurs (Coin.java aus Numismatics). */
export const MUENZ_WERT: Record<string, number> = {
  "numismatics:spur": 1,
  "numismatics:bevel": 8,
  "numismatics:sprocket": 16,
  "numismatics:cog": 64,
  "numismatics:crown": 512,
  "numismatics:sun": 4096,
};

/** Bankkarte, die fest auf ein Konto gebucht ist – verrät die Zugehörigkeit. */
const KARTEN_KONTO = "numismatics:card_account_id";

/** Rucksack im Rucksack im Rucksack … irgendwann ist Schluss. */
const MAX_TIEFE = 6;

const RUCKSACK_DATEI = "world/data/sophisticatedbackpacks.dat";

/** Wie viele Spielerdateien gleichzeitig geladen werden. */
const GLEICHZEITIG = 6;

export type BargeldErgebnis = {
  /** UUID (klein, mit Bindestrichen) → Münzwert in Spurs. */
  proSpieler: Map<string, number>;
  /** UUID des Spielers → UUIDs der Konten, für die er eine Karte trägt. */
  kartenProSpieler: Map<string, Set<string>>;
  /** Wie viele Spielerdateien gelesen wurden. 0 heißt: nichts gefunden. */
  gelesen: number;
  /** Ob überhaupt gelesen werden konnte. Sonst fehlt das Bargeld in den Summen. */
  ok: boolean;
};

const leer: BargeldErgebnis = { proSpieler: new Map(), kartenProSpieler: new Map(), gelesen: 0, ok: false };

export async function leseBargeld(): Promise<BargeldErgebnis> {
  if (!craftyConfigured) return leer;

  let dateien: string[];
  try {
    dateien = (await craftyListDirectory("world/playerdata"))
      .filter((eintrag) => eintrag.name.endsWith(".dat"))
      .map((eintrag) => eintrag.name);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[muenzen] world/playerdata nicht lesbar:", error);
    return leer;
  }

  const rucksaecke = await leseRucksaecke();

  const proSpieler = new Map<string, number>();
  const kartenProSpieler = new Map<string, Set<string>>();
  let gelesen = 0;

  // Der Reihe nach in kleinen Gruppen: 35 Dateien à ~220 KB sind zusammen
  // knapp 8 MB, alle auf einmal würde Crafty unnötig belasten.
  for (let i = 0; i < dateien.length; i += GLEICHZEITIG) {
    const gruppe = dateien.slice(i, i + GLEICHZEITIG);
    const ergebnisse = await Promise.all(gruppe.map((datei) => leseSpieler(datei, rucksaecke)));
    for (const ergebnis of ergebnisse) {
      if (!ergebnis) continue;
      gelesen += 1;
      if (ergebnis.spurs > 0) proSpieler.set(ergebnis.uuid, ergebnis.spurs);
      if (ergebnis.karten.size > 0) kartenProSpieler.set(ergebnis.uuid, ergebnis.karten);
    }
  }

  return { proSpieler, kartenProSpieler, gelesen, ok: gelesen > 0 };
}

async function leseRucksaecke(): Promise<Map<string, NbtCompound>> {
  const inhalte = new Map<string, NbtCompound>();
  try {
    const datei = leseNbt(await craftyDownloadFile(RUCKSACK_DATEI));
    for (const eintrag of alsListe(alsCompound(datei.data)?.backpackContents)) {
      const roh = alsCompound(eintrag);
      const kennung = uuidAusNbt(roh?.uuid);
      const inhalt = alsCompound(roh?.contents);
      if (kennung && inhalt) inhalte.set(kennung, inhalt);
    }
  } catch (error) {
    unstable_rethrow(error);
    // Folgenlos: Dann fehlt eben das Geld in den Rucksäcken.
    console.error("[muenzen] Rucksack-Datei nicht lesbar:", error);
  }
  return inhalte;
}

type SpielerFund = { uuid: string; spurs: number; karten: Set<string> };

async function leseSpieler(datei: string, rucksaecke: Map<string, NbtCompound>): Promise<SpielerFund | null> {
  const uuid = datei.replace(/\.dat$/, "").toLowerCase();
  let spieler: NbtCompound;
  try {
    spieler = leseNbt(await craftyDownloadFile(`world/playerdata/${datei}`));
  } catch (error) {
    unstable_rethrow(error);
    console.error(`[muenzen] ${datei} nicht lesbar:`, error);
    return null;
  }

  const fund: SpielerFund = { uuid, spurs: 0, karten: new Set() };
  const gesehen = new Set<string>();

  const zaehle = (roh: NbtCompound, tiefe: number): void => {
    const id = alsText(roh.id);
    if (!id || id === "minecraft:air") return;

    const anzahl = alsZahl(roh.count) ?? alsZahl(roh.Count) ?? 1;
    const komponenten = alsCompound(roh.components) ?? {};

    const wert = MUENZ_WERT[id];
    if (wert) fund.spurs += wert * anzahl;

    const konto = uuidAusNbt(komponenten[KARTEN_KONTO]);
    if (konto) fund.karten.add(konto);

    if (tiefe >= MAX_TIEFE) return;

    // Shulkerkisten: [{ slot, item }], Bündel: [item, …]
    for (const eintrag of alsListe(komponenten["minecraft:container"])) {
      const kind = alsCompound(alsCompound(eintrag)?.item);
      if (kind) zaehle(kind, tiefe + 1);
    }
    for (const eintrag of alsListe(komponenten["minecraft:bundle_contents"])) {
      const kind = alsCompound(eintrag);
      if (kind) zaehle(kind, tiefe + 1);
    }

    const rucksack = uuidAusNbt(komponenten["sophisticatedcore:storage_uuid"]);
    if (rucksack && !gesehen.has(rucksack)) {
      gesehen.add(rucksack);
      const inhalt = rucksaecke.get(rucksack);
      for (const eintrag of itemListe(alsCompound(inhalt?.inventory)?.Items)) zaehle(eintrag, tiefe + 1);
    }
  };

  for (const eintrag of itemListe(spieler.Inventory)) zaehle(eintrag, 0);
  for (const eintrag of itemListe(spieler.EnderItems)) zaehle(eintrag, 0);

  const curios = alsCompound(alsCompound(spieler["neoforge:attachments"])?.["curios:inventory"]);
  for (const eintrag of alsListe(curios?.Curios)) {
    const handler = alsCompound(alsCompound(eintrag)?.StacksHandler);
    for (const item of itemListe(alsCompound(handler?.Stacks)?.Items)) zaehle(item, 0);
  }

  return fund;
}

function itemListe(wert: NbtWert | undefined): NbtCompound[] {
  return alsListe(wert)
    .map((eintrag) => alsCompound(eintrag))
    .filter((eintrag): eintrag is NbtCompound => eintrag !== null);
}
