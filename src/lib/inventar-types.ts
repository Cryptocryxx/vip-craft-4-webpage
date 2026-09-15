/**
 * Inventar-Ansicht im Kontrollraum: Typen und Prüfungen ohne
 * Server-Abhängigkeiten, damit Client-Komponenten sie auch benutzen können.
 *
 * Geladen wird in lib/inventar.ts, verändert in lib/inventar-aktionen.ts.
 */

export type InventarItem = {
  id: string;
  anzahl: number;
  /** Der Name, wie er angezeigt wird – vom Spieler vergeben oder aus der ID abgeleitet. */
  name: string;
  /** Am Amboss umbenannt? Dann steht die ID zusätzlich dabei. */
  umbenannt: boolean;
  /** Kurze Zusatzzeilen: Verzauberungen, Abnutzung, Trank … */
  details: string[];
  /** Inhalt von Shulkerkisten und Bündeln – nur zum Ansehen. */
  inhalt: InventarItem[];
  /** Kennung des Rucksack-Inhalts, falls das ein Rucksack ist. */
  rucksack: string | null;
};

export type InventarSlot = {
  /** Ort für das Spielskript, z. B. "inv:12" (siehe ORT_RE). */
  ort: string;
  /** Beschriftung, z. B. "Kopf" oder "Platz 12". */
  label: string;
  item: InventarItem;
};

export type InventarBereich = {
  schluessel: string;
  titel: string;
  untertitel: string | null;
  /** Plätze insgesamt – für „3 von 45 belegt". Null, wo das nicht feststeht. */
  plaetze: number | null;
  slots: InventarSlot[];
};

export type SpielerInventar = {
  name: string;
  uuid: string;
  online: boolean;
  /** Letzte Änderung der Spielerdatei, wie Crafty sie meldet (Serverzeit). */
  standSpieler: string | null;
  standRucksaecke: string | null;
  bereiche: InventarBereich[];
  hinweise: string[];
};

/** Ein Eingriff, wie er in der Liste unter dem Inventar steht. */
export type InventarEingriff = {
  id: string;
  kind: "TAKE" | "GIVE" | "RETURN";
  status: "PENDING" | "OK" | "FAILED";
  itemId: string;
  count: number;
  location: string | null;
  error: string | null;
  actorName: string | null;
  createdAt: string;
  /** Nur bei TAKE: lässt sich der Stapel noch zurückgeben? */
  zurueckgebbar: boolean;
  zurueckgegeben: boolean;
};

/**
 * Orte, die das Spielskript versteht:
 *
 *   inv:<0-40>                 Inventar; 36–39 Rüstung (Füße…Kopf), 40 Nebenhand
 *   ender:<0-26>               Endertruhe
 *   curios:<slot>:<n>          Curios-Slot, z. B. curios:back:0
 *   curioskos:<slot>:<n>       dessen kosmetischer Platz
 *   kosmetik:<n>               Cosmetic Armor Reworked
 *   rucksack:<uuid>:<n>        Platz in einem Rucksack von Sophisticated Backpacks
 *
 * Jeder Teil ist ein einzelnes Wort ohne Leerzeichen – der Ort geht als ein
 * Argument in den Konsolenbefehl.
 */
export const ORT_RE =
  /^(?:(?:inv|ender|kosmetik):\d{1,3}|curios(?:kos)?:[a-z0-9_]{1,40}:\d{1,3}|rucksack:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:\d{1,4})$/;

/** Registry-ID eines Items. Bewusst eng: Sie landet als Wort im Konsolenbefehl. */
export const ITEM_ID_RE = /^[a-z0-9_.-]{1,32}:[a-z0-9_./-]{1,64}$/;

/** Mehr als das gibt es in keinem Slot, auch nicht mit Stack-Upgrade im Rucksack. */
export const MAX_ANZAHL = 9999;

/** "minecraft:netherite_sword" → "Netherite Sword" */
export function nameAusId(id: string): string {
  const pfad = id.includes(":") ? id.slice(id.indexOf(":") + 1) : id;
  return pfad
    .split(/[_/]/)
    .filter(Boolean)
    .map((wort) => wort.charAt(0).toUpperCase() + wort.slice(1))
    .join(" ");
}

export type EingabeFehler = string | null;

export function pruefeItemEingabe(itemId: string, anzahl: number): EingabeFehler {
  if (!ITEM_ID_RE.test(itemId)) return "Die Item-ID sieht nicht gültig aus – erwartet wird etwa minecraft:diamond.";
  if (!Number.isInteger(anzahl) || anzahl < 1 || anzahl > MAX_ANZAHL) return `Die Anzahl muss zwischen 1 und ${MAX_ANZAHL} liegen.`;
  return null;
}
