/**
 * Die drei Rollen und wer was darf.
 *
 * Bewusst ohne Server-Abhängigkeiten, damit auch Client-Komponenten die
 * Beschriftungen benutzen können. Die Wachen selbst stehen in lib/admin.ts –
 * diese Datei beantwortet nur die Frage „welche Rolle ist das eigentlich".
 *
 * PLAYER    Normaler Account.
 * MODERATOR Alles zur Moderation: Anträge, Shops, Vorschläge, Spieler
 *           bearbeiten, kicken, bannen, Chat und Befehle einsehen.
 *           NICHT: Server-Steuerung, Einstellungen, Rollen vergeben,
 *           IP-Abfragen, Accounts löschen, Team-Accounts bearbeiten.
 * ADMIN     Alles.
 *
 * Warum IP und Rollen beim Admin bleiben: Eine IP-Adresse ist ein
 * personenbezogenes Datum (siehe Datenschutzerklärung), und wer Rollen vergeben
 * darf, kann sich selbst zum Admin machen – dann wäre die Trennung wertlos.
 */

export const ROLLEN = ["PLAYER", "MODERATOR", "ADMIN"] as const;
export type Rolle = (typeof ROLLEN)[number];

export const rollenLabel: Record<Rolle, string> = {
  PLAYER: "Spieler",
  MODERATOR: "Moderator",
  ADMIN: "Admin",
};

export function istRolle(wert: string): wert is Rolle {
  return (ROLLEN as readonly string[]).includes(wert);
}

/** Admin oder Moderator – wer den Kontrollraum überhaupt betreten darf. */
export function imTeam(rolle: string | null | undefined): boolean {
  return rolle === "ADMIN" || rolle === "MODERATOR";
}

export function istAdmin(rolle: string | null | undefined): boolean {
  return rolle === "ADMIN";
}

/** Beschriftung – auch dann brauchbar, wenn in der Spalte etwas Fremdes steht. */
export function rolleName(rolle: string): string {
  return istRolle(rolle) ? rollenLabel[rolle] : rolle;
}
