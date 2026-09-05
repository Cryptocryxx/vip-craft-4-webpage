"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Check, Cookie, ExternalLink, SlidersHorizontal, X } from "lucide-react";
import {
  CONSENT_CATEGORIES,
  CONSENT_OPEN_EVENT,
  acceptAll,
  consentCategoryPrivacyUrl,
  rejectAll,
  saveConsent,
  useConsentSnapshot,
  type ConsentCategory,
} from "@/lib/consent";

/**
 * Hinweis zu Cookies und externen Inhalten.
 *
 * Bewusst kein „Cookie-Wall“: Die Seite ist ohne Auswahl vollständig nutzbar,
 * da nur technisch notwendige Cookies gesetzt werden. Zustimmen und Ablehnen
 * sind gleichwertig auf der ersten Ebene erreichbar.
 */
export function CookieBanner() {
  const t = useTranslations("CookieBanner");
  const snapshot = useConsentSnapshot();
  const [reopened, setReopened] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selection, setSelection] = useState<Record<ConsentCategory, boolean>>({ twitch: false, map: false });

  /** Anbieter, Beschriftung und Beschreibung je Kategorie – aus den Übersetzungen. */
  const categoryInfo: Record<ConsentCategory, { label: string; provider: string; description: string }> = {
    twitch: {
      label: t("categoryTwitchLabel"),
      provider: "Twitch Interactive, Inc. (USA)",
      description: t("categoryTwitchDescription"),
    },
    map: {
      label: t("categoryMapLabel"),
      provider: t("categoryMapProvider"),
      description: t("categoryMapDescription"),
    },
  };

  useEffect(() => {
    const open = () => {
      setSelection({
        twitch: snapshot !== null && snapshot !== "unknown" ? snapshot.twitch : false,
        map: snapshot !== null && snapshot !== "unknown" ? snapshot.map : false,
      });
      setShowDetails(true);
      setReopened(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, [snapshot]);

  // Während der Hydration nichts rendern, danach nur ohne vorhandene Entscheidung.
  if (snapshot === "unknown") return null;
  const needsDecision = snapshot === null;
  if (!needsDecision && !reopened) return null;

  const close = () => {
    setReopened(false);
    setShowDetails(false);
  };

  return (
    <div role="region" aria-label={t("ariaLabel")} className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="panel panel-rivets mx-auto max-w-3xl p-5 shadow-[0_-10px_40px_-12px_rgba(0,0,0,0.9)] sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-brass-500/40 bg-brass-500/10 text-brass-200">
            <Cookie className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold text-cream">{t("title")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-cream/70">
              {t.rich("paragraph1", { b: (chunks) => <strong className="text-cream">{chunks}</strong> })}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-cream/70">{t("paragraph2")}</p>
          </div>
          {reopened && (
            <button type="button" onClick={close} aria-label={t("close")} className="btn btn-ghost size-8 shrink-0 px-0">
              <X className="size-4" />
            </button>
          )}
        </div>

        {showDetails && (
          <fieldset className="mt-5 space-y-3 border-t border-white/10 pt-4">
            <legend className="sr-only">{t("selectExternal")}</legend>

            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked
                  disabled
                  aria-label={t("necessaryAriaLabel")}
                  className="mt-0.5 size-4 accent-emerald-400"
                />
                <div>
                  <p className="font-display text-sm font-semibold text-cream">
                    {t("necessaryTitle")} <span className="font-normal text-cream/45">{t("necessaryAlwaysActive")}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-cream/55">{t("necessaryDescription")}</p>
                </div>
              </div>
            </div>

            {CONSENT_CATEGORIES.map((category) => {
              const info = categoryInfo[category];
              const privacyUrl = consentCategoryPrivacyUrl[category];
              const isExternal = privacyUrl.startsWith("http");
              return (
                <label
                  key={category}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-3 transition-colors hover:border-brass-500/40"
                >
                  <input
                    type="checkbox"
                    aria-label={t("allowCategory", { label: info.label })}
                    checked={selection[category]}
                    onChange={(e) => setSelection((prev) => ({ ...prev, [category]: e.target.checked }))}
                    className="mt-0.5 size-4 accent-emerald-400"
                  />
                  <div>
                    <p className="font-display text-sm font-semibold text-cream">{info.label}</p>
                    <p className="mt-0.5 text-xs text-cream/55">{info.description}</p>
                    <p className="mt-1 text-xs text-cream/40">
                      {t("providerLabel", { provider: info.provider })} ·{" "}
                      <a
                        href={privacyUrl}
                        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 text-diamond-300 underline underline-offset-2 hover:text-diamond-200"
                      >
                        {t("privacyNotices")}
                        {isExternal && <ExternalLink className="size-2.5" />}
                      </a>
                    </p>
                  </div>
                </label>
              );
            })}
          </fieldset>
        )}

        <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
          {/* Zustimmen und Ablehnen bewusst gleich gewichtet */}
          <button type="button" onClick={() => { acceptAll(); close(); }} className="btn btn-brass btn-md flex-1">
            <Check className="size-4" /> {t("acceptAll")}
          </button>
          <button type="button" onClick={() => { rejectAll(); close(); }} className="btn btn-brass btn-md flex-1">
            <X className="size-4" /> {t("onlyNecessary")}
          </button>
          {showDetails ? (
            <button
              type="button"
              onClick={() => { saveConsent(selection); close(); }}
              className="btn btn-outline btn-md flex-1"
            >
              {t("saveSelection")}
            </button>
          ) : (
            <button type="button" onClick={() => setShowDetails(true)} className="btn btn-ghost btn-md sm:flex-none">
              <SlidersHorizontal className="size-4" /> {t("settings")}
            </button>
          )}
        </div>

        <p className="mt-3 text-xs text-cream/45">
          {t("moreInfo")}{" "}
          <Link href="/datenschutz" className="text-diamond-300 underline underline-offset-2 hover:text-diamond-200">
            {t("privacyPolicy")}
          </Link>
          {" · "}
          <Link href="/impressum" className="text-diamond-300 underline underline-offset-2 hover:text-diamond-200">
            {t("imprint")}
          </Link>
        </p>
      </div>
    </div>
  );
}
