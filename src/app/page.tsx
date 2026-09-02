import { FeatureGrid } from "@/components/home/FeatureGrid";
import { Hero } from "@/components/home/Hero";
import { HowToJoin } from "@/components/home/HowToJoin";
import { Teasers } from "@/components/home/Teasers";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Teasers />
      <FeatureGrid />
      <HowToJoin />
    </>
  );
}
