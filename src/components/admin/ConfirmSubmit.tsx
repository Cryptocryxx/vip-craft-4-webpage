"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  confirmLabel?: string;
  className?: string;
  title?: string;
};

/**
 * Zweistufiger Löschen-Button: erst scharf schalten, dann absenden.
 * Muss innerhalb eines <form> mit Server Action stehen.
 */
export function ConfirmSubmit({ label, confirmLabel = "Wirklich löschen", className, title }: Props) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        title={title}
        onClick={() => setArmed(true)}
        className={cn("btn btn-ghost btn-sm text-rose-200 hover:bg-rose-500/10 hover:text-rose-100", className)}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="submit"
        className="btn btn-sm border border-rose-400/60 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
      >
        {confirmLabel}
      </button>
      <button type="button" onClick={() => setArmed(false)} className="btn btn-ghost btn-sm">
        Abbrechen
      </button>
    </span>
  );
}
