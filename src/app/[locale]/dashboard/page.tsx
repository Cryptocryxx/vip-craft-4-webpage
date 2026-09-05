import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Cog, LayoutDashboard } from "lucide-react";
import { auth, authConfigured } from "@/auth";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { PersonalStats } from "@/components/dashboard/PersonalStats";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { ShopManagerCard } from "@/components/dashboard/ShopManagerCard";
import { SignInPanel } from "@/components/dashboard/SignInPanel";
import { SuggestionBoard } from "@/components/dashboard/SuggestionBoard";
import { WhitelistStatus } from "@/components/dashboard/WhitelistStatus";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { serverStartZeit } from "@/lib/event-types";
import { discordCheckEnabled, ensureMembershipFresh } from "@/lib/discord";
import { ensureNameChecked } from "@/lib/name-check";
import { prisma } from "@/lib/prisma";
import { imTeam } from "@/lib/roles";
import { getSiteSettings } from "@/lib/settings";
import { listShopsForUser } from "@/lib/shops";
import { listSuggestions } from "@/lib/suggestions";
import { getApplicationForUser } from "@/lib/whitelist";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashboardPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function DashboardPage(props: PageProps<"/[locale]/dashboard">) {
  const searchParams = await props.searchParams;
  const errorCode = typeof searchParams.error === "string" ? searchParams.error : undefined;

  const t = await getTranslations("DashboardPage");

  /** Auth.js-Fehlercodes → verständliche Meldungen */
  const authErrorMessages: Record<string, string> = {
    Configuration: t("authErrorConfiguration"),
    AccessDenied: t("authErrorAccessDenied"),
    OAuthAccountNotLinked: t("authErrorAccountNotLinked"),
    OAuthCallbackError: t("authErrorCallback"),
    OAuthSignin: t("authErrorSignin"),
    Verification: t("authErrorVerification"),
  };
  const errorMessage = errorCode ? (authErrorMessages[errorCode] ?? t("authErrorDefault")) : undefined;

  const session = await auth();
  const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;

  if (!session?.user || !user) {
    return (
      <>
        {/* Kein eigener Umschalter hier: Ohne Login steht er schon im Header
            (siehe Header.tsx) - ein zweiter direkt darunter waere doppelt. */}
        <PageHeader
          eyebrow={t("eyebrow")}
          icon={LayoutDashboard}
          title={t("titleLoggedOut")}
          description={t("descriptionLoggedOut")}
        />
        <Container className="py-12">
          <SignInPanel configured={authConfigured} error={errorMessage} />
        </Container>
      </>
    );
  }

  // Discord-Mitgliedschaft nebenbei nachziehen: Wer nach dem Login beitritt,
  // sieht den Schritt beim naechsten Aufruf des Dashboards von selbst abgehakt,
  // ohne auf „Erneut pruefen" zu druecken.
  const [application, settings, suggestions, shops, discord, name, locale] = await Promise.all([
    getApplicationForUser(user.id),
    getSiteSettings(),
    listSuggestions(user.id),
    listShopsForUser(user.id),
    ensureMembershipFresh(user),
    ensureNameChecked(user),
    getLocale(),
  ]);

  const start = serverStartZeit();
  const serverStartText =
    start?.toLocaleString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    }) ?? null;

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        icon={LayoutDashboard}
        title={t("greeting", { name: user.name ?? t("defaultPlayerName") })}
        description={t("description")}
      >
        {imTeam(user.role) && (
          <Link href="/admin" className="btn btn-outline btn-sm">
            <Cog className="size-4" /> {t("toControlRoom")}
          </Link>
        )}
      </PageHeader>

      <Container className="space-y-8 py-10">
        <div className="grid gap-6 lg:grid-cols-3">
          <ProfileCard
            user={user}
            allowLinking={Boolean(user.minecraftName) || application?.status !== "PENDING"}
          />
          <div className="lg:col-span-2">
            <WhitelistStatus
              whitelisted={user.whitelisted}
              minecraftName={user.minecraftName}
              serverIp={settings.serverIp}
              application={application}
              whitelistOpen={settings.whitelistOpen}
              discordJoined={discord.joined}
              discordInvite={settings.discordInvite}
              discordCheckable={discordCheckEnabled}
              discordNeuAnmelden={discord.neuAnmelden}
              modpackGeladen={user.modpackDownloadedAt !== null}
              nameUngueltig={name.gueltig === false}
              whitelistSuspended={user.whitelistSuspended}
              whitelistPending={user.whitelistPending}
              serverStart={serverStartText}
            />
          </div>
        </div>

        <PersonalStats />

        <div id="shops" className="scroll-mt-24">
          <ShopManagerCard shops={shops} />
        </div>

        <SuggestionBoard suggestions={suggestions} currentUserId={user.id} />

        {/* Dezent, ganz am Ende - hier sucht niemand versehentlich danach,
            wer die Sprache wirklich wechseln will, findet sie trotzdem. */}
        <div className="flex justify-center pt-2">
          <LanguageSwitcher className="opacity-60" />
        </div>
      </Container>
    </>
  );
}
