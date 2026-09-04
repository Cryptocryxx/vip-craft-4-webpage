/**
 * Zentrale, öffentliche Konfiguration der Website.
 * NEXT_PUBLIC_* Variablen werden zur Build-Zeit auch ins Client-Bundle geschrieben.
 */
export const siteConfig = {
  name: "VIP Craft 4",
  tagline: "Der Create-Server der Uni-Community",
  serverIp: process.env.NEXT_PUBLIC_SERVER_IP ?? "play.vipcraft.de",
  mapUrl: process.env.NEXT_PUBLIC_MAP_URL ?? "https://vip4.wehrmann.ing/",
  discordInvite: process.env.NEXT_PUBLIC_DISCORD_INVITE ?? "https://discord.gg/tyd7KyMXDz",
  minecraftVersion: "1.21.1",
  createVersion: "Create 6",
  /** Mod-Loader des Servers – abgeglichen mit dem, was Crafty als Startdatei meldet. */
  loader: "NeoForge 21.1.249",
  /** Empfehlung fuer den Client. Weniger laeuft, ruckelt aber beim Nachladen. */
  minRamGb: 6,
  modpackName: "VIP Craft 4",
  modpackUrl: "https://www.curseforge.com/minecraft/modpacks/vip-craft-4",
  maxPlayers: 67,
  season: "Season 4",
} as const;
