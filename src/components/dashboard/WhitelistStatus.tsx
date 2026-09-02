import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { cn } from "@/lib/utils";

type WhitelistStatusProps = {
  whitelisted: boolean;
  minecraftName: string | null;
  serverIp: string;
  discordInvite: string;
};

/** Klare, farblich hervorgehobene Whitelist-Anzeige. */
export function WhitelistStatus({ whitelisted, minecraftName, serverIp, discordInvite }: WhitelistStatusProps) {
  const Icon = whitelisted ? ShieldCheck : ShieldAlert;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-xl border p-6",
        whitelisted
          ? "border-emerald-400/50 bg-linear-to-br from-emerald-500/15 via-emerald-900/20 to-wood-900 shadow-[0_0_40px_-12px_rgba(52,211,153,0.5)]"
          : "border-rose-400/50 bg-linear-to-br from-rose-500/15 via-rose-950/30 to-wood-900 shadow-[0_0_40px_-12px_rgba(251,113,133,0.45)]",
      )}
    >
      <Icon
        className={cn("pointer-events-none absolute -right-6 -bottom-6 size-40 opacity-10", whitelisted ? "text-emerald-300" : "text-rose-300")}
      />
      <p className="eyebrow">Whitelist-Status</p>
      <div className="mt-4 flex items-center gap-3">
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-full border-2",
            whitelisted ? "border-emerald-300 bg-emerald-500/20 text-emerald-200" : "border-rose-300 bg-rose-500/20 text-rose-200",
          )}
        >
          <Icon className="size-6" />
        </span>
        <div>
          <p className="text-xs tracking-wider text-cream/60 uppercase">Gewhitelisted</p>
          <p className={cn("font-display text-3xl leading-none font-bold", whitelisted ? "text-emerald-200" : "text-rose-200")}>
            {whitelisted ? "Ja" : "Nein"}
          </p>
        </div>
      </div>

      <div className="relative mt-5 flex-1 text-sm text-cream/75">
        {whitelisted ? (
          <p>
            Du kannst dich jederzeit verbinden: <span className="font-mono text-cream">{serverIp}</span>
            {minecraftName ? (
              <>
                {" "}
                mit dem Account <span className="font-mono text-cream">{minecraftName}</span>.
              </>
            ) : (
              "."
            )}
          </p>
        ) : minecraftName ? (
          <p>
            Dein Gamertag <span className="font-mono text-cream">{minecraftName}</span> ist noch nicht freigeschaltet. Melde dich im
            Discord unter <span className="font-mono text-cream">#whitelist</span> – wir schalten dich meist am selben Tag frei.
          </p>
        ) : (
          <p>Verknüpfe zuerst deinen Minecraft-Gamertag, dann beantrage die Whitelist im Discord.</p>
        )}
      </div>

      {!whitelisted && (
        <div className="relative mt-5">
          <Button href={discordInvite} variant="outline" size="sm" target="_blank" rel="noopener noreferrer">
            <DiscordIcon className="size-4" /> Whitelist beantragen
          </Button>
        </div>
      )}
    </div>
  );
}
