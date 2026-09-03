import { AlertTriangle, ShieldCheck, Sparkles, Vote } from "lucide-react";
import { SignInButton } from "@/components/auth/SignInButton";
import { Gear } from "@/components/ui/Gear";
import { Panel } from "@/components/ui/Panel";

const perks = [
  { icon: ShieldCheck, text: "Whitelist-Antrag wird beim Login angelegt" },
  { icon: Sparkles, text: "Deine persönlichen Ingame-Stats" },
  { icon: Vote, text: "Mods vorschlagen, Bugs melden, abstimmen" },
];

export function SignInPanel({ configured, error }: { configured: boolean; error?: string }) {
  return (
    <Panel variant="blueprint" className="relative mx-auto max-w-2xl overflow-hidden p-8 text-center sm:p-12">
      <Gear teeth={14} className="pointer-events-none absolute -top-16 -left-16 size-56 text-diamond-300/10 animate-gear-spin" />
      <Gear teeth={10} className="pointer-events-none absolute -right-12 -bottom-12 size-40 text-brass-400/10 animate-gear-spin-reverse" />

      <div className="relative">
        <p className="eyebrow justify-center">Login-Bereich</p>
        <h2 className="mt-3 text-3xl font-bold text-cream sm:text-4xl">Melde dich mit Discord an</h2>
        <p className="mx-auto mt-3 max-w-md text-cream/70">
          Wir nutzen deinen Discord-Account, weil du dort sowieso schon in der Community bist. Kein extra Passwort, keine E-Mail.
          Dein Whitelist-Antrag wird beim ersten Login automatisch angelegt.
        </p>

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
            Hinweis für Admins: Trage <code className="font-mono">AUTH_DISCORD_ID</code> und{" "}
            <code className="font-mono">AUTH_DISCORD_SECRET</code> in der <code className="font-mono">.env</code> ein, um den Login zu
            aktivieren.
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
