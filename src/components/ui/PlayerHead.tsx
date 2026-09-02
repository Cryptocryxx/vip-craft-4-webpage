import Image from "next/image";
import { cn } from "@/lib/utils";

/** Minecraft-Skin-Kopf über mc-heads.net (unbekannte Namen bekommen den Steve-Kopf). */
export function PlayerHead({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  return (
    <Image
      src={`https://mc-heads.net/avatar/${encodeURIComponent(name)}/${size * 2}`}
      alt={`Skin-Kopf von ${name}`}
      width={size}
      height={size}
      unoptimized
      className={cn("shrink-0 rounded-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.6)] [image-rendering:pixelated]", className)}
    />
  );
}
