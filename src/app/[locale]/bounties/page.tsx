import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Coins, Crosshair, Hourglass, Skull, Swords } from "lucide-react";
import { auth } from "@/auth";
import { BountyForm, type Zielspieler } from "@/components/bounties/BountyForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import {
  erledigteKopfgelder,
  guthabenCogs,
  kopfgeldSkriptBereit,
  meineKopfgelder,
  offeneKopfgelder,
  type KopfgeldZeile,
} from "@/lib/bounties";
import { formatNumber } from "@/lib/format";
import { listPlayers } from "@/lib/players";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("BountiesPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/** "12.09.2026" – kurz und ohne Uhrzeit, die Kopfgelder laufen tageweise. */
function datum(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

type ZeilenProps = { eintrag: KopfgeldZeile; locale: string; t: (key: string, values?: Record<string, string>) => string };

/** Ein offenes Kopfgeld: Ziel, Einsatz, Frist. */
function OffeneZeile({ eintrag, locale, t }: ZeilenProps) {
  return (
    <li className="flex flex-wrap items-center gap-3 border-t border-white/5 px-5 py-3.5 first:border-t-0">
      <PlayerHead name={eintrag.targetName} size={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-bold text-cream">{eintrag.targetName}</p>
        <p className="text-xs text-cream/50">
          {t("placedBy", { name: eintrag.placerName })}
          {eintrag.expiresAt && ` · ${t("until", { date: datum(eintrag.expiresAt, locale) })}`}
        </p>
        {/* Die Begruendung steht in Anfuehrungszeichen: Es ist die Sicht des
            Ausschreibers, nicht die des Servers. */}
        {eintrag.reason && <p className="mt-0.5 text-xs text-cream/70 italic">&bdquo;{eintrag.reason}&ldquo;</p>}
      </div>
      <Badge tone="brass">
        <Coins className="size-3" /> {formatNumber(eintrag.cogs)} Cog
      </Badge>
    </li>
  );
}

/** Ein abgeschlossenes Kopfgeld: wer kassiert hat, oder dass es verfallen ist. */
function ErledigteZeile({ eintrag, locale, t }: ZeilenProps) {
  const kassiert = eintrag.status === "CLAIMED";
  return (
    <li className="flex flex-wrap items-center gap-3 border-t border-white/5 px-5 py-3 first:border-t-0">
      {kassiert && eintrag.claimedByName ? (
        <PlayerHead name={eintrag.claimedByName} size={24} />
      ) : (
        <Hourglass className="size-5 shrink-0 text-cream/30" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-cream/85">
          {kassiert
            ? t("claimedLine", { hunter: eintrag.claimedByName ?? "?", target: eintrag.targetName })
            : t("expiredLine", { target: eintrag.targetName })}
        </p>
        {kassiert && eintrag.meldung && <p className="truncate text-[11px] text-cream/40">{eintrag.meldung}</p>}
      </div>
      <span className="font-mono text-xs text-cream/55">
        {formatNumber(eintrag.cogs)} Cog
        {eintrag.claimedAt && ` · ${datum(eintrag.claimedAt, locale)}`}
      </span>
    </li>
  );
}

export default async function BountiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [t, session, offen, erledigt, bereit] = await Promise.all([
    getTranslations("BountiesPage"),
    auth(),
    offeneKopfgelder(),
    erledigteKopfgelder(),
    kopfgeldSkriptBereit(),
  ]);

  const nutzer = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, minecraftName: true, minecraftUuid: true },
      })
    : null;

  const [guthaben, eigene] = await Promise.all([
    nutzer?.minecraftUuid ? guthabenCogs(nutzer.minecraftUuid) : Promise.resolve(null),
    nutzer ? meineKopfgelder(nutzer.id) : Promise.resolve([]),
  ]);

  /*
   * Zielauswahl: alle, die auf dem Server bekannt sind - nur wer wirklich
   * gespielt hat, kann gejagt werden. Nebenbei erspart das die Tippfehler, an
   * denen sonst das Geld haengenbliebe.
   *
   * Nur geladen, wenn das Formular ueberhaupt erscheint: listPlayers() liest
   * saemtliche Statistikdateien vom Server (mit Zwischenspeicher, aber
   * umsonst waere es trotzdem).
   */
  const zeigeFormular = Boolean(session?.user?.id && nutzer?.minecraftName && bereit);
  const eigenerName = nutzer?.minecraftName?.toLowerCase() ?? null;
  const zielspieler: Zielspieler[] = zeigeFormular
    ? (await listPlayers())
        .filter((p) => p.name.toLowerCase() !== eigenerName)
        .map((p) => ({ name: p.name, online: p.online }))
        .sort((a, b) => a.name.localeCompare(b.name, "de"))
    : [];

  const gesamt = offen.reduce((summe, eintrag) => summe + eintrag.cogs, 0);

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} icon={Crosshair} title={t("title")} description={t("description")}>
        {offen.length > 0 && (
          <p className="flex items-center gap-2 text-sm text-brass-200">
            <Coins className="size-4" />
            {t("summary", { count: offen.length, cogs: formatNumber(gesamt) })}
          </p>
        )}
      </PageHeader>

      <Container className="py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold tracking-wide text-brass-200 uppercase">
                <Crosshair className="size-4" /> {t("openTitle")}
              </h2>
              <Panel>
                {offen.length === 0 ? (
                  <p className="p-5 text-sm text-cream/55">{t("openEmpty")}</p>
                ) : (
                  <ul>
                    {offen.map((eintrag) => (
                      <OffeneZeile key={eintrag.id} eintrag={eintrag} locale={locale} t={t} />
                    ))}
                  </ul>
                )}
              </Panel>
            </section>

            {erledigt.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold tracking-wide text-brass-200 uppercase">
                  <Swords className="size-4" /> {t("historyTitle")}
                </h2>
                <Panel>
                  <ul>
                    {erledigt.map((eintrag) => (
                      <ErledigteZeile key={eintrag.id} eintrag={eintrag} locale={locale} t={t} />
                    ))}
                  </ul>
                </Panel>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold tracking-wide text-brass-200 uppercase">
                <Skull className="size-4" /> {t("placeTitle")}
              </h2>
              <Panel className="p-5">
                {!session?.user?.id ? (
                  <div className="space-y-3">
                    <p className="text-sm text-cream/60">{t("signInFirst")}</p>
                    <Button href="/dashboard" variant="outline" size="sm">
                      {t("toDashboard")}
                    </Button>
                  </div>
                ) : !nutzer?.minecraftName ? (
                  <div className="space-y-3">
                    <p className="text-sm text-cream/60">{t("linkFirst")}</p>
                    <Button href="/dashboard" variant="outline" size="sm">
                      {t("toDashboard")}
                    </Button>
                  </div>
                ) : !bereit ? (
                  <p className="text-sm text-cream/60">{t("serverNotReady")}</p>
                ) : (
                  <BountyForm guthaben={guthaben} spieler={zielspieler} />
                )}
              </Panel>
            </section>

            {eigene.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold tracking-wide text-brass-200 uppercase">
                  <Coins className="size-4" /> {t("mineTitle")}
                </h2>
                <Panel>
                  <ul>
                    {eigene.map((eintrag) => (
                      <li
                        key={eintrag.id}
                        className="flex items-center gap-3 border-t border-white/5 px-4 py-2.5 text-sm first:border-t-0"
                      >
                        <PlayerHead name={eintrag.targetName} size={20} />
                        <span className="min-w-0 flex-1 truncate text-cream/85">{eintrag.targetName}</span>
                        <span className="font-mono text-xs text-cream/55">{formatNumber(eintrag.cogs)}</span>
                        <Badge tone={eintrag.status === "CLAIMED" ? "emerald" : "neutral"}>
                          {t(`status${eintrag.status}`)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </section>
            )}

            <p className="text-xs leading-relaxed text-cream/45">{t("rules")}</p>
          </aside>
        </div>
      </Container>
    </>
  );
}
