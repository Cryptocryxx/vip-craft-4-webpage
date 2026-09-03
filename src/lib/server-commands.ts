import "server-only";
import { craftyConfigured, craftySendCommand } from "@/lib/crafty";
import { prisma } from "@/lib/prisma";
import { GAMERTAG_RE } from "@/lib/whitelist-types";

/**
 * Alle Konsolenbefehle, die die Website absetzen darf.
 *
 * Bewusst als feste Vorlagen statt frei zusammengebauter Strings: Spielernamen
 * werden vorher gegen GAMERTAG_RE geprüft, sodass keine Leerzeichen oder
 * Sonderzeichen in den Befehl gelangen können. Jeder Aufruf wird protokolliert.
 */

export type CommandResult = { ok: true } | { ok: false; error: string };

type Actor = { id: string; name: string | null } | null;

async function run(command: string, reason: string, actor: Actor): Promise<CommandResult> {
  if (!craftyConfigured) {
    return { ok: false, error: "Crafty ist nicht konfiguriert – der Befehl wurde nicht abgeschickt." };
  }

  let success = false;
  let errorMessage: string | null = null;

  try {
    await craftySendCommand(command);
    success = true;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  try {
    await prisma.commandLog.create({
      data: {
        command,
        reason,
        success,
        error: errorMessage,
        actorId: actor?.id ?? null,
        actorName: actor?.name ?? null,
      },
    });
  } catch (logError) {
    // Ein fehlgeschlagenes Protokoll darf den Ablauf nicht blockieren.
    console.error("[commands] Protokoll konnte nicht geschrieben werden:", logError);
  }

  return success ? { ok: true } : { ok: false, error: errorMessage ?? "Unbekannter Fehler." };
}

function assertValidName(name: string): void {
  if (!GAMERTAG_RE.test(name)) {
    throw new Error(`Ungültiger Minecraft-Name: ${name}`);
  }
}

/** Spieler auf die Server-Whitelist setzen. */
export async function whitelistAdd(minecraftName: string, reason: string, actor: Actor): Promise<CommandResult> {
  try {
    assertValidName(minecraftName);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Ungültiger Name." };
  }
  return run(`whitelist add ${minecraftName}`, reason, actor);
}

/** Spieler von der Server-Whitelist entfernen. */
export async function whitelistRemove(minecraftName: string, reason: string, actor: Actor): Promise<CommandResult> {
  try {
    assertValidName(minecraftName);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Ungültiger Name." };
  }
  return run(`whitelist remove ${minecraftName}`, reason, actor);
}

/** Die letzten Protokolleinträge für den Kontrollraum. */
export async function recentCommands(limit = 20) {
  return prisma.commandLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
