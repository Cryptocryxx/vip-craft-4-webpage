import "server-only";
import { unstable_rethrow } from "next/navigation";
import { craftyDownloadFile, craftyListDirectory, type CraftyDirectoryEntry } from "@/lib/crafty";
import {
  nameAusId,
  type InventarBereich,
  type InventarItem,
  type InventarSlot,
  type SpielerInventar,
} from "@/lib/inventar-types";
import { alsCompound, alsListe, alsText, alsZahl, leseNbt, uuidAusNbt, type NbtCompound, type NbtWert } from "@/lib/nbt";
import { findPlayer } from "@/lib/players";

/**
 * Das Inventar eines Spielers, gelesen aus den Weltdaten.
 *
 * Quellen, alle über den Crafty-Download (Binärdateien, siehe crafty.ts):
 *   world/playerdata/<uuid>.dat          Inventar, Rüstung, Nebenhand,
 *                                        Endertruhe, Curios (als Attachment)
 *   world/playerdata/<uuid>.cosarmor     Cosmetic Armor Reworked
 *   world/data/sophisticatedbackpacks.dat  Inhalt ALLER Rucksäcke, nach Kennung
 *
 * AKTUALITÄT: Minecraft schreibt diese Dateien beim Autosave und beim
 * Ausloggen. Bei jemandem, der gerade spielt, ist die Ansicht also bis zu ein
 * paar Minuten alt – deshalb steht der Stand mit dabei. Wer etwas entnimmt,
 * verlässt sich nicht auf diese Ansicht: Das Spielskript prüft vor jeder
 * Entnahme live, ob im Slot noch dasselbe Item liegt (siehe inventory.js).
 *
 * Nur für Admins. Die Wache sitzt in der Server-Action, nicht hier.
 */

const RUCKSACK_DATEI = "world/data/sophisticatedbackpacks.dat";

/** Rucksäcke in Rucksäcken (Inception-Upgrade) – so tief wird nachgesehen. */
const MAX_RUCKSACK_TIEFE = 4;
/** Shulkerkisten in Bündeln in Shulkerkisten … irgendwann ist Schluss. */
const MAX_INHALT_TIEFE = 2;

const RUESTUNG: Record<number, { label: string; reihenfolge: number }> = {
  103: { label: "Kopf", reihenfolge: 0 },
  102: { label: "Brust", reihenfolge: 1 },
  101: { label: "Beine", reihenfolge: 2 },
  100: { label: "Füße", reihenfolge: 3 },
  [-106]: { label: "Nebenhand", reihenfolge: 4 },
};

/** Die gängigen Curios-Slots auf Deutsch; unbekannte werden aus der Kennung abgeleitet. */
const CURIOS_NAMEN: Record<string, string> = {
  back: "Rücken",
  head: "Kopf",
  necklace: "Halskette",
  ring: "Ring",
  belt: "Gürtel",
  hands: "Hände",
  charm: "Talisman",
  bracelet: "Armband",
  body: "Körper",
  feet: "Füße",
  curio: "Curio",
};

const ROEMISCH = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export type InventarErgebnis = { ok: true; inventar: SpielerInventar } | { ok: false; fehler: string };

export async function ladeInventar(name: string): Promise<InventarErgebnis> {
  const profil = await findPlayer(name);
  if (!profil?.uuid) {
    return { ok: false, fehler: `Zu ${name} ist keine UUID bekannt – war dieser Spieler schon einmal auf dem Server?` };
  }
  const uuid = profil.uuid.toLowerCase();

  const [spielerRoh, rucksackRoh, kosmetikRoh, spielerVerzeichnis, datenVerzeichnis] = await Promise.all([
    vielleicht(craftyDownloadFile(`world/playerdata/${uuid}.dat`), "Spielerdatei"),
    vielleicht(craftyDownloadFile(RUCKSACK_DATEI), "Rucksack-Datei"),
    // Fehlt bei allen, die Cosmetic Armor nie geöffnet haben – kein Fehler.
    vielleicht(craftyDownloadFile(`world/playerdata/${uuid}.cosarmor`), null),
    vielleicht(craftyListDirectory("world/playerdata"), null),
    vielleicht(craftyListDirectory("world/data"), null),
  ]);

  if (!spielerRoh) {
    return { ok: false, fehler: `Die Spielerdatei von ${profil.name} ist nicht lesbar. Liegt sie unter world/playerdata/${uuid}.dat?` };
  }

  let spieler: NbtCompound;
  try {
    spieler = leseNbt(spielerRoh);
  } catch (error) {
    return { ok: false, fehler: `Die Spielerdatei von ${profil.name} ließ sich nicht lesen: ${fehlertext(error)}` };
  }

  const hinweise: string[] = [];
  const bereiche: InventarBereich[] = [...inventarBereiche(spieler), ...curiosBereich(spieler)];

  if (kosmetikRoh) {
    try {
      const bereich = kosmetikBereich(leseNbt(kosmetikRoh));
      if (bereich) bereiche.push(bereich);
    } catch (error) {
      hinweise.push(`Die Kosmetik-Rüstung ließ sich nicht lesen: ${fehlertext(error)}`);
    }
  }

  let rucksackInhalte = new Map<string, NbtCompound>();
  if (rucksackRoh) {
    try {
      rucksackInhalte = leseRucksackInhalte(leseNbt(rucksackRoh));
    } catch (error) {
      hinweise.push(`Die Rucksack-Datei ließ sich nicht lesen: ${fehlertext(error)}`);
    }
  } else {
    hinweise.push("Die Rucksack-Datei ist nicht lesbar – Rucksäcke erscheinen ohne Inhalt.");
  }
  bereiche.push(...rucksackBereiche(bereiche, rucksackInhalte, hinweise));

  return {
    ok: true,
    inventar: {
      name: profil.name,
      uuid,
      online: profil.online,
      standSpieler: geaendert(spielerVerzeichnis, `${uuid}.dat`),
      standRucksaecke: geaendert(datenVerzeichnis, "sophisticatedbackpacks.dat"),
      bereiche,
      hinweise,
    },
  };
}

// ---------------------------------------------------------------------------
// Bereiche
// ---------------------------------------------------------------------------

type SlotMitNummer = InventarSlot & { nr: number };

function ohneNummer(slots: SlotMitNummer[]): InventarSlot[] {
  return slots.sort((a, b) => a.nr - b.nr).map((slot) => ({ ort: slot.ort, label: slot.label, item: slot.item }));
}

/**
 * Vanilla-Inventar. In der Datei stehen die Plätze mit eigenen Nummern
 * (100–103 Rüstung, -106 Nebenhand); das Spielskript adressiert dagegen den
 * Container, in dem Rüstung auf 36–39 und die Nebenhand auf 40 liegt.
 */
function inventarBereiche(spieler: NbtCompound): InventarBereich[] {
  const ausruestung: SlotMitNummer[] = [];
  const hotbar: SlotMitNummer[] = [];
  const haupt: SlotMitNummer[] = [];

  for (const eintrag of alsListe(spieler.Inventory)) {
    const roh = alsCompound(eintrag);
    const slot = alsZahl(roh?.Slot);
    const item = roh ? zuItem(roh) : null;
    if (slot === null || !item) continue;

    if (slot >= 0 && slot <= 8) {
      hotbar.push({ nr: slot, ort: `inv:${slot}`, label: `Hotbar ${slot + 1}`, item });
    } else if (slot >= 9 && slot <= 35) {
      haupt.push({ nr: slot, ort: `inv:${slot}`, label: `Platz ${slot - 8}`, item });
    } else if (RUESTUNG[slot]) {
      const containerIndex = slot === -106 ? 40 : 36 + (slot - 100);
      ausruestung.push({ nr: RUESTUNG[slot].reihenfolge, ort: `inv:${containerIndex}`, label: RUESTUNG[slot].label, item });
    }
  }

  const ender: SlotMitNummer[] = [];
  for (const eintrag of alsListe(spieler.EnderItems)) {
    const roh = alsCompound(eintrag);
    const slot = alsZahl(roh?.Slot);
    const item = roh ? zuItem(roh) : null;
    if (slot === null || !item || slot < 0 || slot > 26) continue;
    ender.push({ nr: slot, ort: `ender:${slot}`, label: `Platz ${slot + 1}`, item });
  }

  return [
    { schluessel: "ausruestung", titel: "Ausrüstung", untertitel: "Rüstung und Nebenhand", plaetze: 5, slots: ohneNummer(ausruestung) },
    { schluessel: "hotbar", titel: "Hotbar", untertitel: null, plaetze: 9, slots: ohneNummer(hotbar) },
    { schluessel: "inventar", titel: "Inventar", untertitel: null, plaetze: 27, slots: ohneNummer(haupt) },
    { schluessel: "ender", titel: "Endertruhe", untertitel: null, plaetze: 27, slots: ohneNummer(ender) },
  ];
}

/**
 * Curios steht als Attachment in der Spielerdatei:
 *   neoforge:attachments → curios:inventory → Curios[] { Identifier, StacksHandler { Stacks, Cosmetics } }
 */
function curiosBereich(spieler: NbtCompound): InventarBereich[] {
  const curios = alsCompound(alsCompound(spieler["neoforge:attachments"])?.["curios:inventory"]);
  if (!curios) return [];

  const slots: SlotMitNummer[] = [];
  let plaetze = 0;
  let reihe = 0;

  for (const eintrag of alsListe(curios.Curios)) {
    const roh = alsCompound(eintrag);
    const kennung = alsText(roh?.Identifier);
    const handler = alsCompound(roh?.StacksHandler);
    if (!kennung || !handler || !/^[a-z0-9_]{1,40}$/.test(kennung)) continue;

    const anzeige = CURIOS_NAMEN[kennung] ?? nameAusId(kennung);
    const teile = [
      { schluessel: "Stacks", praefix: "curios", zusatz: "" },
      { schluessel: "Cosmetics", praefix: "curioskos", zusatz: " (kosmetisch)" },
    ];
    for (const teil of teile) {
      const stacks = alsCompound(handler[teil.schluessel]);
      const groesse = alsZahl(stacks?.Size) ?? 0;
      if (teil.praefix === "curios") plaetze += groesse;

      for (const itemEintrag of alsListe(stacks?.Items)) {
        const itemRoh = alsCompound(itemEintrag);
        const slot = alsZahl(itemRoh?.Slot);
        const item = itemRoh ? zuItem(itemRoh) : null;
        if (slot === null || !item) continue;
        const nummer = groesse > 1 ? ` ${slot + 1}` : "";
        slots.push({
          nr: reihe * 1000 + (teil.praefix === "curios" ? 0 : 500) + slot,
          ort: `${teil.praefix}:${kennung}:${slot}`,
          label: `${anzeige}${nummer}${teil.zusatz}`,
          item,
        });
      }
    }
    reihe += 1;
  }

  return [{ schluessel: "curios", titel: "Curios-Slots", untertitel: null, plaetze, slots: ohneNummer(slots) }];
}

/** Cosmetic Armor Reworked: eigene Datei, Aufbau wie ein ItemStackHandler. */
function kosmetikBereich(datei: NbtCompound): InventarBereich | null {
  const slots: SlotMitNummer[] = [];
  for (const eintrag of alsListe(datei.Items)) {
    const roh = alsCompound(eintrag);
    const slot = alsZahl(roh?.Slot);
    const item = roh ? zuItem(roh) : null;
    if (slot === null || !item) continue;
    slots.push({ nr: slot, ort: `kosmetik:${slot}`, label: `Platz ${slot + 1}`, item });
  }
  return {
    schluessel: "kosmetik",
    titel: "Kosmetik-Rüstung",
    untertitel: "Cosmetic Armor Reworked",
    plaetze: alsZahl(datei.Size),
    slots: ohneNummer(slots),
  };
}

/** backpackContents[] { uuid: int[4], contents { inventory, upgradeInventory, … } } */
function leseRucksackInhalte(datei: NbtCompound): Map<string, NbtCompound> {
  const inhalte = new Map<string, NbtCompound>();
  for (const eintrag of alsListe(alsCompound(datei.data)?.backpackContents)) {
    const roh = alsCompound(eintrag);
    const kennung = uuidAusNbt(roh?.uuid);
    const inhalt = alsCompound(roh?.contents);
    if (kennung && inhalt) inhalte.set(kennung, inhalt);
  }
  return inhalte;
}

/**
 * Jeder Rucksack, der dem Spieler direkt gehört – getragen, im Inventar, in
 * der Endertruhe oder in einem dieser Rucksäcke – bekommt einen eigenen
 * Bereich. Rucksäcke, die als Block irgendwo in der Welt stehen, nicht.
 */
function rucksackBereiche(
  bisher: InventarBereich[],
  inhalte: Map<string, NbtCompound>,
  hinweise: string[],
): InventarBereich[] {
  type Fund = { kennung: string; item: InventarItem; wo: string; tiefe: number };
  const warteschlange: Fund[] = [];
  for (const bereich of bisher) {
    for (const slot of bereich.slots) {
      if (slot.item.rucksack) {
        warteschlange.push({ kennung: slot.item.rucksack, item: slot.item, wo: `${bereich.titel} · ${slot.label}`, tiefe: 0 });
      }
    }
  }

  const gesehen = new Set<string>();
  const aus: InventarBereich[] = [];

  while (warteschlange.length > 0) {
    const fund = warteschlange.shift()!;
    if (gesehen.has(fund.kennung)) continue;
    gesehen.add(fund.kennung);

    const inhalt = inhalte.get(fund.kennung);
    if (!inhalt) {
      hinweise.push(`${fund.item.name} (${fund.wo}) steht nicht in der Rucksack-Datei – noch nie geöffnet oder seitdem nicht gespeichert.`);
      continue;
    }

    const inventar = alsCompound(inhalt.inventory);
    const slots: SlotMitNummer[] = [];
    for (const eintrag of alsListe(inventar?.Items)) {
      const roh = alsCompound(eintrag);
      const slot = alsZahl(roh?.Slot);
      const item = roh ? zuItem(roh) : null;
      if (slot === null || !item) continue;
      slots.push({ nr: slot, ort: `rucksack:${fund.kennung}:${slot}`, label: `Platz ${slot + 1}`, item });
    }

    const upgrades = alsListe(alsCompound(inhalt.upgradeInventory)?.Items)
      .map((eintrag) => {
        const roh = alsCompound(eintrag);
        return roh ? zuItem(roh) : null;
      })
      .filter((item): item is InventarItem => item !== null)
      .map((item) => item.name);

    aus.push({
      schluessel: `rucksack:${fund.kennung}`,
      titel: fund.item.name,
      untertitel: `${fund.wo}${upgrades.length > 0 ? ` · Upgrades: ${upgrades.join(", ")}` : ""}`,
      plaetze: alsZahl(inventar?.Size),
      slots: ohneNummer(slots),
    });

    if (fund.tiefe < MAX_RUCKSACK_TIEFE) {
      for (const slot of slots) {
        if (slot.item.rucksack) {
          warteschlange.push({
            kennung: slot.item.rucksack,
            item: slot.item,
            wo: `in ${fund.item.name} · ${slot.label}`,
            tiefe: fund.tiefe + 1,
          });
        }
      }
    }
  }
  return aus;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

/** Ein Item-Compound (id, count, components) in die Anzeigeform bringen. */
export function zuItem(roh: NbtCompound, tiefe = 0): InventarItem | null {
  const id = alsText(roh.id);
  if (!id || id === "minecraft:air") return null;

  const anzahl = alsZahl(roh.count) ?? alsZahl(roh.Count) ?? 1;
  const komponenten = alsCompound(roh.components) ?? {};

  const eigenerName = textAusKomponente(komponenten["minecraft:custom_name"]);
  const itemName = textAusKomponente(komponenten["minecraft:item_name"]);

  const details: string[] = [...verzauberungen(komponenten["minecraft:enchantments"], "")];
  details.push(...verzauberungen(komponenten["minecraft:stored_enchantments"], "Gespeichert: "));

  const abnutzung = alsZahl(komponenten["minecraft:damage"]);
  if (abnutzung !== null && abnutzung > 0) details.push(`Abnutzung ${abnutzung}`);
  if (komponenten["minecraft:unbreakable"] !== undefined) details.push("Unzerstörbar");

  const trank = alsText(alsCompound(komponenten["minecraft:potion_contents"])?.potion);
  if (trank) details.push(`Trank: ${nameAusId(trank)}`);

  const inhalt: InventarItem[] = [];
  if (tiefe < MAX_INHALT_TIEFE) {
    // Shulkerkisten: [{ slot, item }], Bündel: [item, …]
    for (const eintrag of alsListe(komponenten["minecraft:container"])) {
      const itemRoh = alsCompound(alsCompound(eintrag)?.item);
      const kind = itemRoh ? zuItem(itemRoh, tiefe + 1) : null;
      if (kind) inhalt.push(kind);
    }
    for (const eintrag of alsListe(komponenten["minecraft:bundle_contents"])) {
      const itemRoh = alsCompound(eintrag);
      const kind = itemRoh ? zuItem(itemRoh, tiefe + 1) : null;
      if (kind) inhalt.push(kind);
    }
  }

  return {
    id,
    anzahl,
    name: eigenerName ?? itemName ?? nameAusId(id),
    umbenannt: eigenerName !== null,
    details,
    inhalt,
    rucksack: uuidAusNbt(komponenten["sophisticatedcore:storage_uuid"]),
  };
}

function verzauberungen(wert: NbtWert | undefined, praefix: string): string[] {
  const stufen = alsCompound(alsCompound(wert)?.levels);
  if (!stufen) return [];
  return Object.entries(stufen).map(([id, stufe]) => {
    const zahl = alsZahl(stufe) ?? 0;
    const roemisch = ROEMISCH[zahl] ?? String(zahl);
    return `${praefix}${nameAusId(id)} ${roemisch}`.trim();
  });
}

/**
 * Namen stehen als JSON-Textkomponente in der Datei: "\"Excalibur\"" oder
 * {"text":"Ex","extra":[{"text":"calibur","color":"gold"}]}. Hier zählt nur
 * der Text; Farbcodes (§) fliegen raus.
 */
function textAusKomponente(wert: NbtWert | undefined): string | null {
  const roh = alsText(wert);
  if (!roh) return null;

  let text: string;
  try {
    text = flach(JSON.parse(roh));
  } catch {
    text = roh;
  }
  const sauber = text.replace(/§./g, "").trim();
  return sauber.length > 0 ? sauber : null;
}

function flach(wert: unknown): string {
  if (typeof wert === "string") return wert;
  if (Array.isArray(wert)) return wert.map(flach).join("");
  if (wert && typeof wert === "object") {
    const teil = wert as { text?: unknown; translate?: unknown; extra?: unknown };
    const eigen = typeof teil.text === "string" ? teil.text : typeof teil.translate === "string" ? teil.translate : "";
    return eigen + (Array.isArray(teil.extra) ? teil.extra.map(flach).join("") : "");
  }
  return "";
}

// ---------------------------------------------------------------------------
// Hilfen
// ---------------------------------------------------------------------------

/** "2026/09/15 14:05" → "15.09. 14:05" – ohne Zeitzonen-Umrechnung, es ist schon Serverzeit. */
function geaendert(verzeichnis: CraftyDirectoryEntry[] | null, datei: string): string | null {
  const roh = verzeichnis?.find((eintrag) => eintrag.name === datei)?.modified;
  const teile = roh ? /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}:\d{2})/.exec(roh) : null;
  return teile ? `${teile[3]}.${teile[2]}. ${teile[4]}` : (roh ?? null);
}

/**
 * Wartet auf ein Promise und macht aus einem Fehler null. Mit `was` wird der
 * Fehler protokolliert; ohne ist er erwartbar (etwa eine fehlende .cosarmor).
 */
async function vielleicht<T>(versprechen: Promise<T>, was: string | null): Promise<T | null> {
  try {
    return await versprechen;
  } catch (error) {
    unstable_rethrow(error);
    if (was) console.error(`[inventar] ${was} nicht lesbar:`, error);
    return null;
  }
}

function fehlertext(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
