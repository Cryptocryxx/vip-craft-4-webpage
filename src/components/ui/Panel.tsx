import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type PanelProps = ComponentProps<"div"> & {
  /** wood = Holz mit Messingrahmen, blueprint = Blaupausen-Raster */
  variant?: "wood" | "blueprint";
  /** Messing-Nieten in den Ecken */
  rivets?: boolean;
};

export function Panel({ variant = "wood", rivets = false, className, children, ...rest }: PanelProps) {
  return (
    <div
      {...rest}
      className={cn(variant === "wood" ? "panel" : "panel-blueprint", rivets && "panel-rivets", className)}
    >
      {children}
    </div>
  );
}
