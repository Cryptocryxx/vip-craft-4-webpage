import type { LucideIcon } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";

type StatTileProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "brass" | "diamond" | "emerald" | "rose";
};

const tones = {
  brass: "border-brass-500/40 bg-brass-500/10 text-brass-200",
  diamond: "border-diamond-400/40 bg-diamond-500/10 text-diamond-200",
  emerald: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  rose: "border-rose-400/40 bg-rose-500/10 text-rose-200",
} as const;

export function StatTile({ icon: Icon, label, value, hint, tone = "brass" }: StatTileProps) {
  return (
    <Panel className="flex items-center gap-4 p-5">
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg border", tones[tone])}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs tracking-wider text-cream/50 uppercase">{label}</p>
        <p className="mt-0.5 font-display text-2xl leading-none font-bold text-cream">{value}</p>
        {hint && <p className="mt-1 truncate text-xs text-cream/45">{hint}</p>}
      </div>
    </Panel>
  );
}
