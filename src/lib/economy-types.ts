/**
 * Typen der Wirtschaftsseite (/economy).
 *
 * Alle Beträge stehen in Spurs – so liegen sie auch in der Bankdatei des
 * Servers. Angezeigt wird in Cog (siehe currency.ts), ein Cog sind 64 Spurs.
 *
 * Numismatics kennt zwei Kontoarten: persönliche Konten (`PLAYER`) und
 * Blaze-Banker-Konten (`BLAZE_BANKER`). Letztere sind das, was auf dem Server
 * als „Organisation" benutzt wird: ein Konto mit Namen, auf das mehrere
 * Spieler Zugriff haben.
 */

/** Ein Unterkonto einer Organisation – eine ausgegebene Bankkarte mit eigenem Limit. */
export type Unterkonto = {
  name: string;
  /** Wer damit zahlen darf: „Vertraute", „Vertraute + Automatik" oder „Alle". */
  zugriff: string;
  /** Ausgabegrenze in Spurs, `null` heißt unbegrenzt. */
  limitSpurs: number | null;
  /** Wie viel davon schon ausgegeben wurde. */
  ausgegebenSpurs: number;
};

/** Ein Blaze-Banker-Konto mit allem, was daran hängt. */
export type Organisation = {
  /** UUID des Kontos (gehört dem Banker-Block, nicht einem Spieler). */
  id: string;
  name: string;
  balanceSpurs: number;
  /** Spieler auf der Vertrauensliste – die „Mitglieder", ohne Doppelte. */
  mitglieder: string[];
  /** Anteil eines einzelnen Mitglieds: Guthaben durch Mitgliederzahl. */
  anteilSpurs: number;
  /** Wer eine Bankkarte für dieses Konto bei sich trägt. */
  kartentraeger: string[];
  unterkonten: Unterkonto[];
};

/** Eine Zeile der Vermögensrangliste. */
export type Vermoegen = {
  rank: number;
  player: string;
  /** Guthaben auf dem persönlichen Bankkonto. */
  balanceSpurs: number;
  /** Münzen in Inventar, Endertruhe, Rucksäcken und Curios-Slots. */
  bargeldSpurs: number;
  /** Summe der Anteile an allen Organisationen. */
  anteilSpurs: number;
  /** Konto + Bargeld + Anteile. Danach wird sortiert. */
  gesamtSpurs: number;
  /** Namen der Organisationen, an denen der Spieler beteiligt ist. */
  organisationen: string[];
};

export type EconomyOverview = {
  summary: {
    /** Alles zusammen: Bankguthaben plus Bargeld. */
    totalCirculationSpurs: number;
    /** Nur das, was auf Konten liegt. */
    bankSpurs: number;
    /** Nur die Münzen in den Inventaren. */
    bargeldSpurs: number;
    /** Der Teil der Bankguthaben, der auf Organisationskonten liegt. */
    organisationSpurs: number;
    accountCount: number;
    organisationCount: number;
  };
  /** Alle Spieler mit Vermögen, absteigend sortiert und durchnummeriert. */
  vermoegen: Vermoegen[];
  organisationen: Organisation[];
  /**
   * Woher die Kontostände kommen: direkt aus `world/data/numismatics_bank.dat`
   * („bankdatei", mit Mitgliedern und Unterkonten) oder ersatzweise aus dem
   * KubeJS-Export („export", nur Kontostände).
   */
  herkunft: "bankdatei" | "export" | "keine";
  /** Ob die Inventare gelesen werden konnten – sonst fehlt das Bargeld. */
  bargeldGezaehlt: boolean;
  /** Wann die Bankdatei zuletzt geschrieben wurde, z. B. „16.09. 14:46". */
  stand: string | null;
};

export const emptyEconomyOverview: EconomyOverview = {
  summary: {
    totalCirculationSpurs: 0,
    bankSpurs: 0,
    bargeldSpurs: 0,
    organisationSpurs: 0,
    accountCount: 0,
    organisationCount: 0,
  },
  vermoegen: [],
  organisationen: [],
  herkunft: "keine",
  bargeldGezaehlt: false,
  stand: null,
};
