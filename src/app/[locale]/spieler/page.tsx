import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skull, Swords, Users } from "lucide-react";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { PlayerCard } from "@/components/players/PlayerCard";
import { RefreshStatsButton } from "@/components/players/RefreshStatsButton";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { pvpUebersicht } from "@/lib/death-log";
import { listPlayers } from "@/lib/players";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SpielerPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function SpielerPage() {
  const [spieler, session, t, pvp] = await Promise.all([
    listPlayers(),
    auth(),
    getTranslations("SpielerPage"),
    pvpUebersicht(),
  ]);
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

        <section>
          <SectionHeading
            eyebrow={t("pvpEyebrow")}
            icon={Swords}
            title={t("pvpTitle")}
            description={t("pvpDescription")}
            className="mb-5"
          />

          {pvp.rangliste.length === 0 ? (
            <Panel className="p-10 text-center text-sm text-cream/60">{t("pvpEmpty")}</Panel>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel className="overflow-hidden">
                <ul className="divide-y divide-white/5">
                  {pvp.rangliste.map((zeile, index) => (
                    <li key={zeile.name} className="flex items-center gap-3 p-4">
                      <span className="w-5 shrink-0 text-center font-display text-sm font-bold text-brass-300">
                        {index + 1}
                      </span>
                      <PlayerHead name={zeile.name} size={28} />
                      <Link
                        href={`/spieler/${encodeURIComponent(zeile.name)}`}
                        className="min-w-0 flex-1 truncate font-semibold text-cream hover:text-brass-200"
                      >
                        {zeile.name}
                      </Link>
                      <span className="flex items-center gap-1 font-mono text-sm text-emerald-300">
                        <Swords className="size-3.5" /> {zeile.getoetet}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-sm text-rose-300">
                        <Skull className="size-3.5" /> {zeile.gestorben}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-white/5 p-3 text-[11px] text-cream/40">
                  <Swords className="mr-1 inline size-3" />
                  {t("pvpKills")} · <Skull className="mr-1 inline size-3" />
                  {t("pvpDeaths")}
                </p>
              </Panel>

              <Panel className="overflow-hidden">
                <p className="border-b border-white/5 p-3 text-xs tracking-wider text-cream/50 uppercase">
                  {t("pvpPairs")}
                </p>
                <ul className="divide-y divide-white/5">
                  {pvp.paare.map((paar) => (
                    // Das Schwert zwischen den Namen ersetzt das Verb – so
                    // braucht die Zeile in keiner Sprache eine eigene Satzstellung.
                    <li key={`${paar.taeter}>${paar.opfer}`} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                      <PlayerHead name={paar.taeter} size={22} />
                      <span className="font-semibold text-cream">{paar.taeter}</span>
                      <Swords className="size-3.5 shrink-0 text-brass-300" />
                      <PlayerHead name={paar.opfer} size={22} />
                      <span className="font-semibold text-cream">{paar.opfer}</span>
                      <span className="ml-auto font-mono text-cream/70">{paar.anzahl}×</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          )}
        </section>
      </Container>
    </>
  );
}
