"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

type NavLinksProps = {
  className?: string;
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
};

export function NavLinks({ className, orientation = "horizontal", onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  const horizontal = orientation === "horizontal";

  return (
    <nav aria-label="Hauptnavigation" className={cn(horizontal ? "flex items-center gap-1" : "flex flex-col gap-1", className)}>
      {navItems.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative rounded-md px-3 py-2 font-display text-sm font-semibold tracking-wide transition-colors",
              active ? "text-brass-200" : "text-cream/70 hover:bg-white/5 hover:text-cream",
              !horizontal && active && "bg-white/5",
            )}
          >
            {item.label}
            {horizontal && active && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-linear-to-r from-transparent via-diamond-400 to-transparent" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
