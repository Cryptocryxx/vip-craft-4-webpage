import { gunzipSync } from "node:zlib";

/**
 * Liest Minecrafts Binärformat NBT (Java Edition) – Spielerdateien
 * (`world/playerdata/<uuid>.dat`), Weltdaten (`world/data/*.dat`) und die
 * Dateien von Mods, die dasselbe Format benutzen (`.cosarmor`).
 *
 * Bewusst selbst geschrieben statt als Abhängigkeit: Das Format ist klein und
 * seit Jahren unverändert, gebraucht wird nur Lesen. Ein fremdes Paket müsste
 * man für diese hundert Zeilen trotzdem prüfen und aktuell halten.
 *
 * Abbildung auf JavaScript:
 *   byte, short, int, float, double → number
 *   long                            → bigint (sonst gingen Stellen verloren)
 *   string                          → string
 *   list                            → Array
 *   compound                        → Objekt
 *   byte[] / int[] / long[]         → Int8Array / Int32Array / BigInt64Array
 *
 * Die typisierten Arrays sind Absicht: Eine UUID steht als int[4] da, eine
 * Liste von vier ints sähe als normales Array genauso aus – so bleiben beide
 * unterscheidbar (siehe uuidAusNbt).
 */

export type NbtCompound = { [schluessel: string]: NbtWert };
export type NbtWert = number | bigint | string | NbtWert[] | NbtCompound | Int8Array | Int32Array | BigInt64Array;

/** Entpackt bei Bedarf (gzip erkennt man an 1f 8b) und liest den Wurzel-Compound. */
export function leseNbt(daten: Buffer): NbtCompound {
  const roh = daten.length >= 2 && daten[0] === 0x1f && daten[1] === 0x8b ? gunzipSync(daten) : daten;
  return new NbtLeser(roh).wurzel();
}

class NbtLeser {
  private o = 0;

  constructor(private readonly b: Buffer) {}

  wurzel(): NbtCompound {
    const typ = this.b.readUInt8(this.o++);
    if (typ !== 10) throw new Error(`NBT: Die Wurzel ist kein Compound (Typ ${typ}).`);
    this.text(); // Name der Wurzel, immer leer
    return this.wert(10) as NbtCompound;
  }

  private wert(typ: number): NbtWert {
    const b = this.b;
    switch (typ) {
      case 1:
        return b.readInt8(this.o++);
      case 2:
        this.o += 2;
        return b.readInt16BE(this.o - 2);
      case 3:
        this.o += 4;
        return b.readInt32BE(this.o - 4);
      case 4:
        this.o += 8;
        return b.readBigInt64BE(this.o - 8);
      case 5:
        this.o += 4;
        return b.readFloatBE(this.o - 4);
      case 6:
        this.o += 8;
        return b.readDoubleBE(this.o - 8);
      case 7: {
        const n = this.laenge();
        const aus = new Int8Array(b.buffer.slice(b.byteOffset + this.o, b.byteOffset + this.o + n));
        this.o += n;
        return aus;
      }
      case 8:
        return this.text();
      case 9: {
        const elementTyp = b.readUInt8(this.o++);
        const n = this.laenge();
        const liste: NbtWert[] = [];
        for (let i = 0; i < n; i++) liste.push(this.wert(elementTyp));
        return liste;
      }
      case 10: {
        const compound: NbtCompound = {};
        for (;;) {
          const t = b.readUInt8(this.o++);
          if (t === 0) return compound;
          const schluessel = this.text();
          compound[schluessel] = this.wert(t);
        }
      }
      case 11: {
        const n = this.laenge();
        const aus = new Int32Array(n);
        for (let i = 0; i < n; i++, this.o += 4) aus[i] = b.readInt32BE(this.o);
        return aus;
      }
      case 12: {
        const n = this.laenge();
        const aus = new BigInt64Array(n);
        for (let i = 0; i < n; i++, this.o += 8) aus[i] = b.readBigInt64BE(this.o);
        return aus;
      }
      default:
        throw new Error(`NBT: Unbekannter Typ ${typ} an Position ${this.o - 1}.`);
    }
  }

  /** Längenangaben sind vorzeichenbehaftet – eine negative wäre eine kaputte Datei. */
  private laenge(): number {
    const n = this.b.readInt32BE(this.o);
    this.o += 4;
    if (n < 0) throw new Error(`NBT: Negative Länge an Position ${this.o - 4}.`);
    return n;
  }

  /**
   * Java schreibt Zeichenketten als "modified UTF-8": Das Nullzeichen braucht
   * zwei Bytes, und Zeichen jenseits der Grundebene (etwa Emoji in einem
   * Itemnamen) stehen als zwei Ersatzzeichen mit je drei Bytes da. Node kennt
   * das nicht und machte daraus Fragezeichen – deshalb von Hand.
   */
  private text(): string {
    const n = this.b.readUInt16BE(this.o);
    this.o += 2;
    const ende = this.o + n;
    if (ende > this.b.length) throw new RangeError("NBT: Zeichenkette über das Dateiende hinaus.");

    const einheiten: number[] = [];
    while (this.o < ende) {
      const a = this.b[this.o++];
      if (a < 0x80) {
        einheiten.push(a);
      } else if ((a & 0xe0) === 0xc0) {
        einheiten.push(((a & 0x1f) << 6) | (this.b[this.o++] & 0x3f));
      } else {
        const zwei = this.b[this.o++];
        const drei = this.b[this.o++];
        einheiten.push(((a & 0x0f) << 12) | ((zwei & 0x3f) << 6) | (drei & 0x3f));
      }
    }
    this.o = ende;
    return String.fromCharCode(...einheiten);
  }
}

/** Minecraft speichert UUIDs als int[4] (höchstwertige Bits zuerst). */
export function uuidAusNbt(wert: NbtWert | undefined): string | null {
  if (!(wert instanceof Int32Array) || wert.length !== 4) return null;
  const hex = Array.from(wert, (teil) => (teil >>> 0).toString(16).padStart(8, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Ein Compound – oder null, wenn dort etwas anderes (oder nichts) steht. */
export function alsCompound(wert: NbtWert | undefined): NbtCompound | null {
  if (wert === undefined || wert === null || typeof wert !== "object") return null;
  if (Array.isArray(wert) || ArrayBuffer.isView(wert)) return null;
  return wert as NbtCompound;
}

/** Eine Liste – oder eine leere, wenn dort etwas anderes steht. */
export function alsListe(wert: NbtWert | undefined): NbtWert[] {
  return Array.isArray(wert) ? wert : [];
}

/** Eine Zahl – bigint wird nur übernommen, solange er verlustfrei passt. */
export function alsZahl(wert: NbtWert | undefined): number | null {
  if (typeof wert === "number") return wert;
  if (typeof wert === "bigint" && wert <= BigInt(Number.MAX_SAFE_INTEGER) && wert >= BigInt(Number.MIN_SAFE_INTEGER)) {
    return Number(wert);
  }
  return null;
}

export function alsText(wert: NbtWert | undefined): string | null {
  return typeof wert === "string" ? wert : null;
}
