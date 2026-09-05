"use client";

import { useActionState } from "react";
import { Check, Loader2, LockOpen, ShieldOff } from "lucide-react";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { Panel } from "@/components/ui/Panel";
import { restoreSuspendedAction, suspendNonAdminsAction, type AdminFormState } from "@/lib/actions/admin";

const initialState: AdminFormState = {};

/**
 * Whitelist vorübergehend aussetzen – etwa für Wartung oder wenn auf dem Server
 * etwas schiefläuft und erst einmal Ruhe einkehren soll.
 *
 * Admins bleiben freigeschaltet, sonst käme hinterher niemand mehr hinein, um
 * es rückgängig zu machen. Beide Richtungen stehen nebeneinander: Ein
 * Aussetzen ohne sichtbaren Weg zurück wäre eine Falle.
 */
export function WhitelistSuspendPanel({
  ausgesetzt,
  vorgemerkt,
  startText,
}: {
  ausgesetzt: number;
  /** Freigegeben, aber noch nicht auf dem Server (siehe lib/whitelist-queue). */
  vorgemerkt: number;
  /** Wann der Server startet – `null`, wenn der Start schon vorbei ist. */
  startText: string | null;
}) {
  const [aussetzen, aussetzenAction, aussetzenLaeuft] = useActionState(suspendNonAdminsAction, initialState);
  const [zurueck, zurueckAction, zurueckLaeuft] = useActionState(restoreSuspendedAction, initialState);

  return (
    <Panel className="p-5">
      <p className="text-sm leading-relaxed text-cream/70">
        Nimmt alle außer Admins von der Server-Whitelist. In der Datenbank bleiben sie freigeschaltet – deshalb holt der
        zweite Knopf sie vollständig zurück. Ist der Server dann gerade aus, werden sie vorgemerkt und kommen dran,
        sobald er wieder läuft.
      </p>

      {vorgemerkt > 0 && (
        <p className="mt-3 rounded-lg border border-diamond-400/40 bg-diamond-500/10 p-3 text-sm text-diamond-100">
          {vorgemerkt} {vorgemerkt === 1 ? "Spieler ist vorgemerkt und kommt" : "Spieler sind vorgemerkt und kommen"}{" "}
          {startText
            ? `zum Serverstart am ${startText} Uhr gemeinsam auf die Whitelist.`
            : "auf die Whitelist, sobald der Server läuft."}
        </p>
      )}

      {ausgesetzt > 0 && (
        <p className="mt-3 rounded-lg border border-brass-400/40 bg-brass-500/10 p-3 text-sm text-brass-100">
          Gerade ausgesetzt: {ausgesetzt} {ausgesetzt === 1 ? "Spieler" : "Spieler"}.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <form action={aussetzenAction}>
          <ConfirmSubmit
            label="Alle außer Admins aussetzen"
            title="Entfernt alle Nicht-Admins von der Server-Whitelist"
            confirmLabel="Wirklich aussetzen"
          />
        </form>

        <form action={zurueckAction}>
          <button type="submit" disabled={zurueckLaeuft} className="btn btn-outline btn-sm disabled:opacity-50">
            {zurueckLaeuft ? <Loader2 className="size-4 animate-spin" /> : <LockOpen className="size-4" />}
            Aussetzung aufheben
          </button>
        </form>

        {aussetzenLaeuft && (
          <span className="flex items-center gap-1.5 text-xs text-cream/60">
            <ShieldOff className="size-3.5 animate-pulse" /> Befehle laufen …
          </span>
        )}
      </div>

      {[aussetzen, zurueck].map((zustand, index) => (
        <div key={index}>
          {zustand.error && <p className="mt-3 text-sm text-rose-300">{zustand.error}</p>}
          {zustand.success && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-300">
              <Check className="size-4" /> {zustand.success}
            </p>
          )}
        </div>
      ))}
    </Panel>
  );
}
