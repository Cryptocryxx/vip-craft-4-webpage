/**
 * Die Schritte bis zum Mitspielen – an einer Stelle beschrieben.
 *
 * Gebraucht wird die Liste an zwei Orten: in der Checkliste im Dashboard und
 * im Hinweis auf der Startseite, der den nächsten offenen Schritt zeigt. Lägen
 * die Bedingungen doppelt vor, würden sie über kurz oder lang auseinanderlaufen
 * und beide Stellen etwas anderes behaupten.
 *
 * Bewusst ohne JSX und ohne Datenbankzugriff, damit die Datei überall
 * verwendbar bleibt – die Knöpfe hängt das Dashboard über `schluessel` an.
 */

export type SchrittSchluessel = "login" | "gamertag" | "discord" | "modpack";

export type SchrittBeschreibung = {
  schluessel: SchrittSchluessel;
  titel: string;
  text: string;
  erledigt: boolean;
};

export type SchrittLage = {
  gamertagDa: boolean;
  discordJoined: boolean;
  /** Ohne DISCORD_GUILD_ID lässt sich die Mitgliedschaft nicht abfragen. */
  discordCheckable: boolean;
  modpackGeladen: boolean;
};

export function whitelistSchritte(lage: SchrittLage): SchrittBeschreibung[] {
  return [
    {
      schluessel: "login",
      titel: "Mit Discord angemeldet",
      text: "Erledigt – sonst wärst du nicht hier.",
      erledigt: true,
    },
    {
      schluessel: "gamertag",
      titel: "Minecraft-Username eintragen",
      text: "Ohne deinen Username kann das Team dich nicht freischalten. Trag ihn unten ein.",
      erledigt: lage.gamertagDa,
    },
    {
      schluessel: "discord",
      titel: "Unserem Discord beitreten",
      text: lage.discordCheckable
        ? "Pflicht: Ohne Discord ist dein Antrag unvollständig. Dort läuft die Absprache, und dort bekommst du Bescheid."
        : "Pflicht: Ohne Discord ist dein Antrag unvollständig. Das Team sieht vor der Freigabe nach, ob du drin bist.",
      // Ohne Pruefmoeglichkeit bleibt der Schritt offen: Wir wissen es schlicht nicht.
      erledigt: lage.discordCheckable && lage.discordJoined,
    },
    {
      schluessel: "modpack",
      titel: "Modpack herunterladen",
      text: "Ohne das Modpack kommst du nicht auf den Server. Läuft über den CurseForge- oder Prism-Launcher.",
      erledigt: lage.modpackGeladen,
    },
  ];
}

/** Der erste offene Schritt – oder `null`, wenn alles erledigt ist. */
export function naechsterSchritt(lage: SchrittLage): SchrittBeschreibung | null {
  return whitelistSchritte(lage).find((schritt) => !schritt.erledigt) ?? null;
}
