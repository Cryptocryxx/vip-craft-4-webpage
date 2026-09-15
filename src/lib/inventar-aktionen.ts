import "server-only";
import { unstable_rethrow } from "next/navigation";
import { craftyConfigured, craftyReadJson, craftyWriteFile } from "@/lib/crafty";
import {
  ITEM_ID_RE,
  ORT_RE,
  pruefeItemEingabe,
  type InventarEingriff,
} from "@/lib/inventar-types";
import { findPlayer, protokolliere } from "@/lib/players";
import { prisma } from "@/lib/prisma";
import { runScriptCommand } from "@/lib/server-commands";

/**
 * Items nehmen, geben und zurückgeben – über das KubeJS-Skript inventory.js.
 *
 * Dasselbe Muster wie bei Kopfgeld und Gehalt: Die Website schickt einen
 * Konsolenbefehl mit einer Beleg-ID, das Skript schreibt eine Quittung nach
 * kubejs/data/inventory.json, und erst die Quittung zählt. Crafty meldet nur,
 * dass der Befehl in der Konsole ankam.
 *
 * NUR BEI SPIELERN, DIE ONLINE SIND. Die Spielerdatei eines Offline-Spielers
 * darf man bei laufendem Server nicht anfassen – beim nächsten Einloggen oder
 * Speichern gewinnt ohnehin, was der Server im Speicher hat.
 *
 * VERALTETE ANSICHT: Was im Kontrollraum angezeigt wird, stammt aus dem letzten
 * Speicherstand (siehe inventar.ts). Deshalb geht beim Entnehmen die Item-ID
 * mit, und das Skript nimmt nur, wenn im Slot noch genau dieses Item in
 * ausreichender Menge liegt. Sonst passiert nichts, und die Quittung sagt warum.
 *
 * Jeder Eingriff steht in InventoryAction (mit dem vollständigen Stapel, damit
 * er sich zurückgeben lässt) und zusätzlich in PlayerAudit („Eingriffe des Teams").
 */

const QUITTUNGSDATEI = "kubejs/data/inventory.json";
/** Stapel zum Zurückgeben, geschrieben von HIER – das Skript liest sie beim Befehl. */
const RUECKGABEDATEI = "kubejs/data/inventory-return.json";
/** So viele Rückgaben bleiben in der Datei stehen; ältere sind längst erledigt. */
const MAX_RUECKGABEN = 20;

type Admin = { id: string; name: string | null };

type Quittung = {
  belegId?: string;
  art?: string;
  ok?: boolean;
  grund?: string | null;
  detail?: string | null;
  /**
   * Bei "nehmen": EIN Exemplar des entnommenen Stapels als SNBT. Die Menge
   * steht in `anzahl` – Minecraft speichert Stapel nur bis 99 Stück, im
   * Rucksack mit Stack-Upgrade liegen aber auch 887 Pfeile auf einem Platz.
   */
  snbt?: string | null;
  anzahl?: number | null;
  /** Bei "geben"/"zurueck": so viele lagen danach vor den Füßen (Inventar voll). */
  gefallen?: number | null;
  at?: string;
};

type QuittungsDatei = { ready?: boolean; script?: number; receipts?: Quittung[] };

export type EingriffErgebnis = { ok: true; meldung: string } | { ok: false; fehler: string };

async function leseQuittungen(): Promise<QuittungsDatei | null> {
  if (!craftyConfigured) return null;
  try {
    return await craftyReadJson<QuittungsDatei>(QUITTUNGSDATEI);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

/** Läuft inventory.js auf dem Server? */
export async function inventarSkriptBereit(): Promise<boolean> {
  return (await leseQuittungen())?.ready === true;
}

/**
 * Fragt ein paarmal nach der Quittung. Das Skript arbeitet den Befehl im
 * nächsten Tick ab (50 ms), die Wartezeiten decken vor allem Craftys Weg ab.
 */
async function warteAufQuittung(belegId: string): Promise<Quittung | null> {
  for (const wartenMs of [700, 1200, 2000, 3000]) {
    await new Promise((fertig) => setTimeout(fertig, wartenMs));
    const treffer = (await leseQuittungen())?.receipts?.find((beleg) => beleg.belegId === belegId);
    if (treffer) return treffer;
  }
  return null;
}

/** Was das Skript mit seinem Grund meint – so, dass man weiß, was zu tun ist. */
function grundText(quittung: Quittung): string {
  const detail = quittung.detail ?? "";
  switch (quittung.grund) {
    case "offline":
      return "Der Spieler ist nicht (mehr) online – es wurde nichts verändert.";
    case "ort-ungueltig":
      return "Diesen Platz gibt es beim Spieler nicht (mehr). Es wurde nichts verändert.";
    case "leer":
      return "Der Platz ist inzwischen leer – die Ansicht war veraltet. Bitte neu laden.";
    case "anderes-item":
      return `Dort liegt inzwischen etwas anderes${detail ? ` (${detail})` : ""}. Nichts entnommen – bitte neu laden.`;
    case "zu-wenig":
      return `Dort liegen nur noch ${detail || "weniger"}. Nichts entnommen.`;
    case "rucksack-fehlt":
      return "Dieser Rucksack ist nicht mehr beim Spieler. Nichts entnommen.";
    case "item-unbekannt":
      return "Dieses Item gibt es auf dem Server nicht.";
    case "kein-auftrag":
      return "Das Spielskript hat die Daten für die Rückgabe nicht gefunden.";
    default:
      return detail || `Vom Spielskript abgelehnt (${quittung.grund ?? "ohne Grund"}).`;
  }
}

const OHNE_QUITTUNG =
  "Keine Quittung vom Spielskript. Ob der Eingriff ausgeführt wurde, ist offen – er bleibt als ‚läuft' stehen und wird beim nächsten Laden abgeglichen.";

/** Gemeinsame Vorprüfung: Spieler bekannt, online, Skript bereit. */
async function vorpruefung(name: string): Promise<{ ok: true; name: string; uuid: string } | { ok: false; fehler: string }> {
  const profil = await findPlayer(name);
  if (!profil?.uuid) return { ok: false, fehler: `Zu ${name} ist keine UUID bekannt.` };
  if (!profil.online) {
    return { ok: false, fehler: `${profil.name} ist gerade nicht online. Nehmen und Geben geht nur, solange der Spieler auf dem Server ist.` };
  }
  if (!(await inventarSkriptBereit())) {
    return { ok: false, fehler: "Das Spielskript inventory.js läuft nicht (kubejs/data/inventory.json fehlt oder meldet nicht bereit)." };
  }
  return { ok: true, name: profil.name, uuid: profil.uuid.toLowerCase() };
}

// ---------------------------------------------------------------------------
// Nehmen
// ---------------------------------------------------------------------------

export async function nimmItem(admin: Admin, name: string, ort: string, itemId: string, anzahl: number): Promise<EingriffErgebnis> {
  const eingabeFehler = pruefeItemEingabe(itemId, anzahl);
  if (eingabeFehler) return { ok: false, fehler: eingabeFehler };
  if (!ORT_RE.test(ort)) return { ok: false, fehler: "Ungültiger Ort." };

  const vorab = await vorpruefung(name);
  if (!vorab.ok) return vorab;

  const zeile = await prisma.inventoryAction.create({
    data: {
      kind: "TAKE",
      target: vorab.name,
      targetUuid: vorab.uuid,
      location: ort,
      itemId,
      count: anzahl,
      actorId: admin.id,
      actorName: admin.name,
    },
    select: { id: true },
  });

  const beschreibung = `${anzahl}× ${itemId} aus ${ort}`;
  const gesendet = await runScriptCommand(
    `vipinventar nehmen ${vorab.uuid} ${ort} ${itemId} ${anzahl} ${zeile.id}`,
    `Inventar von ${vorab.name}: ${beschreibung} entnommen`,
    admin,
  );
  if (!gesendet.ok) {
    await prisma.inventoryAction.update({ where: { id: zeile.id }, data: { status: "FAILED", error: gesendet.error } });
    await protokolliere("ITEM_TAKE", vorab.name, `${beschreibung} – nicht abgeschickt`, admin, false);
    return { ok: false, fehler: `Befehl nicht abgeschickt: ${gesendet.error}` };
  }

  const quittung = await warteAufQuittung(zeile.id);
  return uebernimmQuittung(zeile.id, "ITEM_TAKE", vorab.name, beschreibung, admin, quittung, `${beschreibung} entnommen.`);
}

// ---------------------------------------------------------------------------
// Geben
// ---------------------------------------------------------------------------

export async function gibItem(admin: Admin, name: string, itemId: string, anzahl: number): Promise<EingriffErgebnis> {
  const eingabeFehler = pruefeItemEingabe(itemId, anzahl);
  if (eingabeFehler) return { ok: false, fehler: eingabeFehler };

  const vorab = await vorpruefung(name);
  if (!vorab.ok) return vorab;

  const zeile = await prisma.inventoryAction.create({
    data: { kind: "GIVE", target: vorab.name, targetUuid: vorab.uuid, itemId, count: anzahl, actorId: admin.id, actorName: admin.name },
    select: { id: true },
  });

  const beschreibung = `${anzahl}× ${itemId}`;
  const gesendet = await runScriptCommand(
    `vipinventar geben ${vorab.uuid} ${itemId} ${anzahl} ${zeile.id}`,
    `Inventar von ${vorab.name}: ${beschreibung} gegeben`,
    admin,
  );
  if (!gesendet.ok) {
    await prisma.inventoryAction.update({ where: { id: zeile.id }, data: { status: "FAILED", error: gesendet.error } });
    await protokolliere("ITEM_GIVE", vorab.name, `${beschreibung} – nicht abgeschickt`, admin, false);
    return { ok: false, fehler: `Befehl nicht abgeschickt: ${gesendet.error}` };
  }

  const quittung = await warteAufQuittung(zeile.id);
  return uebernimmQuittung(zeile.id, "ITEM_GIVE", vorab.name, beschreibung, admin, quittung, `${beschreibung} gegeben.`);
}

// ---------------------------------------------------------------------------
// Zurückgeben
// ---------------------------------------------------------------------------

/**
 * Gibt einen entnommenen Stapel exakt zurück – mit Namen, Verzauberungen und
 * allem, was das Skript beim Entnehmen als SNBT aufgehoben hat.
 *
 * Der Stapel ist zu lang für eine Befehlszeile. Er geht deshalb über eine
 * Datei, und der Befehl nennt nur die Beleg-ID.
 */
export async function gibZurueck(admin: Admin, aktionId: string): Promise<EingriffErgebnis> {
  const entnahme = await prisma.inventoryAction.findUnique({ where: { id: aktionId } });
  if (!entnahme || entnahme.kind !== "TAKE" || entnahme.status !== "OK" || !entnahme.itemSnbt) {
    return { ok: false, fehler: "Diese Entnahme lässt sich nicht zurückgeben." };
  }
  if (entnahme.returnedById) return { ok: false, fehler: "Dieser Stapel wurde schon zurückgegeben." };

  const vorab = await vorpruefung(entnahme.target);
  if (!vorab.ok) return vorab;

  const rueckgabe = await prisma.inventoryAction.create({
    data: {
      kind: "RETURN",
      target: vorab.name,
      targetUuid: vorab.uuid,
      itemId: entnahme.itemId,
      count: entnahme.count,
      actorId: admin.id,
      actorName: admin.name,
    },
    select: { id: true },
  });

  // Bedingtes UPDATE als Sperre: Zwei Admins, die gleichzeitig klicken, geben
  // den Stapel sonst doppelt zurück.
  const belegt = await prisma.inventoryAction.updateMany({
    where: { id: entnahme.id, returnedById: null },
    data: { returnedById: rueckgabe.id },
  });
  if (belegt.count === 0) {
    await prisma.inventoryAction.delete({ where: { id: rueckgabe.id } });
    return { ok: false, fehler: "Dieser Stapel wird gerade schon zurückgegeben." };
  }

  const beschreibung = `${entnahme.count}× ${entnahme.itemId}`;
  const freigeben = async (fehler: string) => {
    await prisma.inventoryAction.update({ where: { id: rueckgabe.id }, data: { status: "FAILED", error: fehler } });
    await prisma.inventoryAction.updateMany({ where: { id: entnahme.id, returnedById: rueckgabe.id }, data: { returnedById: null } });
    await protokolliere("ITEM_RETURN", vorab.name, `${beschreibung} – ${fehler}`, admin, false);
  };

  try {
    await schreibeRueckgabe(rueckgabe.id, vorab.uuid, entnahme.itemSnbt, entnahme.count);
  } catch (error) {
    unstable_rethrow(error);
    const text = error instanceof Error ? error.message : String(error);
    await freigeben(`Rückgabedatei nicht geschrieben: ${text}`);
    return { ok: false, fehler: `Die Rückgabedatei ließ sich nicht schreiben: ${text}` };
  }

  const gesendet = await runScriptCommand(
    `vipinventar zurueck ${vorab.uuid} ${rueckgabe.id}`,
    `Inventar von ${vorab.name}: ${beschreibung} zurückgegeben`,
    admin,
  );
  if (!gesendet.ok) {
    await freigeben(`nicht abgeschickt: ${gesendet.error}`);
    return { ok: false, fehler: `Befehl nicht abgeschickt: ${gesendet.error}` };
  }

  const quittung = await warteAufQuittung(rueckgabe.id);
  if (quittung && quittung.ok !== true) {
    await freigeben(grundText(quittung));
    return { ok: false, fehler: grundText(quittung) };
  }
  // Ohne Quittung bleibt die Sperre stehen: Womöglich ist der Stapel schon
  // zurück, und ein zweiter Klick gäbe ihn doppelt.
  return uebernimmQuittung(rueckgabe.id, "ITEM_RETURN", vorab.name, beschreibung, admin, quittung, `${beschreibung} zurückgegeben.`);
}

type Rueckgabe = { belegId: string; uuid: string; snbt: string; anzahl: number };

async function schreibeRueckgabe(belegId: string, uuid: string, snbt: string, anzahl: number): Promise<void> {
  const bisher = await craftyReadJson<{ entries?: Rueckgabe[] }>(RUECKGABEDATEI);
  const eintraege = (bisher?.entries ?? []).filter((eintrag) => eintrag.belegId !== belegId);
  eintraege.push({ belegId, uuid, snbt, anzahl });
  await craftyWriteFile(
    RUECKGABEDATEI,
    JSON.stringify({ generatedAt: new Date().toISOString(), entries: eintraege.slice(-MAX_RUECKGABEN) }, null, 2),
  );
}

// ---------------------------------------------------------------------------
// Quittung übernehmen, Liste, Abgleich
// ---------------------------------------------------------------------------

async function uebernimmQuittung(
  id: string,
  audit: "ITEM_TAKE" | "ITEM_GIVE" | "ITEM_RETURN",
  name: string,
  beschreibung: string,
  admin: Admin,
  quittung: Quittung | null,
  erfolg: string,
): Promise<EingriffErgebnis> {
  if (!quittung) {
    await prisma.inventoryAction.update({ where: { id }, data: { error: "Noch keine Quittung" } });
    await protokolliere(audit, name, `${beschreibung} – ohne Quittung`, admin, false);
    return { ok: false, fehler: OHNE_QUITTUNG };
  }

  if (quittung.ok === true) {
    await prisma.inventoryAction.update({
      where: { id },
      data: { status: "OK", error: null, itemSnbt: quittung.snbt ?? undefined },
    });
    await protokolliere(audit, name, beschreibung, admin, true);
    const gefallen = typeof quittung.gefallen === "number" && quittung.gefallen > 0 ? quittung.gefallen : 0;
    const zusatz = gefallen > 0 ? ` ${gefallen} davon liegen vor den Füßen – das Inventar war voll.` : "";
    return { ok: true, meldung: `${erfolg}${zusatz}` };
  }

  const text = grundText(quittung);
  await prisma.inventoryAction.update({ where: { id }, data: { status: "FAILED", error: text } });
  await protokolliere(audit, name, `${beschreibung} – ${text}`, admin, false);
  return { ok: false, fehler: text };
}

/**
 * Eingriffe, die ohne Quittung stehengeblieben sind, mit der Quittungsdatei
 * abgleichen. Die Datei hält die letzten Belege bis zum nächsten Serverstart.
 */
async function gleicheOffeneAb(name: string): Promise<void> {
  const offen = await prisma.inventoryAction.findMany({
    where: { target: name, status: "PENDING" },
    select: { id: true, kind: true, count: true, itemId: true, location: true, createdAt: true },
  });
  if (offen.length === 0) return;

  const quittungen = (await leseQuittungen())?.receipts ?? [];
  for (const zeile of offen) {
    const quittung = quittungen.find((beleg) => beleg.belegId === zeile.id);
    if (!quittung) {
      // Nach einer Stunde ohne Quittung kommt keine mehr (Neustart o. ä.).
      if (Date.now() - zeile.createdAt.getTime() > 60 * 60_000) {
        await prisma.inventoryAction.update({
          where: { id: zeile.id },
          data: { status: "FAILED", error: "Keine Quittung erhalten – bitte im Spiel prüfen, ob der Eingriff ausgeführt wurde." },
        });
      }
      continue;
    }
    await prisma.inventoryAction.update({
      where: { id: zeile.id },
      data:
        quittung.ok === true
          ? { status: "OK", error: null, itemSnbt: quittung.snbt ?? undefined }
          : { status: "FAILED", error: grundText(quittung) },
    });
  }
}

export async function eingriffeFuer(name: string, limit = 30): Promise<InventarEingriff[]> {
  try {
    await gleicheOffeneAb(name);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[inventar] Abgleich offener Eingriffe fehlgeschlagen:", error);
  }

  const zeilen = await prisma.inventoryAction.findMany({
    where: { target: name },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return zeilen.map((zeile) => ({
    id: zeile.id,
    kind: zeile.kind as InventarEingriff["kind"],
    status: zeile.status as InventarEingriff["status"],
    itemId: ITEM_ID_RE.test(zeile.itemId) ? zeile.itemId : "?",
    count: zeile.count,
    location: zeile.location,
    error: zeile.error,
    actorName: zeile.actorName,
    createdAt: zeile.createdAt.toISOString(),
    zurueckgebbar: zeile.kind === "TAKE" && zeile.status === "OK" && Boolean(zeile.itemSnbt) && !zeile.returnedById,
    zurueckgegeben: zeile.kind === "TAKE" && Boolean(zeile.returnedById),
  }));
}
