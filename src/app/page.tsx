import { AeronauticsHighlight } from "@/components/home/AeronauticsHighlight";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { Hero } from "@/components/home/Hero";
import { HowToJoin } from "@/components/home/HowToJoin";
import { MenuCards } from "@/components/home/MenuCards";
import { getSiteSettings } from "@/lib/settings";

export default async function HomePage() {
  const settings = await getSiteSettings();

  return (
    <>
      <Hero serverIp={settings.serverIp} discordInvite={settings.discordInvite} />
      <MenuCards />
      <HowToJoin serverIp={settings.serverIp} discordInvite={settings.discordInvite} />
      <AeronauticsHighlight />
      <FeatureGrid />
    </>
  );
}
