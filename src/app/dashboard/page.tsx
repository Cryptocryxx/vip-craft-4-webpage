import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { auth, authConfigured } from "@/auth";
import { PersonalStats } from "@/components/dashboard/PersonalStats";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { SignInPanel } from "@/components/dashboard/SignInPanel";
import { SuggestionBoard } from "@/components/dashboard/SuggestionBoard";
import { WhitelistStatus } from "@/components/dashboard/WhitelistStatus";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { siteConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { listSuggestions } from "@/lib/suggestions";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dein Profil, Whitelist-Status, Statistiken und das Vorschlags-Board.",
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
          description="Whitelist-Status, persönliche Statistiken und das Vorschlags-Board – nach dem Login mit Discord."
        />
        <Container className="py-12">
          <SignInPanel configured={authConfigured} error={errorMessage} />
        </Container>
      </>
    );
  }

  const suggestions = await listSuggestions(user.id);

  return (
    <>
      <PageHeader
        eyebrow="Profil & Dashboard"
        icon={LayoutDashboard}
        title={`Moin, ${user.name ?? "Spieler"}!`}
        description="Dein Bereich auf VIP Craft 4: Gamertag verknüpfen, Whitelist prüfen, Stats ansehen und mitbestimmen, wohin der Server fährt."
      />

      <Container className="space-y-8 py-10">
        <div className="grid gap-6 lg:grid-cols-3">
          <ProfileCard user={user} />
          <WhitelistStatus
            whitelisted={user.whitelisted}
            minecraftName={user.minecraftName}
            serverIp={siteConfig.serverIp}
            discordInvite={siteConfig.discordInvite}
          />
          <div className="lg:col-span-3 xl:col-span-1">
            <PersonalStats />
          </div>
        </div>

        <SuggestionBoard suggestions={suggestions} currentUserId={user.id} />
      </Container>
    </>
  );
}
