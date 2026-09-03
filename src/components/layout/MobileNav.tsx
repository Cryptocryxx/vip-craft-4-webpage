"use client";

import { useState } from "react";
import Link from "next/link";
import { Cog, LayoutDashboard, Menu, X } from "lucide-react";
import { NavLinks } from "@/components/layout/NavLinks";

export function MobileNav({ isAdmin = false, loggedIn = false }: { isAdmin?: boolean; loggedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

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
            <NavLinks orientation="vertical" onNavigate={close} />
            <Link
              href="/dashboard"
              onClick={close}
              className="mt-2 flex items-center gap-2 rounded-md border-t border-white/5 px-3 py-3 font-display text-sm font-semibold text-cream/70 hover:bg-white/5 hover:text-cream"
            >
              <LayoutDashboard className="size-4" />
              {loggedIn ? "Dashboard" : "Login"}
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={close}
                className="flex items-center gap-2 rounded-md px-3 py-3 font-display text-sm font-semibold text-brass-200 hover:bg-white/5 hover:text-brass-100"
              >
                <Cog className="size-4" />
                Kontrollraum
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
