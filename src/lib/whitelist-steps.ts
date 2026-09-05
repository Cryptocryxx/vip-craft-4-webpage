import { getTranslations } from "next-intl/server";

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
 *
 * `async`, weil die Texte übersetzt werden – beide Aufrufer (onboarding.ts für
 * die Startseite, WhitelistStatus.tsx für die Checkliste) sind ohnehin
 * Server-Komponenten bzw. laufen in einem async-Kontext.
 */

export type SchrittSchluessel = "login" | "gamertag" | "discord" | "modpack";

export type SchrittBeschreibung = {
  schluessel: SchrittSchluessel;
  titel: string;
  text: string;
  erledigt: boolean;
  /** „warnung" für Dinge, die kaputt sind – nicht bloß noch offen. */
  ton?: "hinweis" | "warnung";
};

export type SchrittLage = {
  gamertagDa: boolean;
  /** Mojang kennt den hinterlegten Namen nicht (siehe lib/name-check.ts). */
  nameUngueltig: boolean;
  discordJoined: boolean;
  /** Ohne DISCORD_GUILD_ID lässt sich die Mitgliedschaft nicht abfragen. */
  discordCheckable: boolean;
  modpackGeladen: boolean;
};

export async function whitelistSchritte(lage: SchrittLage): Promise<SchrittBeschreibung[]> {
  const t = await getTranslations("WhitelistStepsContent");

  return [
    {
      schluessel: "login",
      titel: t("loginTitle"),
      text: t("loginText"),
      erledigt: true,
    },
    /*
     * Ein hinterlegter, aber ungueltiger Name ist schlimmer als gar keiner:
     * Er sieht erledigt aus, und der Whitelist-Befehl laeuft auf dem Server ins
     * Leere. Deshalb faellt der Schritt dann zurueck – mit deutlicherem Text.
     */
    lage.nameUngueltig
      ? {
          schluessel: "gamertag" as const,
          titel: t("gamertagInvalidTitle"),
          text: t("gamertagInvalidText"),
          erledigt: false,
          ton: "warnung" as const,
        }
      : {
          schluessel: "gamertag" as const,
          titel: t("gamertagTitle"),
          text: t("gamertagText"),
          erledigt: lage.gamertagDa,
        },
    {
      schluessel: "discord",
      titel: t("discordTitle"),
      text: lage.discordCheckable ? t("discordTextCheckable") : t("discordTextNotCheckable"),
      // Ohne Pruefmoeglichkeit bleibt der Schritt offen: Wir wissen es schlicht nicht.
      erledigt: lage.discordCheckable && lage.discordJoined,
    },
    {
      schluessel: "modpack",
      titel: t("modpackTitle"),
      text: t("modpackText"),
      erledigt: lage.modpackGeladen,
    },
  ];
}

/** Der erste offene Schritt – oder `null`, wenn alles erledigt ist. */
export async function naechsterSchritt(lage: SchrittLage): Promise<SchrittBeschreibung | null> {
  return (await whitelistSchritte(lage)).find((schritt) => !schritt.erledigt) ?? null;
}
