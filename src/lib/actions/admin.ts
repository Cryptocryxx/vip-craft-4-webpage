"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { discordBotCheckEnabled, pruefeAlle } from "@/lib/discord";
import { pruefeGamertag } from "@/lib/mojang";
import { prisma } from "@/lib/prisma";
import { saveSiteSettings } from "@/lib/settings";
import type { SiteSettings } from "@/lib/settings-types";
import { SUGGESTION_STATUSES, type SuggestionStatus } from "@/lib/suggestion-types";
import { approveApplication, deleteApplication, rejectApplication } from "@/lib/whitelist";
import { adminDeleteShop } from "@/lib/shops";
import { whitelistAdd, whitelistRemove } from "@/lib/server-commands";
import { merkeVor, nurVormerken } from "@/lib/whitelist-queue";
import { invalidateStatsCache } from "@/lib/stats-source";
import { GAMERTAG_RE } from "@/lib/whitelist-types";

/** Twitch-Benutzernamen: 4–25 Zeichen, Buchstaben, Zahlen, Unterstrich. */
const TWITCH_RE = /^[A-Za-z0-9_]{4,25}$/;

export type AdminFormState = { error?: string; success?: string };

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

function revalidateAdmin(): void {
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboards");
  invalidateStatsCache();
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// ---------------------------------------------------------------------------
// Whitelist-Anträge
// ---------------------------------------------------------------------------

export async function reviewApplicationAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Kein Admin-Zugriff." };
  }

  const id = text(formData, "applicationId");
  const decision = text(formData, "decision");
  const note = text(formData, "note");

  if (!id) return { error: "Antrag fehlt." };
  if (decision !== "approve" && decision !== "reject") return { error: "Ungültige Entscheidung." };
  if (note.length > 500) return { error: "Die Notiz darf höchstens 500 Zeichen haben." };

  // Gamertag vor der Änderung merken – für den Konsolenbefehl.
  const application = await prisma.whitelistApplication.findUnique({
    where: { id },
    select: { userId: true, minecraftName: true, user: { select: { minecraftName: true, role: true } } },
  });
  const gamertag = application?.minecraftName ?? application?.user.minecraftName ?? null;

  try {
    if (decision === "approve") {
      await approveApplication(id, admin.id, note || null);
    } else {
      await rejectApplication(id, admin.id, note || null);
    }
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "Der Minecraft-Username aus dem Antrag gehört bereits einem anderen Account." };
    }
    return { error: err instanceof Error ? err.message : "Antrag konnte nicht bearbeitet werden." };
  }

  revalidateAdmin();

  const base = decision === "approve" ? "Antrag angenommen." : "Antrag abgelehnt.";

  // Whitelist auf dem Server nachziehen. Ein Fehler hier darf die Entscheidung
  // nicht rückgängig machen – sie steht bereits in der Datenbank.
  if (gamertag) {
    // Vor dem Serverstart wird nur vorgemerkt: Der Antrag gilt, aber alle
    // kommen gleichzeitig zum Start auf den Server (siehe whitelist-queue).
    if (decision === "approve" && application && nurVormerken(application.user.role)) {
      await merkeVor(application.userId);
      return {
        success: `${base} ${gamertag} ist vorgemerkt und wird zum Serverstart freigeschaltet.`,
      };
    }

    const result =
      decision === "approve"
        ? await whitelistAdd(gamertag, "Whitelist-Antrag angenommen", admin)
        : await whitelistRemove(gamertag, "Whitelist-Antrag abgelehnt", admin);

    if (!result.ok) {
      // Der Server ist aus oder nicht erreichbar. Die Entscheidung steht
      // trotzdem – der Befehl wird nachgeholt, sobald er wieder laeuft.
      if (decision === "approve" && application) {
        await merkeVor(application.userId);
        return {
          success: `${base} Der Server war nicht erreichbar – ${gamertag} ist vorgemerkt und wird freigeschaltet, sobald er wieder läuft.`,
        };
      }
      return { success: base, error: `Server-Befehl fehlgeschlagen: ${result.error}` };
    }
    return { success: `${base} ${gamertag} wurde auf dem Server ${decision === "approve" ? "freigeschaltet" : "entfernt"}.` };
  }

  return { success: base };
}

export async function deleteApplicationAction(applicationId: string): Promise<void> {
  await requireAdmin();
  await deleteApplication(applicationId);
  revalidateAdmin();
}

// ---------------------------------------------------------------------------
// Benutzerverwaltung
// ---------------------------------------------------------------------------

export async function updateUserAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Kein Admin-Zugriff." };
  }

  const userId = text(formData, "userId");
  let minecraftName = text(formData, "minecraftName");
  const twitchName = text(formData, "twitchName").toLowerCase();
  const role = text(formData, "role");
  const whitelisted = formData.get("whitelisted") === "on";

  if (!userId) return { error: "Benutzer fehlt." };
  if (role !== "PLAYER" && role !== "ADMIN") return { error: "Ungültige Rolle." };
  if (minecraftName && !GAMERTAG_RE.test(minecraftName)) {
    return { error: "Ein Minecraft-Name hat 3–16 Zeichen (Buchstaben, Zahlen, Unterstrich)." };
  }
  if (twitchName && !TWITCH_RE.test(twitchName)) {
    return { error: "Ein Twitch-Name hat 4–25 Zeichen (Buchstaben, Zahlen, Unterstrich)." };
  }
  if (userId === admin.id && role !== "ADMIN") {
    return { error: "Du kannst dir nicht selbst die Admin-Rolle entziehen." };
  }

  // Auch hier gegen Mojang pruefen: Ein Gamertag, den es nicht gibt, geht
  // spaeter als Whitelist-Befehl an den Server und laeuft dort ins Leere.
  if (minecraftName) {
    const geprueft = await pruefeGamertag(minecraftName);
    if (!geprueft.ok) return { error: geprueft.error };
    minecraftName = geprueft.name;
  }

  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { whitelisted: true, minecraftName: true },
  });

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        minecraftName: minecraftName || null,
        twitchName: twitchName || null,
        role,
        whitelisted,
        // Wer die Freigabe verliert, soll nicht als vorgemerkt liegen bleiben.
        ...(whitelisted ? {} : { whitelistPending: false }),
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "Dieser Minecraft-Username oder Twitch-Kanal ist bereits vergeben." };
    return { error: "Benutzer konnte nicht gespeichert werden." };
  }

  revalidatePath("/streams");
  revalidateAdmin();

  // Whitelist-Schalter umgelegt? Dann auf dem Server nachziehen.
  if (before && before.whitelisted !== whitelisted && minecraftName) {
    // Vor dem Serverstart nur vormerken – siehe whitelist-queue. Das Entziehen
    // laeuft weiter sofort: Wer nicht mehr darf, soll auch nicht vorgemerkt
    // bleiben.
    if (whitelisted && nurVormerken(role)) {
      await merkeVor(userId);
      return { success: `Gespeichert. ${minecraftName} ist vorgemerkt und wird zum Serverstart freigeschaltet.` };
    }

    const result = whitelisted
      ? await whitelistAdd(minecraftName, "Whitelist im Kontrollraum gesetzt", admin)
      : await whitelistRemove(minecraftName, "Whitelist im Kontrollraum entzogen", admin);

    if (!result.ok) {
      if (whitelisted) {
        await merkeVor(userId);
        return {
          success: `Gespeichert. Der Server war nicht erreichbar – ${minecraftName} ist vorgemerkt und wird freigeschaltet, sobald er wieder läuft.`,
        };
      }
      return { success: "Gespeichert.", error: `Server-Befehl fehlgeschlagen: ${result.error}` };
    }
    // Geklappt - eine eventuelle Vormerkung ist damit erledigt.
    await prisma.user.update({ where: { id: userId }, data: { whitelistPending: false } });
    return { success: `Gespeichert. ${minecraftName} auf dem Server ${whitelisted ? "freigeschaltet" : "entfernt"}.` };
  }

  // Gamertag geändert, während der Spieler gewhitelisted bleibt: Eintrag umziehen.
  if (before?.whitelisted && whitelisted && minecraftName && before.minecraftName && before.minecraftName !== minecraftName) {
    // Vor dem Start steht der alte Name noch gar nicht auf dem Server – dann
    // gibt es nichts umzuziehen, nur die Vormerkung gilt weiter.
    if (nurVormerken(role)) {
      await merkeVor(userId);
      return { success: `Gespeichert. ${minecraftName} bleibt vorgemerkt für den Serverstart.` };
    }

    await whitelistRemove(before.minecraftName, "Minecraft-Username geändert (alter Eintrag)", admin);
    await whitelistAdd(minecraftName, "Minecraft-Username geändert (neuer Eintrag)", admin);
    return { success: `Gespeichert. Whitelist-Eintrag von ${before.minecraftName} auf ${minecraftName} umgestellt.` };
  }

  return { success: "Gespeichert." };
}

/**
 * Prüft die Discord-Mitgliedschaft aller verknüpften Accounts auf einmal.
 * Braucht den Bot-Token – über die persönlichen Tokens ginge das nicht, die
 * lassen sich nur benutzen, während die betreffende Person selbst da ist.
 */
export async function checkDiscordMembershipsAction(): Promise<AdminFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Kein Admin-Zugriff." };
  }

  if (!discordBotCheckEnabled) {
    return { error: "Dafür fehlt DISCORD_BOT_TOKEN in der .env – ohne Bot geht nur die Prüfung beim Dashboard-Aufruf." };
  }

  const bilanz = await pruefeAlle();
  revalidateAdmin();

  if (bilanz.geprueft === 0) return { success: "Niemand mit verknüpftem Discord-Account gefunden." };

  const teile = [`${bilanz.mitglied} im Discord`, `${bilanz.nichtMitglied} nicht`];
  if (bilanz.unklar > 0) teile.push(`${bilanz.unklar} unklar`);
  return { success: `${bilanz.geprueft} geprüft: ${teile.join(", ")}.` };
}

/**
 * Nimmt alle außer Admins vorübergehend von der Server-Whitelist.
 *
 * `whitelisted` bleibt dabei stehen – sonst wüsste hinterher niemand mehr, wer
 * zurückdarf. Nur wer wirklich vom Server entfernt wurde, gilt als ausgesetzt:
 * Wäre der Server gerade nicht erreichbar und wir würden es trotzdem
 * vermerken, stünden die Leute weiter auf der echten Whitelist und kämen beim
 * nächsten Start ungehindert herein.
 */
export async function suspendNonAdminsAction(): Promise<AdminFormState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Kein Admin-Zugriff." };
  }

  const betroffene = await prisma.user.findMany({
    where: {
      whitelisted: true,
      whitelistSuspended: false,
      role: { not: "ADMIN" },
      NOT: { minecraftName: null },
    },
    select: { id: true, minecraftName: true },
  });

  if (betroffene.length === 0) return { success: "Niemand zum Aussetzen – außer Admins ist gerade niemand freigeschaltet." };

  let entfernt = 0;
  const gescheitert: string[] = [];

  for (const person of betroffene) {
    if (!person.minecraftName) continue;
    const ergebnis = await whitelistRemove(person.minecraftName, "Whitelist vorübergehend ausgesetzt", admin);

    if (!ergebnis.ok) {
      gescheitert.push(person.minecraftName);
      continue;
    }
    await prisma.user.update({ where: { id: person.id }, data: { whitelistSuspended: true } });
    entfernt += 1;
  }

  revalidateAdmin();

  if (entfernt === 0) {
    return { error: `Kein Eintrag ging durch – läuft der Server? (${gescheitert.length} Versuche)` };
  }
  if (gescheitert.length > 0) {
    return {
      success: `${entfernt} ausgesetzt.`,
      error: `Bei ${gescheitert.length} klappte es nicht: ${gescheitert.join(", ")}.`,
    };
  }
  return { success: `${entfernt} Spieler ausgesetzt. Admins bleiben freigeschaltet.` };
}

/** Hebt die Aussetzung wieder auf. */
export async function restoreSuspendedAction(): Promise<AdminFormState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Kein Admin-Zugriff." };
  }

  const ausgesetzte = await prisma.user.findMany({
    where: { whitelistSuspended: true, NOT: { minecraftName: null } },
    select: { id: true, minecraftName: true },
  });

  if (ausgesetzte.length === 0) return { success: "Es ist gerade niemand ausgesetzt." };

  let zurueck = 0;
  let vorgemerkt = 0;

  for (const person of ausgesetzte) {
    if (!person.minecraftName) continue;
    const ergebnis = await whitelistAdd(person.minecraftName, "Aussetzung aufgehoben", admin);

    if (ergebnis.ok) {
      await prisma.user.update({
        where: { id: person.id },
        data: { whitelistSuspended: false, whitelistPending: false },
      });
      zurueck += 1;
      continue;
    }

    // Server nicht erreichbar: Die Aussetzung ist aufgehoben, der Befehl wird
    // nachgeholt (siehe lib/whitelist-queue).
    await prisma.user.update({
      where: { id: person.id },
      data: { whitelistSuspended: false, whitelistPending: true },
    });
    vorgemerkt += 1;
  }

  revalidateAdmin();

  if (vorgemerkt > 0) {
    return {
      success: `${zurueck} zurück auf der Whitelist, ${vorgemerkt} vorgemerkt – die kommen dran, sobald der Server wieder läuft.`,
    };
  }
  return { success: `${zurueck} Spieler wieder freigeschaltet.` };
}

export async function deleteUserAction(userId: string): Promise<void> {
  const admin = await requireAdmin();
  if (userId === admin.id) throw new Error("Du kannst dich nicht selbst löschen.");

  await prisma.user.delete({ where: { id: userId } });
  revalidateAdmin();
}

// ---------------------------------------------------------------------------
// Vorschlags-Board
// ---------------------------------------------------------------------------

export async function updateSuggestionStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = text(formData, "suggestionId");
  const status = text(formData, "status");
  if (!id || !(SUGGESTION_STATUSES as readonly string[]).includes(status)) return;

  await prisma.suggestion.update({ where: { id }, data: { status: status as SuggestionStatus } });
  revalidateAdmin();
}

export async function deleteSuggestionAction(suggestionId: string): Promise<void> {
  await requireAdmin();
  await prisma.suggestion.delete({ where: { id: suggestionId } });
  revalidateAdmin();
}

// ---------------------------------------------------------------------------
// Shops – gehen ohne Freigabe live, Admins können nur noch entfernen.
// ---------------------------------------------------------------------------

export async function deleteShopAdminAction(shopId: string): Promise<void> {
  await requireAdmin();
  await adminDeleteShop(shopId);
  revalidateAdmin();
}

// ---------------------------------------------------------------------------
// Einstellungen
// ---------------------------------------------------------------------------

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function updateSettingsAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Kein Admin-Zugriff." };
  }

  const serverIp = text(formData, "serverIp");
  const mapUrl = text(formData, "mapUrl");
  const discordInvite = text(formData, "discordInvite");
  const announcement = text(formData, "announcement");

  if (serverIp.length < 3 || serverIp.length > 120 || /\s/.test(serverIp)) {
    return { error: "Die Server-Adresse sieht nicht gültig aus." };
  }
  if (!isValidUrl(mapUrl)) return { error: "Die Karten-URL muss mit http:// oder https:// beginnen." };
  if (!isValidUrl(discordInvite)) return { error: "Der Discord-Link muss mit http:// oder https:// beginnen." };
  if (announcement.length > 300) return { error: "Die Ankündigung darf höchstens 300 Zeichen haben." };

  const values: SiteSettings = {
    serverIp,
    mapUrl,
    discordInvite,
    whitelistOpen: formData.get("whitelistOpen") === "on",
    announcement,
    announcementActive: formData.get("announcementActive") === "on",
  };

  await saveSiteSettings(values);
  revalidatePath("/", "layout");
  return { success: "Einstellungen gespeichert." };
}
