import Image from "next/image";
import { Cog, Download, ShieldCheck } from "lucide-react";
import { JoinServerButton } from "@/components/home/JoinServerButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { Gear } from "@/components/ui/Gear";
import { siteConfig } from "@/lib/config";

/** `serverIp` ist null, solange der Besucher nicht freigeschaltet ist. */
export function Hero({ serverIp, discordInvite }: { serverIp: string | null; discordInvite: string }) {
  return (
    <section className="relative overflow-hidden border-b border-brass-500/20">
      {/* Zahnrad-Kulisse */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <Gear teeth={18} className="absolute -top-32 -left-32 size-[28rem] text-brass-500/7 animate-gear-spin" />
        <Gear teeth={12} className="absolute -top-6 left-56 size-40 text-brass-500/9 animate-gear-spin-reverse" />
        <Gear teeth={22} className="absolute -right-40 -bottom-48 size-[34rem] text-diamond-400/6 animate-gear-spin-reverse" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_72%_40%,rgba(61,211,234,0.10),transparent_70%)]" />
      </div>

      <Container className="relative grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="diamond">{siteConfig.season}</Badge>
            <Badge tone="brass">
              <Cog className="size-3" /> {siteConfig.createVersion}
            </Badge>
            <Badge tone="wood">Minecraft {siteConfig.minecraftVersion}</Badge>
          </div>

          <h1 className="mt-5 text-5xl leading-[0.95] font-bold sm:text-6xl lg:text-7xl">
            <span className="text-diamond">VIP Craft</span> <span className="text-brass">4</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg text-cream/75 sm:text-xl">
            {siteConfig.tagline}. Baue Fabriken, schraub dir ein Flugzeug zusammen, das wirklich fliegt, und lass
            gemeinsam mit anderen Studis die Zahnräder rattern.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {serverIp ? (
              <JoinServerButton ip={serverIp} />
            ) : (
              <Button href="/dashboard" variant="brass" size="lg">
                <ShieldCheck className="size-5" />
                Whitelist beantragen
              </Button>
            )}
            <Button
              href={siteConfig.modpackUrl}
              variant="diamond"
              size="lg"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="size-5" />
              Modpack
            </Button>
            <Button href={discordInvite} variant="outline" size="lg" target="_blank" rel="noopener noreferrer">
              <DiscordIcon className="size-5" />
              Discord beitreten
            </Button>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-brass-500/20 pt-6 text-sm">
            <div>
              <dt className="eyebrow text-[10px]">Modpack</dt>
              <dd className="mt-1 font-semibold text-cream">{siteConfig.modpackName}</dd>
            </div>
            <div>
              <dt className="eyebrow text-[10px]">Slots</dt>
              <dd className="mt-1 font-semibold text-cream">{siteConfig.maxPlayers} Spieler</dd>
            </div>
            <div>
              <dt className="eyebrow text-[10px]">Zugang</dt>
              <dd className="mt-1 font-semibold text-cream">Whitelist per Login</dd>
            </div>
          </dl>
        </div>

        {/* Auf dem Handy weggelassen: Das Logo steht schon im Header, und hier
            wuerde es fast einen ganzen Bildschirm fuellen, bevor irgendetwas
            Nuetzliches kommt. Ab sm ist genug Platz dafuer. */}
        <div className="relative mx-auto hidden w-full max-w-md sm:block lg:max-w-none">
          <div className="absolute inset-8 -z-10 rounded-full bg-diamond-400/10 blur-3xl" />
          <Image
            src="/logo.png"
            alt="VIP Craft 4 Logo"
            width={1024}
            height={1024}
            priority
            className="mx-auto w-full max-w-[400px] drop-shadow-[0_24px_50px_rgba(0,0,0,0.65)] lg:max-w-[470px]"
          />
        </div>
      </Container>
    </section>
  );
}
