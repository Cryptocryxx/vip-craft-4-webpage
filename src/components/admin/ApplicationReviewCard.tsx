"use client";

import { useActionState } from "react";
import Image from "next/image";
import { Check, Clock, Loader2, User, X } from "lucide-react";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { deleteApplicationAction, reviewApplicationAction, type AdminFormState } from "@/lib/actions/admin";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { formatDate, timeAgo } from "@/lib/format";
import { applicationStatusLabels, type ApplicationStatus, type WhitelistApplicationDTO } from "@/lib/whitelist-types";

const initialState: AdminFormState = {};

const statusTone: Record<ApplicationStatus, BadgeTone> = {
  PENDING: "brass",
  APPROVED: "emerald",
  REJECTED: "rose",
};

export function ApplicationReviewCard({ application }: { application: WhitelistApplicationDTO }) {
  const [state, formAction, pending] = useActionState(reviewApplicationAction, initialState);
  const { applicant } = application;
  const isPending = application.status === "PENDING";
  const displayName = applicant.name ?? applicant.minecraftName ?? "Unbekannt";

  return (
    <Panel rivets className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {applicant.image ? (
            <Image src={applicant.image} alt="" width={40} height={40} className="rounded-full ring-1 ring-brass-500/40" />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full bg-brass-500/20 text-brass-200">
              <User className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-display font-bold text-cream">{displayName}</p>
            <p className="text-xs text-cream/50">
              Antrag {timeAgo(application.createdAt)} · {formatDate(application.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={statusTone[application.status]}>
            {application.status === "PENDING" && <Clock className="size-3" />}
            {applicationStatusLabels[application.status]}
          </Badge>
          {applicant.role === "ADMIN" && <Badge tone="brass">Admin</Badge>}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 border-t border-white/5 pt-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs tracking-wider text-cream/50 uppercase">Gamertag</dt>
          <dd className="mt-1 flex items-center gap-2">
            {application.minecraftName ? (
              <>
                <PlayerHead name={application.minecraftName} size={22} />
                <span className="font-mono font-semibold text-cream">{application.minecraftName}</span>
              </>
            ) : (
              <span className="text-cream/40">noch nicht angegeben</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-wider text-cream/50 uppercase">Discord</dt>
          <dd className="mt-1 truncate text-cream/80">{applicant.email ?? displayName}</dd>
        </div>
      </dl>

      {application.message && (
        <p className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm whitespace-pre-line text-cream/75">
          {application.message}
        </p>
      )}

      {!isPending && (
        <p className="mt-3 text-xs text-cream/55">
          {applicationStatusLabels[application.status]}
          {application.reviewer?.name ? ` von ${application.reviewer.name}` : ""}
          {application.reviewedAt ? ` · ${formatDate(application.reviewedAt)}` : ""}
          {application.reviewNote ? ` · „${application.reviewNote}“` : ""}
        </p>
      )}

      {isPending ? (
        <form action={formAction} className="mt-4 space-y-3 border-t border-white/5 pt-4">
          <input type="hidden" name="applicationId" value={application.id} />
          <label htmlFor={`note-${application.id}`} className="sr-only">
            Notiz für den Antragsteller
          </label>
          <input
            id={`note-${application.id}`}
            name="note"
            type="text"
            maxLength={500}
            placeholder="Optionale Notiz (wird dem Spieler angezeigt)"
            className="input"
          />
          {state.error && <p className="text-sm text-rose-300">{state.error}</p>}
          {state.success && <p className="text-sm text-emerald-300">{state.success}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              name="decision"
              value="approve"
              disabled={pending || !application.minecraftName}
              title={application.minecraftName ? undefined : "Der Spieler muss zuerst seinen Gamertag eintragen."}
              className="btn btn-diamond btn-sm"
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Annehmen
            </button>
            <button
              type="submit"
              name="decision"
              value="reject"
              disabled={pending}
              className="btn btn-sm border border-rose-400/50 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25"
            >
              <X className="size-3.5" /> Ablehnen
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex justify-end border-t border-white/5 pt-3">
          <form action={deleteApplicationAction.bind(null, application.id)}>
            <ConfirmSubmit label="Antrag löschen" title="Antrag aus der Historie entfernen" />
          </form>
        </div>
      )}

      {isPending && !application.minecraftName && (
        <p className="mt-2 text-xs text-brass-200/80">
          Annehmen ist erst möglich, wenn der Spieler seinen Gamertag eingetragen hat.
        </p>
      )}
    </Panel>
  );
}
