import { getTranslations } from "next-intl/server";
import { Languages } from "lucide-react";
import { zeigtUebersetzung } from "@/lib/uebersetzung";
import { cn } from "@/lib/utils";

/**
 * Der kleine Hinweis unter Listen mit Spielertexten: „automatisch uebersetzt".
 *
 * Auf der deutschen Fassung faellt er ersatzlos weg - dort steht ohnehin das
 * Original. Ein Hinweis je Liste statt einer Fahne an jedem Eintrag: Die
 * Aussage ist jedes Mal dieselbe, und an zwanzig Ladenkarten waere sie nur
 * noch Rauschen.
 */
export async function UebersetzungsHinweis({ className }: { className?: string }) {
  if (!(await zeigtUebersetzung())) return null;

  const t = await getTranslations("AutoTranslate");
  return (
    <p className={cn("flex items-center justify-center gap-1.5 text-xs text-cream/40", className)}>
      <Languages className="size-3.5 shrink-0" />
      {t("note")}
    </p>
  );
}
