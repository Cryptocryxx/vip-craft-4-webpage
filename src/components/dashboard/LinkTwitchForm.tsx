"use client";

import { useActionState, useState } from "react";
import { Check, Link2, Loader2, Unlink } from "lucide-react";
import { linkTwitchNameAction, unlinkTwitchNameAction, type ProfileFormState } from "@/lib/actions/profile";
import { TwitchIcon } from "@/components/ui/TwitchIcon";

const initialState: ProfileFormState = {};

export function LinkTwitchForm({ currentName }: { currentName: string | null }) {
  const [state, formAction, pending] = useActionState(linkTwitchNameAction, initialState);
  const [editing, setEditing] = useState(currentName === null);

  /**
   * Nach erfolgreichem Speichern zurueck in die kompakte Ansicht, wo die
   * Erfolgsmeldung steht. Ohne das blieb das Formular offen und der Erfolg
   * wurde nirgends angezeigt – es sah aus, als waere nichts passiert.
   *
   * Verglichen wird die Objekt-Identitaet: useActionState liefert bei jedem
   * Durchlauf ein neues Objekt, auch wenn der Text derselbe ist.
   */
  const [vorherigerZustand, setVorherigerZustand] = useState(state);
  if (state !== vorherigerZustand) {
    setVorherigerZustand(state);
    if (state.success && editing) setEditing(false);
  }

  if (currentName && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setEditing(true)} className="btn btn-outline btn-sm">
          <Link2 className="size-3.5" /> Kanal ändern
        </button>
        <form action={unlinkTwitchNameAction}>
          <button type="submit" className="btn btn-ghost btn-sm text-rose-200 hover:text-rose-100">
            <Unlink className="size-3.5" /> Trennen
          </button>
        </form>
        {state.success && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
            <Check className="size-3.5" /> {state.success}
          </span>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor="twitchName" className="block text-xs font-semibold tracking-wider text-cream/60 uppercase">
        Twitch-Kanal
      </label>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <TwitchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-cream/35" />
          <input
            id="twitchName"
            name="twitchName"
            type="text"
            defaultValue={currentName ?? ""}
            placeholder="deinkanal"
            maxLength={80}
            required
            autoComplete="off"
            className="input pl-9 font-mono"
          />
        </div>
        <button type="submit" disabled={pending} className="btn btn-brass btn-md shrink-0">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
          Verknüpfen
        </button>
        {currentName && (
          <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost btn-md shrink-0">
            Abbrechen
          </button>
        )}
      </div>
      {state.error && <p className="text-xs text-rose-300">{state.error}</p>}
      {state.success && (
        <p className="inline-flex items-center gap-1 text-xs text-emerald-300">
          <Check className="size-3.5" /> {state.success}
        </p>
      )}
      <p className="text-xs text-cream/45">
        Nur der Kanalname, also der Teil hinter <span className="font-mono">twitch.tv/</span>. Eine komplette Adresse
        funktioniert auch. Dein Stream erscheint dann automatisch auf der Streams-Seite, sobald du live gehst.
      </p>
    </form>
  );
}
