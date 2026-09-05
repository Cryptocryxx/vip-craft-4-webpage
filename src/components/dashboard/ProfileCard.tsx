import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Crown, Shield, User } from "lucide-react";
import { LinkMinecraftForm } from "@/components/dashboard/LinkMinecraftForm";
import { LinkTwitchForm } from "@/components/dashboard/LinkTwitchForm";
import { Badge } from "@/components/ui/Badge";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { formatDate } from "@/lib/format";
import { imTeam, istAdmin } from "@/lib/roles";

type ProfileCardProps = {
  user: {
    name: string | null;
    image: string | null;
    minecraftName: string | null;
    twitchName: string | null;
    role: string;
    createdAt: Date;
  };
  /**
   * false, wenn der Username gerade über den Whitelist-Antrag erfasst wird –
   * dann zeigt die Karte nur einen Hinweis statt eines zweiten Formulars.
   */
  allowLinking?: boolean;
};

export async function ProfileCard({ user, allowLinking = true }: ProfileCardProps) {
  const [t, tRoles] = await Promise.all([getTranslations("ProfileCard"), getTranslations("Roles")]);

  return (
    <Panel rivets className="p-6">
      <p className="eyebrow">{t("eyebrow")}</p>
      <div className="mt-4 flex items-center gap-4">
        <div className="relative">
          {user.image ? (
            <Image src={user.image} alt="" width={64} height={64} className="rounded-full ring-2 ring-brass-500/50" />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-full bg-brass-500/20 text-brass-200 ring-2 ring-brass-500/50">
              <User className="size-7" />
            </span>
          )}
          {user.minecraftName && (
            <span className="absolute -right-1 -bottom-1 rounded-[4px] ring-2 ring-wood-900">
              <PlayerHead name={user.minecraftName} size={24} />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold text-cream">{user.name ?? t("unknownPlayer")}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-cream/60">
            <DiscordIcon className="size-3.5" /> {t("discordLinked")}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {istAdmin(user.role) ? (
              <Badge tone="brass">
                <Crown className="size-3" /> {tRoles("admin")}
              </Badge>
            ) : imTeam(user.role) ? (
              <Badge tone="brass">
                <Shield className="size-3" /> {tRoles("moderator")}
              </Badge>
            ) : (
              <Badge tone="wood">{tRoles("player")}</Badge>
            )}
          </div>
        </div>
      </div>

      <dl className="mt-6 space-y-3 border-t border-white/5 pt-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-cream/50">{t("minecraftUsername")}</dt>
          <dd className="font-mono font-semibold text-cream">
            {user.minecraftName ?? <span className="font-sans font-normal text-cream/40">{t("notLinked")}</span>}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-cream/50">{t("twitchChannel")}</dt>
          <dd className="font-mono font-semibold text-cream">
            {user.twitchName ? (
              <a
                href={`https://www.twitch.tv/${user.twitchName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brass-200"
              >
                {user.twitchName}
              </a>
            ) : (
              <span className="font-sans font-normal text-cream/40">{t("notLinked")}</span>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-cream/50">{t("memberSince")}</dt>
          <dd className="text-cream">{formatDate(user.createdAt)}</dd>
        </div>
      </dl>

      <div className="mt-5 space-y-5 border-t border-white/5 pt-4">
        {allowLinking ? (
          <LinkMinecraftForm currentName={user.minecraftName} />
        ) : (
          <p className="text-xs text-cream/50">{t("linkViaApplication")}</p>
        )}
        <div className="border-t border-white/5 pt-4">
          <LinkTwitchForm currentName={user.twitchName} />
        </div>
      </div>
    </Panel>
  );
}
