/**
 * Absturz oder geplantes Herunterfahren? Entscheidet sich am Server-Log.
 *
 * Ein sauberer Stopp (Konsolen-`stop`, Crafty-Stopp-Knopf, dieser Kontrollraum)
 * hinterlässt in `logs/latest.log` immer dieselbe Abschiedssequenz. Fehlt die,
 * ist der Prozess unvermittelt weggebrochen – genau der Fall, für den es den
 * automatischen Neustart gibt.
 *
 * Ausgewertet wird ausschließlich das Ende des Logs, und zwar nach der Regel
 * „der letzte Treffer gewinnt". Damit stört es nicht, dass Modpacks wie dieses
 * beim Start reihenweise harmlose Exceptions ins Log schreiben: die stehen weit
 * vor dem Ende. Reine Vermutungen über den Grund gibt es nicht – wenn gar nichts
 * passt, sagt das Ergebnis das auch.
 */

export type ShutdownVerdict = {
  kind: "stopped" | "crashed" | "unknown";
  /** Die Log-Zeile, die den Ausschlag gegeben hat. */
  evidence: string | null;
};

/**
 * Zeilen, die es NUR beim geordneten Herunterfahren gibt.
 *
 * Am echten Log dieses Servers geprüft: Diese vier stehen genau einmal drin,
 * nämlich in der Abschiedssequenz. Die naheliegenden Kandidaten „Saving chunks
 * for level", „All chunks are saved" und „All dimensions are saved" gehören
 * ausdrücklich NICHT dazu – die schreibt Minecraft bei jedem Autosave, also
 * auch kurz bevor ein Absturz passiert. Mit ihnen in der Liste würde fast jeder
 * Absturz als sauberer Stopp durchgehen und der Neustart bliebe aus.
 */
const STOP_MARKERS = ["stopping the server", "stopping server", "saving players", "saving worlds"];

/**
 * Absturzmuster. Bewusst eng gefasst: ein nacktes "exception" wäre bei einem
 * Create-Modpack wertlos, weil KubeJS beim Start Dutzende davon protokolliert.
 */
const CRASH_MARKERS = [
  "java.lang.outofmemoryerror",
  "there is insufficient memory for the java runtime environment",
  "crash report saved to",
  "crash-reports/crash-",
  "exception in server tick loop",
  'exception in thread "main"',
  "encountered an unexpected exception",
  "considering it to be crashed",
  "this crash report has been saved to",
  "the game crashed",
  "fatal error has been detected by the java runtime environment",
];

/** Wie viele Zeilen vom Ende her betrachtet werden. */
const TAIL_LINES = 400;

function lastMatch(lines: string[], markers: string[]): { index: number; line: string } | null {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const haystack = lines[index].toLowerCase();
    if (markers.some((marker) => haystack.includes(marker))) {
      return { index, line: lines[index].trim() };
    }
  }
  return null;
}

export function classifyShutdown(logLines: string[]): ShutdownVerdict {
  const tail = logLines.slice(-TAIL_LINES);
  if (tail.length === 0) return { kind: "unknown", evidence: null };

  const stop = lastMatch(tail, STOP_MARKERS);
  const crash = lastMatch(tail, CRASH_MARKERS);

  if (stop && crash) {
    return crash.index > stop.index
      ? { kind: "crashed", evidence: crash.line }
      : { kind: "stopped", evidence: stop.line };
  }
  if (crash) return { kind: "crashed", evidence: crash.line };
  if (stop) return { kind: "stopped", evidence: stop.line };

  return { kind: "unknown", evidence: tail[tail.length - 1]?.trim() ?? null };
}

/** Ein Satz fürs Protokoll, der die Entscheidung nachvollziehbar macht. */
export function describeVerdict(verdict: ShutdownVerdict): string {
  switch (verdict.kind) {
    case "stopped":
      return `Sauberes Herunterfahren im Log gefunden: „${verdict.evidence}"`;
    case "crashed":
      return `Absturz im Log gefunden: „${verdict.evidence}"`;
    case "unknown":
      return verdict.evidence
        ? `Kein sauberes Herunterfahren im Log – letzte Zeile: „${verdict.evidence}"`
        : "Log ist leer oder nicht lesbar.";
  }
}
