import { AeronauticsHighlight } from "@/components/home/AeronauticsHighlight";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { Hero } from "@/components/home/Hero";
import { HowToJoin } from "@/components/home/HowToJoin";
import { MenuCards } from "@/components/home/MenuCards";
import { ModpackCard } from "@/components/home/ModpackCard";
import { IntroVideo } from "@/components/intro/IntroVideo";
import { getSiteSettings } from "@/lib/settings";
import { viewerMaySeeServerIp } from "@/lib/viewer";

export default async function HomePage() {
  const [settings, darfIpSehen] = await Promise.all([getSiteSettings(), viewerMaySeeServerIp()]);

  return (
    <>
      <IntroVideo src="/IntroVipCraft4.mp4" />
      <Hero serverIp={darfIpSehen ? settings.serverIp : null} discordInvite={settings.discordInvite} />
      <MenuCards />
      <HowToJoin serverIp={darfIpSehen ? settings.serverIp : null} discordInvite={settings.discordInvite} />
      <ModpackCard />
      <AeronauticsHighlight />
      <FeatureGrid />
    </>
  );
}
