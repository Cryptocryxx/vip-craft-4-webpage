"use client";

import { useActionState, useState } from "react";
import { Check, Link2, Loader2, Unlink } from "lucide-react";
import { linkMinecraftNameAction, unlinkMinecraftNameAction, type ProfileFormState } from "@/lib/actions/profile";

const initialState: ProfileFormState = {};

export function LinkMinecraftForm({ currentName }: { currentName: string | null }) {
  const [state, formAction, pending] = useActionState(linkMinecraftNameAction, initialState);
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
          <Link2 className="size-3.5" /> Username ändern
        </button>
        <form action={unlinkMinecraftNameAction}>
          <button type="submit" className="btn btn-ghost btn-sm text-rose-200 hover:text-rose-100">
            <Unlink className="size-3.5" /> Verknüpfung lösen
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
      <label htmlFor="minecraftName" className="block text-xs font-semibold tracking-wider text-cream/60 uppercase">
        Dein Minecraft-Username
      </label>
      <div className="flex gap-2">
        <input
          id="minecraftName"
          name="minecraftName"
          type="text"
          defaultValue={currentName ?? ""}
          placeholder="z. B. Steve_42"
          pattern="[A-Za-z0-9_]{3,16}"
          minLength={3}
          maxLength={16}
          required
          autoComplete="off"
          className="input font-mono"
        />
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
        Der Username wird für Whitelist und Statistiken genutzt. Groß-/Kleinschreibung wie im Spiel.
      </p>
    </form>
  );
}
