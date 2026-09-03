"use client";

import { useActionState } from "react";
import Image from "next/image";
import { Check, Loader2, Save, User } from "lucide-react";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { deleteUserAction, updateUserAction, type AdminFormState } from "@/lib/actions/admin";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { formatShortDate } from "@/lib/format";

const initialState: AdminFormState = {};

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  minecraftName: string | null;
  twitchName: string | null;
  whitelisted: boolean;
  role: string;
  createdAt: string;
  suggestionCount: number;
  applicationCount: number;
};

export function UserRow({ user, isSelf }: { user: AdminUserRow; isSelf: boolean }) {
  const [state, formAction, pending] = useActionState(updateUserAction, initialState);

  return (
    <div className="border-t border-white/5 p-4 first:border-t-0">
      <div className="flex flex-wrap items-center gap-3">
        {user.image ? (
          <Image src={user.image} alt="" width={36} height={36} className="rounded-full ring-1 ring-brass-500/40" />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-brass-500/20 text-brass-200">
            <User className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-bold text-cream">
            {user.name ?? "Unbekannt"}
            {isSelf && <span className="ml-2 text-xs font-normal text-cream/45">(du)</span>}
          </p>
          <p className="truncate text-xs text-cream/50">
            {user.email ?? "keine E-Mail"} · dabei seit {formatShortDate(user.createdAt)} · {user.suggestionCount}{" "}
            {user.suggestionCount === 1 ? "Beitrag" : "Beiträge"}
          </p>
        </div>
        {user.minecraftName && <PlayerHead name={user.minecraftName} size={28} />}
      </div>

      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
        <input type="hidden" name="userId" value={user.id} />

        <label className="flex-1 basis-48">
          <span className="mb-1 block text-[11px] font-semibold tracking-wider text-cream/50 uppercase">Gamertag</span>
          <input
            name="minecraftName"
            type="text"
            defaultValue={user.minecraftName ?? ""}
            placeholder="nicht verknüpft"
            pattern="[A-Za-z0-9_]{3,16}"
            className="input font-mono"
          />
        </label>

        <label className="flex-1 basis-44">
          <span className="mb-1 block text-[11px] font-semibold tracking-wider text-cream/50 uppercase">Twitch</span>
          <input
            name="twitchName"
            type="text"
            defaultValue={user.twitchName ?? ""}
            placeholder="nicht verknüpft"
            pattern="[A-Za-z0-9_]{4,25}"
            className="input font-mono"
          />
        </label>

        <label className="basis-32">
          <span className="mb-1 block text-[11px] font-semibold tracking-wider text-cream/50 uppercase">Rolle</span>
          <select name="role" defaultValue={user.role} disabled={isSelf} className="input">
            <option value="PLAYER">Spieler</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>

        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3">
          <input
            type="checkbox"
            name="whitelisted"
            defaultChecked={user.whitelisted}
            className="size-4 accent-emerald-400"
          />
          <span className="text-sm text-cream/80">Whitelist</span>
        </label>

        <button type="submit" disabled={pending} className="btn btn-outline btn-md">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Speichern
        </button>

        {state.error && <p className="basis-full text-xs text-rose-300">{state.error}</p>}
        {state.success && (
          <p className="flex basis-full items-center gap-1 text-xs text-emerald-300">
            <Check className="size-3.5" /> {state.success}
          </p>
        )}
      </form>

      {!isSelf && (
        <form action={deleteUserAction.bind(null, user.id)} className="mt-2 flex justify-end">
          <ConfirmSubmit
            label="Benutzer löschen"
            title="Löscht den Account inklusive Anträge, Beiträge und Votes"
            confirmLabel="Endgültig löschen"
          />
        </form>
      )}
    </div>
  );
}
