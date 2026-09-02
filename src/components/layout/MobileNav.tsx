"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { NavLinks } from "@/components/layout/NavLinks";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Menü schließen" : "Menü öffnen"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="btn btn-ghost size-9"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full border-b border-brass-500/25 bg-wood-950 shadow-2xl">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <NavLinks orientation="vertical" onNavigate={() => setOpen(false)} />
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center gap-2 rounded-md border-t border-white/5 px-3 py-3 font-display text-sm font-semibold text-cream/70 hover:bg-white/5 hover:text-cream"
            >
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
