import { AeronauticsHighlight } from "@/components/home/AeronauticsHighlight";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { Hero } from "@/components/home/Hero";
import { HowToJoin } from "@/components/home/HowToJoin";
import { MenuCards } from "@/components/home/MenuCards";
import { ModpackCard } from "@/components/home/ModpackCard";
import { NextStepPopup } from "@/components/home/NextStepPopup";
import { ServerCountdown } from "@/components/home/ServerCountdown";
import { IntroVideo } from "@/components/intro/IntroVideo";
import { getServerStartCountdown } from "@/lib/event-types";
import { offenerSchritt } from "@/lib/onboarding";
import { getSiteSettings } from "@/lib/settings";
import { viewerMaySeeServerIp } from "@/lib/viewer";

export default async function HomePage() {
  const [settings, darfIpSehen, schritt] = await Promise.all([
    getSiteSettings(),
    viewerMaySeeServerIp(),
    offenerSchritt(),
  ]);
  const countdown = getServerStartCountdown();

  return (
    <>
      <IntroVideo src="/IntroVipCraft4.mp4" />
      <Hero serverIp={darfIpSehen ? settings.serverIp : null} discordInvite={settings.discordInvite} />
      {countdown && (
        <ServerCountdown zielIso={countdown.zielIso} serverJetzt={countdown.jetzt} titel={countdown.titel} />
      )}
      <MenuCards />
      <HowToJoin serverIp={darfIpSehen ? settings.serverIp : null} discordInvite={settings.discordInvite} />
      <ModpackCard />
      <AeronauticsHighlight />
      <FeatureGrid />

      {schritt && (
        <NextStepPopup
          schluessel={schritt.schluessel}
          titel={schritt.titel}
          text={schritt.text}
          ton={schritt.ton}
        />
      )}
    </>
  );
}
