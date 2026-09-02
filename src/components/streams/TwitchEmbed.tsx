"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Hostname der aktuellen Seite – null beim Server-Rendering. */
function useHostname(): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.hostname,
    () => null,
  );
}

/**
 * Offizielles Twitch-Player-Embed (iframe).
 * Der `parent`-Parameter muss der Hostname der einbettenden Seite sein – daher wird er clientseitig ermittelt.
 */
export function TwitchEmbed({ channel, title, className }: { channel: string; title?: string; className?: string }) {
  const parent = useHostname();

  if (!parent) {
    return <div className={className ?? "aspect-video w-full"} aria-hidden="true" style={{ background: "#000" }} />;
  }

  const params = new URLSearchParams({
    channel,
    parent,
    muted: "true",
    autoplay: "false",
  });

  return (
    <iframe
      src={`https://player.twitch.tv/?${params.toString()}`}
      title={title ?? `Twitch-Stream von ${channel}`}
      className={className ?? "aspect-video w-full"}
      allowFullScreen
      allow="autoplay; fullscreen; picture-in-picture"
    />
  );
}
