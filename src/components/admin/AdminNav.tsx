"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  Plug,
  Settings,
  ShieldCheck,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AdminRoute =
  | "/admin"
  | "/admin/whitelist"
  | "/admin/shops"
  | "/admin/users"
  | "/admin/chat"
  | "/admin/suggestions"
  | "/admin/server"
  | "/admin/settings";

const items: Array<{ href: AdminRoute; label: string; icon: LucideIcon; nurAdmin?: boolean }> = [
  { href: "/admin", label: "Übersicht", icon: LayoutDashboard },
  { href: "/admin/whitelist", label: "Whitelist-Anträge", icon: ShieldCheck },
  { href: "/admin/shops", label: "Shops", icon: Store },
  { href: "/admin/users", label: "Spieler", icon: Users },
  { href: "/admin/chat", label: "Chat & Befehle", icon: MessagesSquare },
  { href: "/admin/suggestions", label: "Vorschläge", icon: MessageSquare },
  { href: "/admin/server", label: "Server-Steuerung", icon: Plug, nurAdmin: true },
  { href: "/admin/settings", label: "Einstellungen", icon: Settings, nurAdmin: true },
];

type Props = { pendingCount: number; istAdmin: boolean };

export function AdminNav({ pendingCount, istAdmin }: Props) {
  const pathname = usePathname();
  // Ausblenden ist nur die Höflichkeitsform; die Seiten und Actions dahinter
  // prüfen die Rolle selbst.
  const sichtbar = items.filter((item) => istAdmin || !item.nurAdmin);

  const badgeFor: Partial<Record<AdminRoute, number>> = {
    "/admin/whitelist": pendingCount,
  };

  return (
    <nav aria-label="Admin-Bereiche" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {sichtbar.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const Icon = item.icon;
        const badge = badgeFor[item.href];

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg border px-3 py-2.5 font-display text-sm font-semibold tracking-wide whitespace-nowrap transition-colors",
              active
                ? "border-brass-500/50 bg-brass-500/15 text-brass-100"
                : "border-transparent text-cream/65 hover:bg-white/5 hover:text-cream",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {Boolean(badge) && (
              <span className="rounded-full bg-diamond-500/25 px-1.5 py-0.5 font-mono text-[10px] text-diamond-100 ring-1 ring-diamond-400/50">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
