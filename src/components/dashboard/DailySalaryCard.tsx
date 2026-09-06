"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Coins, Loader2 } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { claimSalaryAction, type SalaryFormState } from "@/lib/actions/salary";

type Props = {
  cogs: number;
  heuteAbgeholt: boolean;
  /** Millisekunden bis Mitternacht – nur gesetzt, wenn heute schon abgeholt wurde. */
  wartenBisMs: number | null;
};

/** "3 Std 12 Min" – gröber als eine Sekundenanzeige, dafür ruhiger. */
function restzeit(ms: number, std: string, min: string): string {
  const gesamtMinuten = Math.max(0, Math.ceil(ms / 60000));
  const stunden = Math.floor(gesamtMinuten / 60);
  const minuten = gesamtMinuten % 60;
  return stunden > 0 ? `${stunden} ${std} ${minuten} ${min}` : `${minuten} ${min}`;
}

/**
 * Tägliches Gehalt aufs Numismatics-Konto.
 *
 * Der Countdown läuft auf die MITTERNACHT, nicht auf "24 Stunden nach dem
 * letzten Mal": Abholen geht jeden Kalendertag einmal, um 23:59 und dann
 * gleich um 0:00 wieder.
 */
export function DailySalaryCard({ cogs, heuteAbgeholt, wartenBisMs }: Props) {
  const t = useTranslations("DailySalary");
  const [state, setState] = useState<SalaryFormState>({});
  const [pending, startTransition] = useTransition();
  const [abgeholt, setAbgeholt] = useState(heuteAbgeholt);
  const [restMs, setRestMs] = useState(wartenBisMs);

  // Der Serverstand gewinnt, sobald frische Daten hereinkommen.
  const [gesehen, setGesehen] = useState(heuteAbgeholt);
  if (gesehen !== heuteAbgeholt) {
    setGesehen(heuteAbgeholt);
    setAbgeholt(heuteAbgeholt);
    setRestMs(wartenBisMs);
  }

  // Minütlich herunterzählen. Ist Mitternacht durch, steht der Knopf wieder
  // bereit, ohne dass jemand die Seite neu laden muss.
  useEffect(() => {
    if (!abgeholt || restMs === null) return;
    const timer = setInterval(() => {
      setRestMs((wert) => {
        if (wert === null) return null;
        const neu = wert - 60000;
        if (neu <= 0) {
          setAbgeholt(false);
          return null;
        }
        return neu;
      });
    }, 60000);
    return () => clearInterval(timer);
  }, [abgeholt, restMs]);

  function abholen() {
    startTransition(async () => {
      const ergebnis = await claimSalaryAction();
      setState(ergebnis);
      if (ergebnis.success) {
        setAbgeholt(true);
        setRestMs(null);
      }
    });
  }

  return (
    <Panel className="flex flex-wrap items-center gap-4 p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-brass-500/40 bg-brass-500/10 text-brass-200">
        <Coins className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold text-cream">{t("title")}</p>
        <p className="text-sm text-cream/60">
          {abgeholt
            ? restMs === null
              ? t("readyAgain")
              : t("comeBackAt", { rest: restzeit(restMs, t("hoursShort"), t("minutesShort")) })
            : t("subtitle", { cogs })}
        </p>

        {state.error && <p className="mt-1.5 text-sm text-rose-300">{state.error}</p>}
        {state.success && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-emerald-300">
            <Check className="size-4" /> {state.success}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={abholen}
        disabled={pending || abgeholt}
        className="btn btn-brass btn-md disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Coins className="size-4" />}
        {abgeholt ? t("claimed") : t("claim", { cogs })}
      </button>
    </Panel>
  );
}
