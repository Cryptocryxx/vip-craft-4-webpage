/**
 * Beschimpfungen in freien Texten erkennen.
 *
 * Gebraucht für die Begründung eines Kopfgeldes: Die steht öffentlich auf der
 * Website UND geht als Chatnachricht an alle auf dem Server. Beides erreicht
 * genau die Person, um die es geht – ohne Prüfung wäre das eine bequeme Bühne,
 * jemanden vor versammelter Mannschaft zu beleidigen.
 *
 * Bewusst ohne Datenbank- und ohne "server-only"-Import, damit auch das
 * Formular im Browser dieselbe Prüfung fahren kann.
 *
 * WAS DAS HIER NICHT KANN, und das gehört dazugesagt: Es erkennt bekannte
 * Wörter, nicht Bosheit. „Du warst gestern echt erbärmlich" kommt durch. Es ist
 * eine Hürde gegen das Offensichtliche, kein Ersatz dafür, dass jemand ein Auge
 * darauf hat – Kopfgelder stehen im Kontrollraum und lassen sich entfernen.
 */

/**
 * Zeichen, die gern als Buchstaben durchgehen sollen. Ohne diese Ersetzungen
 * reicht ein „Idi0t", um an jeder Wortliste vorbeizukommen.
 */
const VERSTELLT: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "6": "g",
  "7": "t",
  "8": "b",
  "9": "g",
  "@": "a",
  $: "s",
  "!": "i",
  "|": "i",
  "+": "t",
};

/** Kleinschreibung, Akzente weg, ß zu ss – die gemeinsame Grundlage. */
function grundform(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss");
}

/**
 * Text auf eine vergleichbare Form bringen: Grundform, Verstellungen
 * zurückgesetzt, alles zusammengezogen und Wiederholungen gekürzt.
 *
 * Damit fallen „I.d.i.o.t", „Idi0t" und „Idiooooot" auf dasselbe zusammen.
 */
export function normalisiere(text: string): string {
  const ersetzt = [...grundform(text)].map((zeichen) => VERSTELLT[zeichen] ?? zeichen).join("");
  return ersetzt.replace(/[^a-z]/g, "").replace(/(.)\1{2,}/g, "$1$1");
}

/**
 * Wortstämme, die praktisch nur in Beschimpfungen vorkommen.
 *
 * Als Teilzeichenkette geprüft, denn im Deutschen wird zusammengesetzt
 * („Vollidiot", „Dreckschwein"). Deshalb steht hier nichts Mehrdeutiges:
 * „opfer" träfe sonst „Brandopfer", „sau" träfe „Sauerstoff". Ein Kopfgeld an
 * einem Fehlalarm scheitern zu lassen ist ärgerlicher als eine derbe
 * Begründung – solche Wörter stehen deshalb unten bei den ganzen Wörtern.
 */
const STAEMME = [
  // deutsch
  "arschloch",
  "arschgesicht",
  "wichser",
  "wixer",
  "hurensohn",
  "hurentochter",
  "hundesohn",
  "schlampe",
  "fotze",
  "missgeburt",
  "spasti",
  "schwuchtel",
  "kanake",
  "untermensch",
  "abschaum",
  "drecksau",
  "dreckschwein",
  "dreckstueck",
  "vollidiot",
  "vollpfosten",
  "schwachkopf",
  "hirnlos",
  "idiot",
  "trottel",
  "nutte",
  // englisch
  "asshole",
  "motherfucker",
  "fucker",
  "fucking",
  "bitch",
  "bastard",
  "cunt",
  "whore",
  "retard",
  "faggot",
  "nigger",
  "nigga",
  "dickhead",
  "douchebag",
  "scumbag",
  "wanker",
].map(grundform);

/**
 * Wörter, die nur ALS GANZES zählen.
 *
 * „hure" steckt in „Fuhre", „arsch" in „Arschbombe", „mongo" in „Mongolei",
 * „sau" in „Sauerstoff". Für diese Gruppe wird deshalb Wort für Wort geprüft
 * statt auf Teilzeichenketten.
 *
 * Bewusst NICHT dabei: „dumm" und „blöd". „Das war dumm von ihm" ist eine
 * Feststellung, keine Beschimpfung, und wer für so etwas abgewiesen wird,
 * versteht die Ablehnung nicht.
 */
const GANZE_WOERTER = [
  "hure",
  "fick",
  "ficken",
  "fickt",
  "arsch",
  "sau",
  "mongo",
  "spast",
  "opfer",
  "penner",
  "pisser",
  "depp",
  "bastard",
  "kacke",
  "scheisse",
  "wichs",
  "fuck",
  "shit",
  "bitch",
  "slut",
].map(grundform);

/** Trifft eines der ganzen Wörter zu? */
function ganzesWortTrifft(text: string): boolean {
  const woerter = grundform(text).split(/[^a-z]+/).filter(Boolean);
  return woerter.some((wort) => GANZE_WOERTER.includes(wort));
}

/** Steckt eine Beschimpfung darin? */
export function enthaeltBeleidigung(text: string): boolean {
  if (!text) return false;
  if (STAEMME.some((stamm) => normalisiere(text).includes(stamm))) return true;
  return ganzesWortTrifft(text);
}

/**
 * Macht einen Text tauglich für eine Konsolenzeile und für den Chat.
 *
 * Nur eine erlaubte Zeichenmenge kommt durch, alles andere wird zu einem
 * Leerzeichen. Absichtlich strenger als nötig:
 *
 * ▸ Das Paragraphenzeichen ist in Minecraft das Steuerzeichen für Farbe und
 *   Formatierung. Bliebe es stehen, könnte sich jemand eine Nachricht bauen,
 *   die wie eine Servermeldung aussieht.
 * ▸ Zeilenumbrüche würden den Konsolenbefehl in zwei Befehle zerlegen.
 *
 * Die Länge ist gedeckelt, weil der Text als Teil eines Konsolenbefehls
 * verschickt wird – runPlayerCommand kappt die ganze Zeile bei 200 Zeichen,
 * und was dort abgeschnitten würde, fehlte im Chat mitten im Satz.
 */
export function fuerKonsole(text: string, maxLaenge = 90): string {
  return text
    .replace(/[^\p{L}\p{N} .,!?'()\-:]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLaenge)
    .trim();
}
