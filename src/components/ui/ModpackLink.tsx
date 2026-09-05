"use client";

import { useTransition, type ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { markModpackDownloadedAction } from "@/lib/actions/profile";
import { siteConfig } from "@/lib/config";

/**
 * Jeder Weg zum Modpack – und der Vermerk, dass er genommen wurde.
 *
 * Der Link steht an mehreren Stellen (Hero, Modpack-Abschnitt, Beitritts-Guide,
 * Fusszeile, Checkliste). Der Schritt „Modpack herunterladen" im Dashboard
 * gilt nach jedem davon als erledigt, nicht nur nach dem einen im Dashboard –
 * sonst haengt die Checkliste an einer Stelle fest, obwohl man das Pack laengst
 * geholt hat.
 *
 * Der Vermerk laeuft nebenher: Der Link folgt sofort, auch wenn die Anfrage
 * haengt oder scheitert. Niemand soll auf eine Datenbank warten, um ein Modpack
 * herunterzuladen.
 *
 * Fuer Nicht-Angemeldete tut die Aktion nichts (sie prueft die Sitzung selbst).
 * Das kostet einen leeren Aufruf, spart dafuer aber, den Anmeldezustand durch
 * jede dieser Komponenten zu reichen – auch durch die Fusszeile, die sonst auf
 * jeder einzelnen Seite eine zusaetzliche Abfrage braeuchte.
 */
export function ModpackLink({
  variant,
  size,
  className,
  children,
}: {
  /** Ohne `variant` wird ein schlichter Link gerendert – etwa für die Fußzeile. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  const [, startTransition] = useTransition();
  const merken = () => startTransition(async () => markModpackDownloadedAction());

  if (!variant) {
    return (
      <a
        href={siteConfig.modpackUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={merken}
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <Button
      href={siteConfig.modpackUrl}
      variant={variant}
      size={size}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      onClick={merken}
    >
      {children}
    </Button>
  );
}
