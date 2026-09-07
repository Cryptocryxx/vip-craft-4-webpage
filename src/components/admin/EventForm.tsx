"use client";

import { useActionState, useState } from "react";
import { CalendarPlus, Check, Loader2, Save } from "lucide-react";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { Panel } from "@/components/ui/Panel";
import { createEventAction, deleteEventAction, updateEventAction, type EventFormState } from "@/lib/actions/events";
import { EVENT_TYPES } from "@/lib/event-kinds";

const initialState: EventFormState = {};

/** Beschriftungen der Arten – dieselben Werte wie im Namespace "EventTypes". */
const artLabel: Record<string, string> = {
  race: "Zugrennen",
  contest: "Build-Contest",
  boss: "Boss-Fight",
  workshop: "Workshop",
  meeting: "Community",
  party: "Party",
};

export type EventEntwurf = {
  id: string;
  title: string;
  description: string;
  titleEn: string;
  descriptionEn: string;
  /** "2026-09-20T15:00", Berliner Uhr – siehe lib/zeit.ts. */
  start: string;
  end: string;
  location: string;
  host: string;
  type: string;
  countdown: boolean;
};

type Props = {
  /** Gesetzt = bestehenden Termin bearbeiten, fehlt = neuen anlegen. */
  event?: EventEntwurf;
};

function Feld({
  label,
  hinweis,
  children,
  className = "",
}: {
  label: string;
  hinweis?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">{label}</span>
      {children}
      {hinweis && <span className="mt-1 block text-xs text-cream/45">{hinweis}</span>}
    </label>
  );
}

/**
 * Termin anlegen oder bearbeiten.
 *
 * Zeiten werden als Berliner Uhrzeit eingegeben – dieselbe, nach der auf dem
 * Server gespielt wird. Umgerechnet wird beim Speichern (lib/zeit.ts), damit es
 * keine Rolle spielt, wo die Website läuft.
 */
export function EventForm({ event }: Props) {
  const bearbeiten = Boolean(event);
  const [state, formAction, pending] = useActionState(
    bearbeiten ? updateEventAction : createEventAction,
    initialState,
  );
  const [countdown, setCountdown] = useState(event?.countdown ?? false);

  return (
    <Panel className="p-5">
      <form action={formAction} className="space-y-4">
        {event && <input type="hidden" name="eventId" value={event.id} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Feld label="Titel" className="sm:col-span-2">
            <input
              name="title"
              type="text"
              defaultValue={event?.title}
              required
              minLength={3}
              maxLength={120}
              placeholder="z. B. Zugrennen quer durch die Welt"
              className="input"
            />
          </Feld>

          <Feld label="Beschreibung" className="sm:col-span-2">
            <textarea
              name="description"
              rows={3}
              defaultValue={event?.description}
              required
              minLength={10}
              maxLength={2000}
              placeholder="Was passiert, wer mitmachen kann, was man mitbringen sollte."
              className="input resize-y"
            />
          </Feld>

          <Feld label="Start" hinweis="Uhrzeit wie auf dem Server (Berlin).">
            <input name="start" type="datetime-local" defaultValue={event?.start} required className="input" />
          </Feld>

          <Feld label="Ende" hinweis="Freiwillig – ohne Ende zählt der Termin bis zum Start als kommend.">
            <input name="end" type="datetime-local" defaultValue={event?.end} className="input" />
          </Feld>

          <Feld label="Ort">
            <input
              name="location"
              type="text"
              defaultValue={event?.location}
              required
              minLength={2}
              maxLength={80}
              placeholder="z. B. Spawn"
              className="input"
            />
          </Feld>

          <Feld label="Veranstalter">
            <input
              name="host"
              type="text"
              defaultValue={event?.host}
              required
              minLength={2}
              maxLength={80}
              placeholder="z. B. Team"
              className="input"
            />
          </Feld>

          <Feld label="Art">
            <select name="type" defaultValue={event?.type ?? "meeting"} className="input">
              {EVENT_TYPES.map((art) => (
                <option key={art} value={art}>
                  {artLabel[art] ?? art}
                </option>
              ))}
            </select>
          </Feld>

          <div className="flex items-end">
            <label className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
              <input
                type="checkbox"
                name="countdown"
                checked={countdown}
                onChange={(e) => setCountdown(e.target.checked)}
                className="mt-0.5 size-4 accent-emerald-400"
              />
              <span>
                <span className="block font-display text-sm font-semibold text-cream">Countdown auf der Startseite</span>
                <span className="mt-0.5 block text-xs text-cream/55">
                  Sind mehrere angehakt, zählt die Startseite zum nächsten davon herunter.
                </span>
              </span>
            </label>
          </div>
        </div>

        <details className="rounded-lg border border-white/10 bg-black/15 p-3">
          <summary className="cursor-pointer text-sm text-cream/70">Englische Fassung (freiwillig)</summary>
          <p className="mt-2 text-xs text-cream/45">
            Bleibt das leer, steht auf der englischen Seite derselbe deutsche Text.
          </p>
          <div className="mt-3 space-y-3">
            <Feld label="Titel (EN)">
              <input name="titleEn" type="text" defaultValue={event?.titleEn} maxLength={120} className="input" />
            </Feld>
            <Feld label="Beschreibung (EN)">
              <textarea
                name="descriptionEn"
                rows={3}
                defaultValue={event?.descriptionEn}
                maxLength={2000}
                className="input resize-y"
              />
            </Feld>
          </div>
        </details>

        {state.error && <p className="text-sm text-rose-300">{state.error}</p>}
        {state.success && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-300">
            <Check className="size-4" /> {state.success}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={pending} className="btn btn-brass btn-md disabled:opacity-50">
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : bearbeiten ? (
              <Save className="size-4" />
            ) : (
              <CalendarPlus className="size-4" />
            )}
            {bearbeiten ? "Speichern" : "Termin anlegen"}
          </button>
        </div>
      </form>

      {event && (
        // Eigenes Formular: Ein zweiter Knopf im Formular oben wuerde beim
        // Absenden die Termindaten mitschicken statt zu loeschen.
        <form action={deleteEventAction.bind(null, event.id)} className="mt-3 flex justify-end border-t border-white/5 pt-3">
          <ConfirmSubmit label="Termin löschen" confirmLabel="Endgültig löschen" />
        </form>
      )}
    </Panel>
  );
}
