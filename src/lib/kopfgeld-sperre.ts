/**
 * Kopfgeld-Regel: Wer mit dem Ziel zusammen in einer Numismatics-Organisation
 * steht, kassiert kein Kopfgeld auf dieses Ziel.
 *
 * Eine Organisation ist auf dem Server ein Blaze-Banker-Konto; Mitglied ist,
 * wer auf dessen Vertrauensliste steht (siehe lib/economy-source.ts). Ohne die
 * Regel könnten sich zwei Mitglieder gegenseitig Kopfgelder abholen – das Geld
 * wandert dann nur von einem Konto aufs andere, und die Kasse der Firma
 * bezahlt sich über den Umweg des Ausschreibers selbst.
 *
 * Absichtlich ohne Datenbank und ohne Server: Alles, was nachgeschlagen werden
 * muss, kommt als Funktion herein. So lässt sich genau die Entscheidung prüfen,
 * die im Betrieb über Geld bestimmt (siehe Test im Scratchpad).
 */

/** Eine Organisation mit den UUIDs ihrer Mitglieder (klein geschrieben). */
export type OrganisationsMitglieder = { name: string; mitglieder: ReadonlySet<string> };

/** Ein Kill, der für ein Kopfgeld in Frage kommt – in der Reihenfolge des Spielprotokolls. */
export type KillKandidat = { seq: number; jaeger: string };

/** Ein Kill, der nicht zählt, weil Jäger und Ziel dieselbe Organisation teilen. */
export type GesperrterKill<K extends KillKandidat> = { kandidat: K; jaegerUuid: string; organisation: string };

export type KillAuswahl<K extends KillKandidat> =
  /** Dieser Kill zählt – auszahlen. */
  | { art: "treffer"; kandidat: K; jaegerUuid: string; gesperrt: GesperrterKill<K>[] }
  /** Kein Kill zählt (keiner da oder alle unter Mitgliedern). */
  | { art: "keiner"; gesperrt: GesperrterKill<K>[] }
  /**
   * Nicht entscheidbar – später noch einmal. Bewusst KEINE Auszahlung: Eine
   * Sperre, die bei einem Lesefehler einfach aufgeht, wäre keine.
   */
  | { art: "warten"; grund: string; gesperrt: GesperrterKill<K>[] };

/** Die erste Organisation, in der beide stehen – oder null. */
export function gemeinsameOrganisation(
  organisationen: readonly OrganisationsMitglieder[],
  uuidA: string,
  uuidB: string,
): string | null {
  const a = uuidA.toLowerCase();
  const b = uuidB.toLowerCase();
  if (a === b) return null;
  return organisationen.find((o) => o.mitglieder.has(a) && o.mitglieder.has(b))?.name ?? null;
}

/**
 * Geht die Kills der Reihe nach durch und nimmt den ersten, der zählt.
 *
 * Ein gesperrter Kill beendet die Suche NICHT: Erwischt danach jemand
 * Außenstehendes das Ziel, bekommt der das Kopfgeld. Die gesperrten kommen
 * trotzdem mit zurück, damit der Aufrufer sie vermerken und einmal ansagen
 * kann.
 *
 * Die Organisationen werden erst geladen, wenn es überhaupt einen Kandidaten
 * gibt – und höchstens einmal, auch bei mehreren Kandidaten.
 */
export async function waehleKill<K extends KillKandidat>(
  kandidaten: readonly K[],
  zielUuid: string | null,
  uuidFuer: (name: string) => Promise<string | null>,
  ladeOrganisationen: () => Promise<readonly OrganisationsMitglieder[] | null>,
): Promise<KillAuswahl<K>> {
  const gesperrt: GesperrterKill<K>[] = [];
  if (kandidaten.length === 0) return { art: "keiner", gesperrt };

  if (!zielUuid) {
    return { art: "warten", grund: "Keine UUID zum Ziel – Organisation nicht prüfbar, Auszahlung wartet", gesperrt };
  }

  const organisationen = await ladeOrganisationen();
  if (organisationen === null) {
    return { art: "warten", grund: "Organisationen nicht lesbar – Auszahlung wartet", gesperrt };
  }

  for (const kandidat of kandidaten) {
    const jaegerUuid = await uuidFuer(kandidat.jaeger);
    if (!jaegerUuid) {
      return { art: "warten", grund: `Keine UUID zu ${kandidat.jaeger} gefunden - Auszahlung steht aus`, gesperrt };
    }

    const organisation = gemeinsameOrganisation(organisationen, zielUuid, jaegerUuid);
    if (organisation !== null) {
      gesperrt.push({ kandidat, jaegerUuid, organisation });
      continue;
    }
    return { art: "treffer", kandidat, jaegerUuid, gesperrt };
  }
  return { art: "keiner", gesperrt };
}

/**
 * Den Namen einer Organisation für den Konsolenbefehl entschärfen.
 *
 * Den Namen vergibt ein Spieler am Blaze Banker, er ist also beliebiger Text.
 * Er geht als letztes Wort in `vipkopfgeld gesperrt …` und von dort in den
 * Chat – erlaubt sind nur Buchstaben, Ziffern und harmlose Satzzeichen, kein
 * Paragraphenzeichen (Chatfarben), kein Schrägstrich. Bleibt nichts übrig,
 * steht "-" da, und das Skript sagt "in derselben Organisation".
 */
export function organisationFuerChat(name: string): string {
  const sauber = name
    .replace(/[^\p{L}\p{N} .,&'()+-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40)
    .trim();
  return sauber.length > 0 && sauber !== "-" ? sauber : "-";
}
