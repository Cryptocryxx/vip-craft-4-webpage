"use client";

import { useTranslations } from "next-intl";
import { Cookie } from "lucide-react";
import { openConsentSettings } from "@/lib/consent";
import { cn } from "@/lib/utils";

/** Öffnet den Cookie-Hinweis erneut – Widerruf muss so einfach sein wie die Zustimmung. */
export function CookieSettingsLink({ className, withIcon = false }: { className?: string; withIcon?: boolean }) {
  const t = useTranslations("CookieSettingsLink");
  return (
    <button
      type="button"
      onClick={openConsentSettings}
      className={cn("inline-flex items-center gap-1.5 transition-colors hover:text-brass-200", className)}
    >
      {withIcon && <Cookie className="size-4" />}
      {t("label")}
    </button>
  );
}
