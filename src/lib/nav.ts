/**
 * Die Hauptnavigation. Nur Adresse und Schlüssel – die Beschriftung kommt aus
 * den Übersetzungen (Namespace "Nav" in messages/*.json), damit dieselbe
 * Liste in Deutsch und Englisch funktioniert.
 */
export type NavKey = "home" | "map" | "shops" | "spieler" | "community" | "leaderboards" | "schematics" | "streams";

export type NavItem = {
  href: "/" | "/map" | "/shops" | "/spieler" | "/community" | "/leaderboards" | "/schematics" | "/streams";
  key: NavKey;
};

export const navItems: NavItem[] = [
  { href: "/", key: "home" },
  { href: "/map", key: "map" },
  { href: "/shops", key: "shops" },
  { href: "/spieler", key: "spieler" },
  { href: "/community", key: "community" },
  { href: "/leaderboards", key: "leaderboards" },
  { href: "/schematics", key: "schematics" },
  { href: "/streams", key: "streams" },
];
