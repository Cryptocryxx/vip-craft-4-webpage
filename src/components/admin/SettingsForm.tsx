"use client";

import { useActionState } from "react";
import { Check, Loader2, Save } from "lucide-react";
import { updateSettingsAction, type AdminFormState } from "@/lib/actions/admin";
import type { SiteSettings } from "@/lib/settings-types";

const initialState: AdminFormState = {};

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-4">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-4 accent-emerald-400" />
      <span>
        <span className="block font-display font-semibold text-cream">{label}</span>
        <span className="mt-0.5 block text-xs text-cream/55">{hint}</span>
      </span>
    </label>
  );
}

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">Server-Adresse</span>
          <input name="serverIp" type="text" defaultValue={settings.serverIp} required className="input font-mono" />
          <span className="mt-1 block text-xs text-cream/45">
            Wird im Header-Widget geprüft und über den Join-Button kopiert.
          </span>
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">Karten-URL</span>
          <input name="mapUrl" type="url" defaultValue={settings.mapUrl} required className="input font-mono" />
          <span className="mt-1 block text-xs text-cream/45">BlueMap-Instanz für die Map-Seite.</span>
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">Discord-Einladung</span>
          <input name="discordInvite" type="url" defaultValue={settings.discordInvite} required className="input font-mono" />
          <span className="mt-1 block text-xs text-cream/45">Ziel aller „Discord beitreten“-Buttons.</span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Toggle
          name="whitelistOpen"
          label="Whitelist-Anträge annehmen"
          hint="Aus: neue Logins erzeugen keinen Antrag mehr und das Formular ist gesperrt."
          defaultChecked={settings.whitelistOpen}
        />
        <Toggle
          name="announcementActive"
          label="Ankündigungsbanner anzeigen"
          hint="Blendet den Text unten über dem Header auf allen Seiten ein."
          defaultChecked={settings.announcementActive}
        />
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">Ankündigung</span>
        <textarea
          name="announcement"
          rows={2}
          maxLength={300}
          defaultValue={settings.announcement}
          placeholder="z. B. Wartungsarbeiten am Samstag ab 14 Uhr"
          className="input resize-y"
        />
      </label>

      {state.error && <p className="text-sm text-rose-300">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-300">
          <Check className="size-4" /> {state.success}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-brass btn-md">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Einstellungen speichern
      </button>
    </form>
  );
}
