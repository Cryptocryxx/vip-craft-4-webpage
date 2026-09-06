"use client";

import { useMemo, useState } from "react";
import { SucheFeld } from "@/components/admin/SucheFeld";
import { UserRow, type AdminUserRow } from "@/components/admin/UserRow";
import { Panel } from "@/components/ui/Panel";
import { rolleName } from "@/lib/roles";

type Props = {
  users: AdminUserRow[];
  /** Die eigene Zeile – Rolle und Löschen bleiben dort gesperrt. */
  selfId: string;
  discordCheckable: boolean;
  darfRollenAendern: boolean;
  darfLoeschen: boolean;
};

/**
 * Die Accountliste mit Suche darüber.
 *
 * Gefiltert wird im Browser: Die Liste ist überschaubar, damit ist das Ergebnis
 * beim Tippen sofort da und niemand verliert halb ausgefüllte Zeilen durch ein
 * Neuladen der Seite.
 *
 * Gesucht wird über alles, wonach man jemanden sucht – Discord-Name,
 * Minecraft-Username, Twitch-Kanal, E-Mail und Rolle. Mehrere Wörter müssen
 * alle passen, dann grenzt „crypto admin" weiter ein statt mehr zu finden.
 */
export function UserSearch({ users, selfId, discordCheckable, darfRollenAendern, darfLoeschen }: Props) {
  const [suche, setSuche] = useState("");

  const gefiltert = useMemo(() => {
    const woerter = suche.toLowerCase().split(/\s+/).filter(Boolean);
    if (woerter.length === 0) return users;

    return users.filter((user) => {
      const heuhaufen = [
        user.name,
        user.minecraftName,
        user.twitchName,
        user.email,
        rolleName(user.role),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return woerter.every((wort) => heuhaufen.includes(wort));
    });
  }, [users, suche]);

  return (
    <>
      <SucheFeld
        wert={suche}
        setzen={setSuche}
        platzhalter="Nach Name, Username, Twitch oder E-Mail suchen"
        treffer={suche ? `${gefiltert.length} von ${users.length}` : null}
      />

      <Panel className="overflow-hidden">
        {users.length === 0 ? (
          <p className="p-10 text-center text-sm text-cream/60">Noch niemand registriert.</p>
        ) : gefiltert.length === 0 ? (
          <p className="p-10 text-center text-sm text-cream/60">Niemand gefunden, der zu &bdquo;{suche}&ldquo; passt.</p>
        ) : (
          gefiltert.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              isSelf={user.id === selfId}
              discordCheckable={discordCheckable}
              darfRollenAendern={darfRollenAendern}
              darfLoeschen={darfLoeschen}
            />
          ))
        )}
      </Panel>
    </>
  );
}
