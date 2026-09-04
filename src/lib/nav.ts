export type NavItem = {
  href: "/" | "/map" | "/shops" | "/spieler" | "/community" | "/leaderboards" | "/schematics" | "/streams" | "/dashboard";
  label: string;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/shops", label: "Shops" },
  { href: "/spieler", label: "Spieler" },
  { href: "/community", label: "Community" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/schematics", label: "Schematics" },
  { href: "/streams", label: "Streams" },
];
