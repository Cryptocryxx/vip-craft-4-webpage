import { Clock, ShieldAlert, ShieldCheck, ShieldQuestion, type LucideIcon } from "lucide-react";
import { DiscordStep } from "@/components/dashboard/DiscordStep";
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

function buildView(props: WhitelistStatusProps): View {
  const { whitelisted, application, whitelistOpen, discordJoined, discordCheckable } = props;
  // Nur wenn wir es wirklich wissen, darf der Antrag „unvollstaendig" heissen.
  // Ohne Pruefmoeglichkeit koennte die Person laengst im Discord sein.
  const discordFehlt = discordCheckable && !discordJoined;

  if (whitelisted) {
    return {
      tone: "approved",
      label: "Gewhitelisted",
      value: "Ja",
      icon: ShieldCheck,
      badge: { tone: "emerald", text: "Freigeschaltet" },
    };
  }

  if (application?.status === "PENDING") {
    const vollstaendig = Boolean(application.minecraftName) && !discordFehlt;
    return {
      tone: "pending",
      label: "Antrag läuft",
      value: vollstaendig ? "In Prüfung" : "Unvollständig",
      icon: Clock,
      badge: !application.minecraftName
        ? { tone: "brass", text: "Username fehlt" }
        : discordFehlt
          ? { tone: "brass", text: "Discord fehlt" }
          : { tone: "brass", text: "Wartet auf Team" },
    };
  }

  if (application?.status === "REJECTED") {
    return {
      tone: "rejected",
      label: "Gewhitelisted",
      value: "Nein",
      icon: ShieldAlert,
      badge: { tone: "rose", text: "Antrag abgelehnt" },
    };
  }

  if (!whitelistOpen) {
    return {
      tone: "closed",
      label: "Gewhitelisted",
      value: "Nein",
      icon: ShieldQuestion,
      badge: { tone: "neutral", text: "Anträge geschlossen" },
    };
  }

  return {
    tone: "rejected",
    label: "Gewhitelisted",
    value: "Nein",
    icon: ShieldAlert,
    badge: { tone: "rose", text: "Noch kein Antrag" },
  };
}

/** Whitelist-Karte im Dashboard: Status, Antragsdetails und Antragsformular. */
export function WhitelistStatus(props: WhitelistStatusProps) {
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
  } = props;
  const view = buildView(props);
  const Icon = view.icon;

  const showForm = !whitelisted && whitelistOpen && (application === null || application.status !== "APPROVED");
  const gamertagDa = Boolean(application?.minecraftName ?? minecraftName);

  /**
   * Kür: Minecraft-Account mit Discord verknüpfen.
   *
   * `erledigt` steht fest auf false – ob jemand verknüpft ist, weiß nur der
   * MC-Linker-Bot, die Website hat darauf keinen Zugriff. Als optionaler Schritt
   * blockiert er nichts und behauptet auch nicht, den Stand zu kennen.
   */
  const verknuepfungsSchritt: Schritt = {
    titel: "Minecraft-Account mit Discord verknüpfen",
    text: "Für die Freischaltung nicht nötig. Schreib dafür im Discord /account connect und folge dem, was der MC-Linker-Bot antwortet.",
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
  const beschreibungen = whitelistSchritte({ gamertagDa, discordJoined, discordCheckable, modpackGeladen });

  const mitBedienelement = (schritt: (typeof beschreibungen)[number]): Schritt => ({
    titel: schritt.titel,
    text: schritt.text,
    erledigt: schritt.erledigt,
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
   * Freigeschaltet, aber das Modpack fehlt noch? Dann bleibt dieser eine Punkt
   * stehen. Sonst haette der Hinweis auf der Startseite einen Schritt genannt,
   * den es hier gar nicht gibt – und ohne Modpack kommt man trotz Freigabe
   * nicht auf den Server.
   */
  const restSchritte: Schritt[] = [
    ...beschreibungen.filter((s) => s.schluessel === "modpack" && !s.erledigt).map(mitBedienelement),
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
        <p className="eyebrow">Whitelist-Status</p>
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
            <p>
              Du kannst dich jederzeit verbinden: <span className="font-mono text-cream">{serverIp}</span>
              {minecraftName ? (
                <>
                  {" "}
                  mit dem Account <span className="font-mono text-cream">{minecraftName}</span>.
                </>
              ) : (
                "."
              )}
            </p>
            <WhitelistSteps schritte={restSchritte} />
          </>
        ) : application?.status === "PENDING" ? (
          <>
            <WhitelistSteps schritte={schritte} />
            <p className="text-xs text-cream/45">Antrag angelegt am {formatDate(application.createdAt)}.</p>
          </>
        ) : application?.status === "REJECTED" ? (
          <>
            <p>Dein Antrag wurde abgelehnt.</p>
            {application.reviewNote && (
              <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-rose-100">
                <span className="block text-xs tracking-wider text-rose-200/70 uppercase">Begründung</span>
                {application.reviewNote}
              </p>
            )}
            {whitelistOpen && <p>Du kannst unten einen neuen Antrag stellen.</p>}
          </>
        ) : whitelistOpen ? (
          <WhitelistSteps schritte={schritte} />
        ) : (
          <p>Die Whitelist ist gerade geschlossen. Sobald wieder Plätze frei sind, kannst du hier einen Antrag stellen.</p>
        )}


        {showForm && (
          <div className="rounded-lg border border-white/10 bg-black/25 p-4">
            <WhitelistApplicationForm
              defaultName={application?.minecraftName ?? minecraftName}
              submitLabel={application?.status === "PENDING" ? "Antrag aktualisieren" : "Whitelist beantragen"}
            />
          </div>
        )}
      </div>
    </div>
  );
}
