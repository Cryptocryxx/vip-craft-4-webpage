import { MessageSquare, Send, ShieldCheck } from "lucide-react";
import { DiscordIcon } from "@/components/ui/DiscordIcon";

/**
 * Erklärt die optionale Verknüpfung von Minecraft-Account und Discord.
 *
 * Auf dem Server läuft DiscordLinker (MC-Linker-Bot). Der Chat wird schon ohne
 * Verknüpfung in beide Richtungen gespiegelt – das ist eine Servereinstellung.
 * Verknüpft kommt hinzu, dass der Bot weiß, wer du bist.
 *
 * Bewusst nur das aufgezählt, was sich an der Serverkonfiguration und der
 * MC-Linker-Dokumentation belegen lässt. Was die Verknüpfung sonst noch kann,
 * hängt davon ab, was das Team im Bot einstellt.
 */

const vorteile = [
  {
    icon: MessageSquare,
    text: "Der Bot ordnet deine Ingame-Nachrichten deinem Discord-Profil zu, statt nur den Spielernamen zu zeigen.",
  },
  {
    icon: Send,
    text: "Private Nachrichten aus Discord kommen bei dir im Spiel an.",
  },
  {
    icon: ShieldCheck,
    text: "Discord erkennt dich als Spieler des Servers – Grundlage für Rollen und Abzeichen im Discord.",
  },
];

export function DiscordLinkStep({ invite }: { invite: string }) {
  return (
    <div className="rounded-lg border border-diamond-400/30 bg-diamond-500/10 p-4">
      <p className="text-sm text-cream/75">
        Der Chat läuft ohnehin schon zwischen Server und Discord hin und her. Wenn du deinen Account zusätzlich
        verknüpfst, weiß der Bot, wer du bist:
      </p>

      <ul className="mt-3 space-y-2">
        {vorteile.map((vorteil) => {
          const Icon = vorteil.icon;
          return (
            <li key={vorteil.text} className="flex items-start gap-2 text-sm text-cream/70">
              <Icon className="mt-0.5 size-4 shrink-0 text-diamond-300" />
              {vorteil.text}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-sm text-cream/75">
        So geht&apos;s: Schreib im Discord{" "}
        <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs text-diamond-200">/account connect</code>{" "}
        und folge dem, was der <span className="text-cream">MC Linker</span>-Bot dir antwortet.
      </p>

      <a href={invite} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm mt-3">
        <DiscordIcon className="size-4" /> Discord öffnen
      </a>
    </div>
  );
}
