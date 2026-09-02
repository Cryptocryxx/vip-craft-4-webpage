/**
 * Zentrale, öffentliche Konfiguration der Website.
 * NEXT_PUBLIC_* Variablen werden zur Build-Zeit auch ins Client-Bundle geschrieben.
 */
export const siteConfig = {
  name: "VIP Craft 4",
  tagline: "Der Create-Server der Uni-Community",
  serverIp: process.env.NEXT_PUBLIC_SERVER_IP ?? "play.vipcraft.de",
  mapUrl: process.env.NEXT_PUBLIC_MAP_URL ?? "https://demo.squaremap.app/",
  discordInvite: process.env.NEXT_PUBLIC_DISCORD_INVITE ?? "https://discord.gg/vipcraft",
  minecraftVersion: "1.20.1",
  createVersion: "Create 6",
  modpackName: "VIP Craft 4 Pack",
  modpackUrl: "https://example.com/vipcraft4-modpack", // Platzhalter
  maxPlayers: 60,
  season: "Season 4",
} as const;
