import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, HandCoins, History, Inbox, LogIn, Receipt, Send } from "lucide-react";
import { auth } from "@/auth";
import { KreditFormular } from "@/components/credits/KreditFormular";
import { KreditKarte } from "@/components/credits/KreditKarte";
import { KreditKnopf } from "@/components/credits/KreditKnopf";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatCogsLong } from "@/lib/currency";
import { kontostandSpurs } from "@/lib/economy-source";
import { kubejsBank } from "@/lib/kredit-bank";
import { kreditPartner, meineKredite, type KreditZeile } from "@/lib/kredite";
import { eigeneUuid } from "@/lib/minecraft-konto";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Credits");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/**
 * Kredite zwischen Spielern: anbieten, annehmen, begleichen.
 *
 * Nur für Angemeldete, und alles hier sieht nur, wer beteiligt ist – ein Kredit
 * ist eine Abmachung zwischen zwei Leuten, keine Rangliste. Die Regeln und die
 * Buchungen stehen in lib/kredite.ts.
 */
export default async function KreditePage() {
  const [session, t] = await Promise.all([auth(), getTranslations("Credits")]);

  const kopf = (
    <PageHeader eyebrow={t("eyebrow")} icon={HandCoins} title={t("title")} description={t("description")}>
      <Button href="/economy" variant="ghost" size="sm">
        <ArrowLeft className="size-4" /> {t("backToEconomy")}
      </Button>
    </PageHeader>
  );

  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, minecraftName: true, minecraftUuid: true, whitelisted: true },
      })
    : null;

  if (!user) {
    return (
      <>
        {kopf}
        <Container className="py-12">
          <Panel className="p-10 text-center">
            <LogIn className="mx-auto size-10 text-brass-500/40" />
            <p className="mt-3 font-display text-lg font-bold text-cream">{t("loginTitle")}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-cream/60">{t("loginText")}</p>
            <Button href="/dashboard" className="mt-5">
              {t("loginButton")}
            </Button>
          </Panel>
        </Container>
      </>
    );
  }

  if (!user.whitelisted || !user.minecraftName) {
    return (
      <>
        {kopf}
        <Container className="py-12">
          <Panel className="p-10 text-center">
            <HandCoins className="mx-auto size-10 text-brass-500/40" />
            <p className="mt-3 font-display text-lg font-bold text-cream">{t("notEligibleTitle")}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-cream/60">{t("notEligibleText")}</p>
          </Panel>
        </Container>
      </>
    );
  }

  const uuid = await eigeneUuid(user);
  const [kredite, partner, bereit, guthaben] = await Promise.all([
    meineKredite(user.id),
    kreditPartner(user.id),
    kubejsBank.bereit(),
    uuid ? kontostandSpurs(uuid) : Promise.resolve(null),
  ]);

  const leer = (text: string) => <p className="text-sm text-cream/50">{text}</p>;
  const liste = (zeilen: KreditZeile[], inhalt: (k: KreditZeile) => ReactNode) => (
    <div className="grid gap-4 lg:grid-cols-2">{zeilen.map(inhalt)}</div>
  );

  return (
    <>
      {kopf}
      <Container className="space-y-14 py-12">
        {kredite.angeboteAnMich.length > 0 && (
          <section id="angebote" className="scroll-mt-24">
            <SectionHeading eyebrow={t("offersEyebrow")} icon={Inbox} title={t("offersTitle")} description={t("offersDescription")} />
            {liste(kredite.angeboteAnMich, (k) => (
              <KreditKarte key={k.id} kredit={k} rolle="nehmer">
                <KreditKnopf
                  id={k.id}
                  aktion="annehmen"
                  variante="brass"
                  label={t("accept")}
                  rueckfrage={t("acceptConfirm", {
                    amount: formatCogsLong(k.betragSpurs),
                    due: formatCogsLong(k.faelligSpurs),
                    name: k.lenderName,
                  })}
                />
                <KreditKnopf id={k.id} aktion="ablehnen" label={t("decline")} />
              </KreditKarte>
            ))}
          </section>
        )}

        <section id="schulden" className="scroll-mt-24">
          <SectionHeading
            eyebrow={t("debtsEyebrow")}
            icon={Receipt}
            title={t("debtsTitle")}
            description={guthaben !== null ? t("debtsDescriptionBalance", { amount: formatCogsLong(guthaben) }) : t("debtsDescription")}
          />
          {kredite.schulden.length === 0
            ? leer(t("noDebts"))
            : liste(kredite.schulden, (k) => (
                <KreditKarte key={k.id} kredit={k} rolle="nehmer">
                  {k.status === "ACTIVE" && (
                    <>
                      <KreditKnopf
                        id={k.id}
                        aktion="begleichen"
                        variante="brass"
                        label={t("repay", { due: formatCogsLong(k.faelligSpurs) })}
                        rueckfrage={t("repayConfirm", { due: formatCogsLong(k.faelligSpurs), name: k.lenderName })}
                      />
                      {guthaben !== null && guthaben < k.faelligSpurs && (
                        <p className="self-center text-xs text-cream/50">
                          {t("missing", { amount: formatCogsLong(k.faelligSpurs - guthaben) })}
                        </p>
                      )}
                    </>
                  )}
                </KreditKarte>
              ))}
        </section>

        <section id="vergeben" className="scroll-mt-24">
          <SectionHeading eyebrow={t("lendEyebrow")} icon={Send} title={t("lendTitle")} description={t("lendDescription")} />
          <Panel className="p-6">
            <KreditFormular partner={partner} guthabenSpurs={guthaben} bereit={bereit} />
          </Panel>
        </section>

        {kredite.verliehen.length > 0 && (
          <section id="verliehen" className="scroll-mt-24">
            <SectionHeading eyebrow={t("lentEyebrow")} icon={HandCoins} title={t("lentTitle")} />
            {liste(kredite.verliehen, (k) => (
              <KreditKarte key={k.id} kredit={k} rolle="geber">
                {k.status === "OFFERED" && <KreditKnopf id={k.id} aktion="zurueckziehen" label={t("withdraw")} />}
              </KreditKarte>
            ))}
          </section>
        )}

        {kredite.verlauf.length > 0 && (
          <section id="verlauf" className="scroll-mt-24">
            <SectionHeading eyebrow={t("historyEyebrow")} icon={History} title={t("historyTitle")} />
            {liste(kredite.verlauf, (k) => (
              <KreditKarte key={k.id} kredit={k} rolle={k.ichBinGeber ? "geber" : "nehmer"} />
            ))}
          </section>
        )}

        <p className="text-xs leading-relaxed text-cream/45">{t("rules")}</p>
      </Container>
    </>
  );
}
