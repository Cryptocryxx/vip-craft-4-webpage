import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Auswertung der Todesmeldungen aus dem Spiel.
 *
 * Grundlage sind die DEATH-Zeilen im Spielprotokoll: Das KubeJS-Skript legt
 * dort die ORIGINALE Todesmeldung des Servers ab (getCombatTracker), also genau
 * den Satz, den im Spiel ohnehin alle im Chat lesen – „Gamsa was slain by
 * Zombie", „juliathomasx fell from a high place".
 *
 * Warum die Vanilla-Statistiken dafür nicht reichen: `minecraft:killed_by`
 * zählt zwar Tode je Kreaturenart, kennt aber weder Umwelttode (Sturz, Lava,
 * Ersticken) noch NAMEN – wer wen erschlagen hat, steht dort nicht drin. Die
 * Meldung enthält beides.
 *
 * Die Meldungen kommen auf Englisch vom Server (Serversprache), unabhängig
 * davon, welche Sprache die Website gerade zeigt. Namen von Spielern und
 * Kreaturen sind Eigennamen und bleiben deshalb stehen; nur die Umweltursachen
 * werden auf feste Schlüssel abgebildet, die sich übersetzen lassen.
 */

export type TodesArt = "spieler" | "kreatur" | "umwelt";

export type TodesUrsache = {
  art: TodesArt;
  /**
   * Bei „spieler"/„kreatur" der Name (Eigenname, wird nicht übersetzt),
   * bei „umwelt" ein Schlüssel aus UMWELT_URSACHEN.
   */
  schluessel: string;
  /** Die vollständige Meldung, wie sie vom Server kam. */
  rohtext: string;
};

/**
 * Umweltursachen in der Reihenfolge, in der geprüft wird – die erste
 * passende gewinnt. Bewusst grob: Eine Handvoll verständlicher Gruppen ist
 * nützlicher als 40 einzeln übersetzte Vanilla-Sätze, und modeigene Meldungen
 * fallen ohnehin auf „sonstiges".
 */
const UMWELT_URSACHEN: Array<{ schluessel: string; muster: RegExp }> = [
  // Reihenfolge ist Absicht: „fell out of the world" und „squashed by a
  // falling anvil" enthalten beide „fall" – die genaueren Fälle müssen
  // deshalb vor dem allgemeinen Sturz stehen.
  { schluessel: "lava", muster: /lava/i },
  { schluessel: "void", muster: /out of the world|into the void/i },
  { schluessel: "amboss", muster: /anvil|falling block|squashed/i },
  { schluessel: "sturz", muster: /fell|fall|hit the ground too hard/i },
  { schluessel: "feuer", muster: /fire|flames|burn/i },
  { schluessel: "explosion", muster: /blown up|blew up|explosion/i },
  { schluessel: "ertrunken", muster: /drown/i },
  { schluessel: "ersticken", muster: /suffocat|squished/i },
  { schluessel: "verhungert", muster: /starv/i },
  { schluessel: "kaktus", muster: /prick/i },
  { schluessel: "blitz", muster: /lightning/i },
  { schluessel: "verdorrt", muster: /wither/i },
  { schluessel: "kaelte", muster: /froze|frozen/i },
  { schluessel: "schrei", muster: /shriek|sonically/i },
  { schluessel: "kinetisch", muster: /kinetic|elytra/i },
  { schluessel: "magie", muster: /magic/i },
];

export const UMWELT_SCHLUESSEL = [...UMWELT_URSACHEN.map((u) => u.schluessel), "sonstiges"] as const;

/**
 * Zerlegt eine Todesmeldung.
 *
 * Vanilla baut die Sätze immer nach demselben Muster: „<Opfer> <Vorgang> [by
 * <Verursacher>] [using <Gegenstand>]". Deshalb wird von hinten gelesen – erst
 * der Gegenstand abgeschnitten, dann der Verursacher hinter dem letzten „by".
 *
 * Ob der Verursacher eine Person oder eine Kreatur ist, entscheidet die Liste
 * bekannter Spielernamen. Kreaturen schreibt Minecraft ohne Artikel und groß
 * („Zombie", „Cave Spider"); alles mit Artikel („a falling anvil") oder klein
 * geschrieben ist keine Kreatur, sondern Umwelt.
 */
export function analysiereTod(text: string, opfer: string, spieler: Set<string>): TodesUrsache {
  const rohtext = text.trim();

  // Opfernamen vorne abschneiden, sonst verfängt sich die Suche darin.
  const satz = rohtext.startsWith(opfer) ? rohtext.slice(opfer.length).trim() : rohtext;

  // „... using [Item]" gehört zur Waffe, nicht zum Verursacher.
  const ohneWaffe = satz.replace(/\s+using\s+.+$/i, "").trim();

  // „whilst fighting X" / „trying to escape X" nennen den Gegner ebenfalls.
  const kampf = /(?:whilst fighting|trying to escape)\s+(.+)$/i.exec(ohneWaffe);
  const nachBy = /\bby\s+(.+)$/i.exec(ohneWaffe);
  const verursacherRoh = (kampf?.[1] ?? nachBy?.[1] ?? "").trim().replace(/[.!]+$/, "");

  if (verursacherRoh) {
    const ohneArtikel = verursacherRoh.replace(/^(?:a|an|the)\s+/i, "").trim();

    const treffer = [...spieler].find((name) => name.toLowerCase() === ohneArtikel.toLowerCase());
    if (treffer) return { art: "spieler", schluessel: treffer, rohtext };

    // Kein Artikel davor und großgeschrieben: eine Kreatur.
    const hatArtikel = ohneArtikel !== verursacherRoh;
    if (!hatArtikel && /^[A-ZÄÖÜ]/.test(verursacherRoh)) {
      return { art: "kreatur", schluessel: verursacherRoh, rohtext };
    }
  }

  for (const ursache of UMWELT_URSACHEN) {
    if (ursache.muster.test(ohneWaffe)) return { art: "umwelt", schluessel: ursache.schluessel, rohtext };
  }
  return { art: "umwelt", schluessel: "sonstiges", rohtext };
}

type TodesZeile = { playerName: string; text: string; at: Date };

/** Alle Todesmeldungen – für sich genommen wenige Zeilen, deshalb am Stück. */
async function ladeTode(): Promise<TodesZeile[]> {
  return prisma.gameLog.findMany({
    where: { kind: "DEATH" },
    orderBy: { seq: "desc" },
    select: { playerName: true, text: true, at: true },
    take: 5000,
  });
}

/** Namen, von denen wir wissen, dass es Personen sind (aus dem Protokoll). */
async function spielerNamen(): Promise<Set<string>> {
  const zeilen = await prisma.gameLog.findMany({
    where: { kind: { in: ["JOIN", "QUIT", "CHAT", "DEATH"] } },
    distinct: ["playerName"],
    select: { playerName: true },
    take: 1000,
  });
  return new Set(zeilen.map((z) => z.playerName));
}

export type UrsachenZeile = { art: TodesArt; schluessel: string; anzahl: number; zuletzt: string };

export type SpielerTode = {
  gesamt: number;
  /** Woran gestorben, häufigstes zuerst. */
  ursachen: UrsachenZeile[];
  /** Wen diese Person erledigt hat. */
  getoetet: Array<{ name: string; anzahl: number }>;
  /** Von wem diese Person erledigt wurde. */
  gefallenDurch: Array<{ name: string; anzahl: number }>;
};

/** Todesbilanz einer einzelnen Person. */
export async function todeVonSpieler(name: string): Promise<SpielerTode> {
  const [zeilen, spieler] = await Promise.all([ladeTode(), spielerNamen()]);

  const ursachen = new Map<string, UrsachenZeile>();
  const getoetet = new Map<string, number>();
  const gefallenDurch = new Map<string, number>();
  let gesamt = 0;

  for (const zeile of zeilen) {
    const ursache = analysiereTod(zeile.text, zeile.playerName, spieler);

    // Eigene Tode: Ursachen zählen.
    if (zeile.playerName === name) {
      gesamt += 1;
      const key = `${ursache.art}:${ursache.schluessel}`;
      const vorhanden = ursachen.get(key);
      if (vorhanden) {
        vorhanden.anzahl += 1;
      } else {
        ursachen.set(key, {
          art: ursache.art,
          schluessel: ursache.schluessel,
          anzahl: 1,
          zuletzt: zeile.at.toISOString(),
        });
      }
      if (ursache.art === "spieler") {
        gefallenDurch.set(ursache.schluessel, (gefallenDurch.get(ursache.schluessel) ?? 0) + 1);
      }
    }

    // Fremde Tode, bei denen diese Person der Verursacher war.
    if (ursache.art === "spieler" && ursache.schluessel === name && zeile.playerName !== name) {
      getoetet.set(zeile.playerName, (getoetet.get(zeile.playerName) ?? 0) + 1);
    }
  }

  const nachAnzahl = <T extends { anzahl: number }>(liste: T[]) => liste.sort((a, b) => b.anzahl - a.anzahl);

  return {
    gesamt,
    ursachen: nachAnzahl([...ursachen.values()]),
    getoetet: nachAnzahl([...getoetet].map(([n, anzahl]) => ({ name: n, anzahl }))),
    gefallenDurch: nachAnzahl([...gefallenDurch].map(([n, anzahl]) => ({ name: n, anzahl }))),
  };
}

export type PvpPaar = { taeter: string; opfer: string; anzahl: number; zuletzt: string };

export type PvpUebersicht = {
  paare: PvpPaar[];
  /** Wer insgesamt am häufigsten zugeschlagen hat. */
  rangliste: Array<{ name: string; getoetet: number; gestorben: number }>;
};

/** Wer hat wen wie oft erwischt – über alle Spieler. */
export async function pvpUebersicht(): Promise<PvpUebersicht> {
  const [zeilen, spieler] = await Promise.all([ladeTode(), spielerNamen()]);

  const paare = new Map<string, PvpPaar>();
  const getoetet = new Map<string, number>();
  const gestorben = new Map<string, number>();

  for (const zeile of zeilen) {
    const ursache = analysiereTod(zeile.text, zeile.playerName, spieler);
    if (ursache.art !== "spieler") continue;

    const taeter = ursache.schluessel;
    const opfer = zeile.playerName;
    // Sich selbst zu erwischen (eigene TNT o. ä.) ist kein Duell.
    if (taeter === opfer) continue;

    const key = `${taeter} ${opfer}`;
    const vorhanden = paare.get(key);
    if (vorhanden) {
      vorhanden.anzahl += 1;
    } else {
      paare.set(key, { taeter, opfer, anzahl: 1, zuletzt: zeile.at.toISOString() });
    }

    getoetet.set(taeter, (getoetet.get(taeter) ?? 0) + 1);
    gestorben.set(opfer, (gestorben.get(opfer) ?? 0) + 1);
  }

  const namen = new Set([...getoetet.keys(), ...gestorben.keys()]);
  const rangliste = [...namen]
    .map((name) => ({ name, getoetet: getoetet.get(name) ?? 0, gestorben: gestorben.get(name) ?? 0 }))
    .sort((a, b) => b.getoetet - a.getoetet || a.gestorben - b.gestorben);

  return {
    paare: [...paare.values()].sort((a, b) => b.anzahl - a.anzahl),
    rangliste,
  };
}
