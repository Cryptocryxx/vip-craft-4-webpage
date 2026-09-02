export type NavItem = {
  href: "/" | "/map" | "/community" | "/leaderboards" | "/schematics" | "/streams" | "/dashboard";
  label: string;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/community", label: "Community" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/schematics", label: "Schematics" },
  { href: "/streams", label: "Streams" },
];
