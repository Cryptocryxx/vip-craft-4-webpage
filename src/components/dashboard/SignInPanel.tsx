import { getTranslations } from "next-intl/server";
import { AlertTriangle, ShieldCheck, Sparkles, Vote } from "lucide-react";
import { SignInButton } from "@/components/auth/SignInButton";
import { Gear } from "@/components/ui/Gear";
import { Panel } from "@/components/ui/Panel";

export async function SignInPanel({ configured, error }: { configured: boolean; error?: string }) {
  const t = await getTranslations("SignInPanel");

  const perks = [
    { icon: ShieldCheck, text: t("perk1") },
    { icon: Sparkles, text: t("perk2") },
    { icon: Vote, text: t("perk3") },
  ];

  return (
    <Panel variant="blueprint" className="relative mx-auto max-w-2xl overflow-hidden p-8 text-center sm:p-12">
      <Gear teeth={14} className="pointer-events-none absolute -top-16 -left-16 size-56 text-diamond-300/10 animate-gear-spin" />
      <Gear teeth={10} className="pointer-events-none absolute -right-12 -bottom-12 size-40 text-brass-400/10 animate-gear-spin-reverse" />

      <div className="relative">
        <p className="eyebrow justify-center">{t("eyebrow")}</p>
        <h2 className="mt-3 text-3xl font-bold text-cream sm:text-4xl">{t("title")}</h2>
        <p className="mx-auto mt-3 max-w-md text-cream/70">{t("description")}</p>

        {error && (
          <div className="mx-auto mt-6 flex max-w-md items-start gap-2 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-left text-sm text-rose-100">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <SignInButton size="lg" />
        </div>

        {!configured && (
          <p className="mx-auto mt-4 max-w-md text-xs text-diamond-200/70">
            {t.rich("notConfigured", {
              code1: (chunks) => <code className="font-mono">{chunks}</code>,
              code2: (chunks) => <code className="font-mono">{chunks}</code>,
              code3: (chunks) => <code className="font-mono">{chunks}</code>,
            })}
          </p>
        )}

        <ul className="mx-auto mt-10 grid max-w-lg gap-3 text-left sm:grid-cols-3">
          {perks.map((perk) => {
            const Icon = perk.icon;
            return (
              <li key={perk.text} className="flex items-start gap-2 text-sm text-cream/80">
                <Icon className="mt-0.5 size-4 shrink-0 text-diamond-300" />
                {perk.text}
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
