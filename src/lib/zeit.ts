/**
 * Umrechnung zwischen der Uhr, die im Kontrollraum eingetippt wird, und dem
 * Zeitpunkt, der in der Datenbank steht.
 *
 * Ein `<input type="datetime-local">` liefert "2026-09-20T15:00" ganz ohne
 * Zeitzone. Serverstart, Spieler und Termine laufen aber alle nach der Uhr in
 * Berlin, und der Website-Server kann anderswo stehen – „15:00" muss also
 * ausdrücklich als Berliner Zeit gelesen werden, sonst verschiebt sich jeder
 * Termin um den Versatz der Serverzeitzone.
 *
 * Sommerzeit inklusive: Der Versatz wird für den jeweiligen Zeitpunkt bei
 * `Intl` erfragt (im Sommer +2, im Winter +1 Stunde), statt eine feste Zahl
 * anzunehmen.
 */

const ZEITZONE = "Europe/Berlin";

/** Wie weit Berlin zu diesem Zeitpunkt vor UTC liegt, in Millisekunden. */
function versatzMs(zeitpunkt: Date): number {
  const teile = new Intl.DateTimeFormat("en-US", {
    timeZone: ZEITZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(zeitpunkt);

  const feld = (typ: string) => Number(teile.find((t) => t.type === typ)?.value ?? "0");

  // Die Berliner Wanduhr so lesen, als wäre sie UTC. Der Abstand zur echten
  // UTC-Zeit ist genau der gesuchte Versatz.
  const alsUtcGelesen = Date.UTC(
    feld("year"),
    feld("month") - 1,
    feld("day"),
    // 24 statt 0 kommt bei hour12:false vor Mitternacht vor.
    feld("hour") % 24,
    feld("minute"),
    feld("second"),
  );

  return alsUtcGelesen - zeitpunkt.getTime();
}

/**
 * "2026-09-20T15:00" (Berliner Uhr) → echter Zeitpunkt.
 * Gibt `null` zurück, wenn die Eingabe kein Datum ist.
 */
export function berlinNachDatum(eingabe: string): Date | null {
  const sauber = eingabe.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(sauber)) return null;

  const mitSekunden = sauber.length === 16 ? `${sauber}:00` : sauber;
  const alsUtc = Date.parse(`${mitSekunden}Z`);
  if (Number.isNaN(alsUtc)) return null;

  /*
   * Zwei Durchgänge, weil der Versatz selbst vom Zeitpunkt abhängt: Der erste
   * schätzt ihn anhand der noch falsch gelesenen Zeit, der zweite prüft ihn am
   * fast richtigen Ergebnis nach. Das fängt die beiden Nächte im Jahr ab, in
   * denen die Uhr umgestellt wird.
   */
  const ersterVersuch = new Date(alsUtc - versatzMs(new Date(alsUtc)));
  return new Date(alsUtc - versatzMs(ersterVersuch));
}

/** Echter Zeitpunkt → "2026-09-20T15:00" für ein `datetime-local`-Feld. */
export function datumNachBerlin(zeitpunkt: Date): string {
  const teile = new Intl.DateTimeFormat("sv-SE", {
    timeZone: ZEITZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(zeitpunkt);

  // "sv-SE" liefert bereits "2026-09-20 15:00" – nur das Leerzeichen stört.
  return teile.replace(" ", "T");
}
