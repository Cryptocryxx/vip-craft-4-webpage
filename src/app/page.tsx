import { AeronauticsHighlight } from "@/components/home/AeronauticsHighlight";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { Hero } from "@/components/home/Hero";
import { HowToJoin } from "@/components/home/HowToJoin";
import { Teasers } from "@/components/home/Teasers";
import { getSiteSettings } from "@/lib/settings";

export default async function HomePage() {
  const settings = await getSiteSettings();

  return (
    <>
      <Hero serverIp={settings.serverIp} discordInvite={settings.discordInvite} />
      <Teasers />
      <AeronauticsHighlight />
      <FeatureGrid />
      <HowToJoin serverIp={settings.serverIp} discordInvite={settings.discordInvite} />
    </>
  );
}
