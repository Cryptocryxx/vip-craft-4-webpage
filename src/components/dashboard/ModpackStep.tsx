"use client";

import { useTransition } from "react";
import { Check, Download } from "lucide-react";
import { markModpackDownloadedAction } from "@/lib/actions/profile";
import { siteConfig } from "@/lib/config";

/**
 * Der Modpack-Schritt in der Checkliste.
 *
 * Der Klick öffnet CurseForge und vermerkt nebenbei, dass der Schritt erledigt
 * ist. Das Vermerken läuft bewusst nebenher: Der Link folgt sofort, auch wenn
 * die Serveranfrage hängt oder scheitert – niemand soll auf eine Datenbank
 * warten, um ein Modpack herunterzuladen.
 */
export function ModpackStep({ bereitsGeladen }: { bereitsGeladen: boolean }) {
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={siteConfig.modpackUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => startTransition(async () => markModpackDownloadedAction())}
        className="btn btn-diamond btn-sm"
      >
        <Download className="size-4" /> Modpack herunterladen
      </a>

      {bereitsGeladen && (
        <span className="flex items-center gap-1 text-xs text-emerald-300">
          <Check className="size-3.5" /> Link schon geöffnet
        </span>
      )}
    </div>
  );
}
