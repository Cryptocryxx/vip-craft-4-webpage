import { Lock } from "lucide-react";
import { Panel } from "@/components/ui/Panel";

/**
 * Steht in den Bereichen, die dem Admin vorbehalten sind.
 *
 * Moderatoren sehen die beiden Punkte in der Navigation gar nicht erst – das
 * hier ist die zweite Schicht für den Fall, dass jemand die Adresse direkt
 * eintippt. Die dritte sitzt in den Server Actions selbst.
 */
export function AdminOnly({ bereich }: { bereich: string }) {
  return (
    <Panel className="p-10 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full border-2 border-rose-300/60 bg-rose-500/15 text-rose-200">
        <Lock className="size-6" />
      </span>
      <h2 className="mt-4 font-display text-xl font-bold text-cream">Nur für Admins</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-cream/70">
        {bereich} bleibt beim Admin. Alles andere im Kontrollraum steht dir als Moderator offen.
      </p>
    </Panel>
  );
}
