import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "brass" | "diamond" | "wood" | "emerald" | "rose" | "copper" | "neutral";

const tones: Record<BadgeTone, string> = {
  brass: "border-brass-500/40 bg-brass-500/10 text-brass-200",
  diamond: "border-diamond-400/40 bg-diamond-500/10 text-diamond-200",
  wood: "border-wood-400/40 bg-wood-700/40 text-wood-100",
  emerald: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  rose: "border-rose-400/40 bg-rose-500/10 text-rose-200",
  copper: "border-copper-400/40 bg-copper-500/10 text-copper-400",
  neutral: "border-white/10 bg-white/5 text-cream/70",
};

export function Badge({ tone = "brass", className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return <span className={cn("chip", tones[tone], className)}>{children}</span>;
}
