import type { Metadata } from "next";
import Link from "next/link";
import { Cog, LayoutDashboard } from "lucide-react";
import { auth, authConfigured } from "@/auth";
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
import { getSiteSettings } from "@/lib/settings";
import { listShopsForUser } from "@/lib/shops";
import { listSuggestions } from "@/lib/suggestions";
import { getApplicationForUser } from "@/lib/whitelist";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dein Profil, Whitelist-Antrag, Statistiken und das Vorschlags-Board.",
};

/** Auth.js-Fehlercodes → verständliche Meldungen */
const authErrorMessages: Record<string, string> = {
  Configuration: "Der Discord-Login ist noch nicht vollständig konfiguriert.",
  AccessDenied: "Zugriff verweigert – der Login wurde abgebrochen oder ist nicht erlaubt.",
  OAuthAccountNotLinked: "Dieser Discord-Account ist bereits mit einem anderen Login verknüpft.",
  OAuthCallbackError: "Discord hat den Login abgebrochen. Bitte versuche es erneut.",
  OAuthSignin: "Der Login bei Discord konnte nicht gestartet werden.",
  Verification: "Der Login-Link ist abgelaufen oder wurde bereits verwendet.",
};

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const searchParams = await props.searchParams;
  const errorCode = typeof searchParams.error === "string" ? searchParams.error : undefined;
  const errorMessage = errorCode ? (authErrorMessages[errorCode] ?? "Der Login ist fehlgeschlagen. Bitte versuche es erneut.") : undefined;

  const session = await auth();
  const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;

  if (!session?.user || !user) {
    return (
      <>
        <PageHeader
          eyebrow="Profil & Dashboard"
          icon={LayoutDashboard}
          title="Dashboard"
          description="Whitelist beantragen, persönliche Statistiken und das Vorschlags-Board – nach dem Login mit Discord."
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
  const [application, settings, suggestions, shops, discord, name] = await Promise.all([
    getApplicationForUser(user.id),
    getSiteSettings(),
    listSuggestions(user.id),
    listShopsForUser(user.id),
    ensureMembershipFresh(user),
    ensureNameChecked(user),
  ]);

  const start = serverStartZeit();
  const serverStartText =
    start?.toLocaleString("de-DE", {
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
        eyebrow="Profil & Dashboard"
        icon={LayoutDashboard}
        title={`Moin, ${user.name ?? "Spieler"}!`}
        description="Dein Bereich auf VIP Craft 4: Whitelist beantragen, Stats ansehen und mitbestimmen, wohin der Server fährt."
      >
        {user.role === "ADMIN" && (
          <Link href="/admin" className="btn btn-outline btn-sm">
            <Cog className="size-4" /> Zum Kontrollraum
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
      </Container>
    </>
  );
}
