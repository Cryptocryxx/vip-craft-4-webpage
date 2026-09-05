import { getTranslations } from "next-intl/server";
import { Clock, ShieldAlert, ShieldCheck, ShieldQuestion, type LucideIcon } from "lucide-react";
import { DiscordStep } from "@/components/dashboard/DiscordStep";
import { MissingReferenceForm } from "@/components/dashboard/MissingReferenceForm";
import { ModpackStep } from "@/components/dashboard/ModpackStep";
import { WhitelistApplicationForm } from "@/components/dashboard/WhitelistApplicationForm";
import { WhitelistSteps, type Schritt } from "@/components/dashboard/WhitelistSteps";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Gear } from "@/components/ui/Gear";
import { formatDate } from "@/lib/format";
import { whitelistSchritte } from "@/lib/whitelist-steps";
import type { WhitelistApplicationDTO } from "@/lib/whitelist-types";
import { cn } from "@/lib/utils";

type WhitelistStatusProps = {
  whitelisted: boolean;
  minecraftName: string | null;
  serverIp: string;
  application: WhitelistApplicationDTO | null;
  whitelistOpen: boolean;
  /** Ist der Account im Discord-Server? (siehe lib/discord.ts) */
  discordJoined: boolean;
  discordInvite: string;
  /**
   * Lässt sich die Mitgliedschaft automatisch abfragen? Ohne DISCORD_GUILD_ID
   * nicht. Der Beitritt bleibt trotzdem Pflicht und steht weiterhin in der
   * Liste – nur abhaken kann ihn dann niemand automatisch.
   */
  discordCheckable: boolean;
  /**
   * Die Mitgliedschaft ließe sich abfragen, aber der gespeicherte Token stammt
   * aus einer Anmeldung ohne die nötige Erlaubnis. Dann hilft nur ein neuer
   * Login – und darauf muss der Schritt hinweisen.
   */
  discordNeuAnmelden: boolean;
  /** Wurde der Modpack-Link schon geklickt? */
  modpackGeladen: boolean;
  /** Mojang kennt den hinterlegten Namen nicht (siehe lib/name-check.ts). */
  nameUngueltig: boolean;
  /** Vom Team vorübergehend von der Server-Whitelist genommen. */
  whitelistSuspended: boolean;
  /** Freigegeben, aber der Serverbefehl steht noch aus (siehe whitelist-queue). */
  whitelistPending: boolean;
  /** Wann der Server startet – für die Vormerkungs-Meldung. */
  serverStart: string | null;
};

type View = {
  tone: "approved" | "pending" | "rejected" | "closed";
  label: string;
  value: string;
  icon: LucideIcon;
  badge: { tone: BadgeTone; text: string } | null;
};

const toneClasses: Record<View["tone"], string> = {
  approved:
    "border-emerald-400/50 bg-linear-to-br from-emerald-500/15 via-emerald-900/20 to-wood-900 shadow-[0_0_40px_-12px_rgba(52,211,153,0.5)]",
  pending:
    "border-brass-400/50 bg-linear-to-br from-brass-500/15 via-wood-800 to-wood-900 shadow-[0_0_40px_-12px_rgba(217,168,63,0.55)]",
  rejected:
    "border-rose-400/50 bg-linear-to-br from-rose-500/15 via-rose-950/30 to-wood-900 shadow-[0_0_40px_-12px_rgba(251,113,133,0.45)]",
  closed: "border-white/15 bg-linear-to-br from-white/5 via-wood-800 to-wood-900",
};

const ringClasses: Record<View["tone"], string> = {
  approved: "border-emerald-300 bg-emerald-500/20 text-emerald-200",
  pending: "border-brass-300 bg-brass-500/20 text-brass-200",
  rejected: "border-rose-300 bg-rose-500/20 text-rose-200",
  closed: "border-white/30 bg-white/10 text-cream/70",
};

const valueClasses: Record<View["tone"], string> = {
  approved: "text-emerald-200",
  pending: "text-brass-200",
  rejected: "text-rose-200",
  closed: "text-cream/80",
};

type Translator = Awaited<ReturnType<typeof getTranslations>>;

function buildView(props: WhitelistStatusProps, t: Translator): View {
  const { whitelisted, application, whitelistOpen, discordJoined, discordCheckable } = props;
  // Nur wenn wir es wirklich wissen, darf der Antrag „unvollstaendig" heissen.
  // Ohne Pruefmoeglichkeit koennte die Person laengst im Discord sein.
  const discordFehlt = discordCheckable && !discordJoined;

  if (whitelisted) {
    return {
      tone: "approved",
      label: t("whitelistedLabel"),
      value: t("yes"),
      icon: ShieldCheck,
      badge: { tone: "emerald", text: t("approved") },
    };
  }

  if (application?.status === "PENDING") {
    const vollstaendig = Boolean(application.minecraftName) && !discordFehlt;
    return {
      tone: "pending",
      label: t("applicationRunning"),
      value: vollstaendig ? t("inReview") : t("incomplete"),
      icon: Clock,
      badge: !application.minecraftName
        ? { tone: "brass", text: t("usernameMissing") }
        : discordFehlt
          ? { tone: "brass", text: t("discordMissing") }
          : { tone: "brass", text: t("waitingForTeam") },
    };
  }

  if (application?.status === "REJECTED") {
    return {
      tone: "rejected",
      label: t("whitelistedLabel"),
      value: t("no"),
      icon: ShieldAlert,
      badge: { tone: "rose", text: t("applicationRejected") },
    };
  }

  if (!whitelistOpen) {
    return {
      tone: "closed",
      label: t("whitelistedLabel"),
      value: t("no"),
      icon: ShieldQuestion,
      badge: { tone: "neutral", text: t("applicationsClosed") },
    };
  }

  return {
    tone: "rejected",
    label: t("whitelistedLabel"),
    value: t("no"),
    icon: ShieldAlert,
    badge: { tone: "rose", text: t("noApplicationYet") },
  };
}

/** Whitelist-Karte im Dashboard: Status, Antragsdetails und Antragsformular. */
export async function WhitelistStatus(props: WhitelistStatusProps) {
  const {
    whitelisted,
    minecraftName,
    serverIp,
    application,
    whitelistOpen,
    discordJoined,
    discordInvite,
    discordCheckable,
    discordNeuAnmelden,
    modpackGeladen,
    nameUngueltig,
    whitelistSuspended,
    whitelistPending,
    serverStart,
  } = props;

  const t = await getTranslations("WhitelistStatus");
  const view = buildView(props, t);
  const Icon = view.icon;

  const showForm = !whitelisted && whitelistOpen && (application === null || application.status !== "APPROVED");
  const gamertagDa = Boolean(application?.minecraftName ?? minecraftName);
  // Alte Anträge von vor der Pflichtangabe "wen kennst du auf dem Server":
  // Wer schon einen Antrag hat, aber noch keine Nachricht dazu, soll das
  // nachreichen - unabhängig vom Status.
  const needsReference = Boolean(application) && !application?.message;

  /**
   * Kür: Minecraft-Account mit Discord verknüpfen.
   *
   * `erledigt` steht fest auf false – ob jemand verknüpft ist, weiß nur der
   * MC-Linker-Bot, die Website hat darauf keinen Zugriff. Als optionaler Schritt
   * blockiert er nichts und behauptet auch nicht, den Stand zu kennen.
   */
  const verknuepfungsSchritt: Schritt = {
    titel: t("linkMinecraftOptional.title"),
    text: t("linkMinecraftOptional.text"),
    erledigt: false,
    optional: true,
  };

  /**
   * Was bis zum Mitspielen fehlt. Die Bedingungen stehen in lib/whitelist-steps,
   * damit der Hinweis auf der Startseite denselben „naechsten Schritt" nennt wie
   * diese Liste. Hier kommen nur die Bedienelemente dazu.
   *
   * Kein Schritt „Freigabe abwarten": Der Status steht schon gross in dieser
   * Karte, und Warten ist ohnehin nichts, was man abhaken koennte.
   */
  const beschreibungen = await whitelistSchritte({ gamertagDa, nameUngueltig, discordJoined, discordCheckable, modpackGeladen });

  const mitBedienelement = (schritt: (typeof beschreibungen)[number]): Schritt => ({
    titel: schritt.titel,
    text: schritt.text,
    erledigt: schritt.erledigt,
    ton: schritt.ton,
    aktion:
      schritt.schluessel === "discord" && !schritt.erledigt ? (
        <DiscordStep
          joined={false}
          invite={discordInvite}
          kompakt
          pruefbar={discordCheckable}
          neuAnmelden={discordNeuAnmelden}
        />
      ) : schritt.schluessel === "modpack" ? (
        <ModpackStep bereitsGeladen={schritt.erledigt} />
      ) : undefined,
  });

  const schritte: Schritt[] = [...beschreibungen.map(mitBedienelement), verknuepfungsSchritt];

  /**
   * Freigeschaltet? Dann bleiben nur die Punkte stehen, die trotzdem noch
   * blockieren: ein Name, den es nicht gibt, und das fehlende Modpack. Sonst
   * haette der Hinweis auf der Startseite einen Schritt genannt, den es hier
   * gar nicht gibt – und mit beidem kommt man trotz Freigabe nicht auf den
   * Server.
   */
  const restSchritte: Schritt[] = [
    ...beschreibungen
      .filter((s) => (s.schluessel === "modpack" || s.schluessel === "gamertag") && !s.erledigt)
      .map(mitBedienelement),
    verknuepfungsSchritt,
  ];

  return (
    <div className={cn("relative flex h-full flex-col overflow-hidden rounded-xl border p-6", toneClasses[view.tone])}>
      {view.tone === "pending" ? (
        <Gear
          teeth={14}
          className="pointer-events-none absolute -right-8 -bottom-8 size-44 text-brass-300/10 animate-gear-spin [animation-duration:18s]"
        />
      ) : (
        <Icon
          className={cn(
            "pointer-events-none absolute -right-6 -bottom-6 size-40 opacity-10",
            view.tone === "approved" ? "text-emerald-300" : view.tone === "rejected" ? "text-rose-300" : "text-cream",
          )}
        />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <p className="eyebrow">{t("eyebrow")}</p>
        {view.badge && <Badge tone={view.badge.tone}>{view.badge.text}</Badge>}
      </div>

      <div className="relative mt-4 flex items-center gap-3">
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full border-2", ringClasses[view.tone])}>
          <Icon className="size-6" />
        </span>
        <div>
          <p className="text-xs tracking-wider text-cream/60 uppercase">{view.label}</p>
          <p className={cn("font-display text-3xl leading-none font-bold", valueClasses[view.tone])}>{view.value}</p>
        </div>
      </div>

      <div className="relative mt-5 space-y-4 text-sm text-cream/75">
        {whitelisted ? (
          <>
            {whitelistPending ? (
              // Freigegeben, aber noch nicht auf dem Server: entweder wartet
              // alles auf den Start, oder der Server war beim Freischalten aus.
              <p className="rounded-lg border border-brass-400/40 bg-brass-500/10 p-3 text-brass-100">
                {t("pendingSecured")}{" "}
                {serverStart ? t("pendingWithDate", { date: serverStart }) : t("pendingWithoutDate")}
              </p>
            ) : whitelistSuspended ? (
              // Sonst steht hier „du kannst dich jederzeit verbinden", waehrend
              // der Server einen abweist – und niemand wuesste, warum.
              <p className="rounded-lg border border-brass-400/40 bg-brass-500/10 p-3 text-brass-100">
                {t("suspended")}
              </p>
            ) : (
              <p>
                {t.rich("canConnect", {
                  ip: serverIp,
                  ipTag: (chunks) => <span className="font-mono text-cream">{chunks}</span>,
                })}
                {minecraftName ? (
                  t.rich("canConnectWithAccount", {
                    name: minecraftName,
                    nameTag: (chunks) => <span className="font-mono text-cream">{chunks}</span>,
                  })
                ) : (
                  "."
                )}
              </p>
            )}
            <WhitelistSteps schritte={restSchritte} />
            {needsReference && <MissingReferenceForm />}
          </>
        ) : application?.status === "PENDING" ? (
          <>
            <WhitelistSteps schritte={schritte} />
            <p className="text-xs text-cream/45">{t("applicationCreatedAt", { date: formatDate(application.createdAt) })}</p>
          </>
        ) : application?.status === "REJECTED" ? (
          <>
            <p>{t("rejected")}</p>
            {application.reviewNote && (
              <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-rose-100">
                <span className="block text-xs tracking-wider text-rose-200/70 uppercase">{t("reasonLabel")}</span>
                {application.reviewNote}
              </p>
            )}
            {whitelistOpen && <p>{t("canApplyAgain")}</p>}
          </>
        ) : whitelistOpen ? (
          <WhitelistSteps schritte={schritte} />
        ) : (
          <p>{t("whitelistClosed")}</p>
        )}


        {showForm && needsReference && (
          <p className="rounded-lg border border-brass-400/40 bg-brass-500/10 p-3 text-brass-100">
            {t("missingReferenceNotice")}
          </p>
        )}

        {showForm && (
          <div className="rounded-lg border border-white/10 bg-black/25 p-4">
            <WhitelistApplicationForm
              defaultName={application?.minecraftName ?? minecraftName}
              submitLabel={application?.status === "PENDING" ? t("updateApplication") : t("applyWhitelist")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
