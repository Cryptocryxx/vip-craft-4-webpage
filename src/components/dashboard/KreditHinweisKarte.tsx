import { getTranslations } from "next-intl/server";
import { ArrowRight, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

/**
 * Hinweis im Dashboard, wenn ein Kreditangebot auf Antwort wartet oder eine
 * Schuld offen ist. Ohne ihn fiele ein Angebot nur auf, wer zufällig auf der
 * Kreditseite vorbeischaut – und nach sieben Tagen wäre es abgelaufen.
 */
export async function KreditHinweisKarte({ angebote, schulden }: { angebote: number; schulden: number }) {
  if (angebote === 0 && schulden === 0) return null;
  const t = await getTranslations("CreditHint");

  return (
    <Panel className="flex flex-wrap items-center gap-4 border-brass-400/50 p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-brass-500/40 bg-brass-500/10 text-brass-200">
        <HandCoins className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        {angebote > 0 && <p className="font-display font-bold text-cream">{t("offers", { count: angebote })}</p>}
        {schulden > 0 && (
          <p className={angebote > 0 ? "text-sm text-cream/60" : "font-display font-bold text-cream"}>
            {t("debts", { count: schulden })}
          </p>
        )}
      </div>
      <Button href="/economy/kredite" size="sm">
        {t("open")} <ArrowRight className="size-4" />
      </Button>
    </Panel>
  );
}
