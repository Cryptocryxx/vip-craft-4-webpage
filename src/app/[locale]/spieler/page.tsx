import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { auth } from "@/auth";
import { PlayerCard } from "@/components/players/PlayerCard";
import { RefreshStatsButton } from "@/components/players/RefreshStatsButton";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listPlayers } from "@/lib/players";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SpielerPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function SpielerPage() {
  const [spieler, session, t] = await Promise.all([listPlayers(), auth(), getTranslations("SpielerPage")]);
  const online = spieler.filter((p) => p.online);
  const offline = spieler.filter((p) => !p.online);

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} icon={Users} title={t("title")} description={t("description")} />

      <Container className="space-y-12 py-10">
        <section>
          <SectionHeading
            eyebrow={t("onlineEyebrow")}
            icon={Users}
            title={t("onlineTitle", { count: online.length })}
            description={t("onlineDescription")}
            className="mb-5"
          />

          {online.length === 0 ? (
            <Panel className="p-10 text-center text-sm text-cream/60">{t("noneOnline")}</Panel>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {online.map((p) => (
                <PlayerCard key={p.name} player={p} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeading
            eyebrow={t("allEyebrow")}
            icon={Users}
            title={t("allTitle")}
            description={t("allDescription")}
            className="mb-5"
          />

          <div className="mb-5">
            <RefreshStatsButton eingeloggt={Boolean(session?.user)} />
          </div>

          {offline.length === 0 ? (
            <Panel className="p-10 text-center text-sm text-cream/60">{t("noneOffline")}</Panel>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offline.map((p) => (
                <PlayerCard key={p.name} player={p} />
              ))}
            </div>
          )}
        </section>
      </Container>
    </>
  );
}
