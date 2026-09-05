import { unstable_rethrow } from "next/navigation";
import "server-only";
import { prisma } from "@/lib/prisma";
import { settingsDefaults, type SiteSettings } from "@/lib/settings-types";

/** Liest die Einstellungen aus der Datenbank und füllt Lücken mit den .env-Defaults. */
export async function getSiteSettings(): Promise<SiteSettings> {
  let rows: Array<{ key: string; value: string }> = [];
  try {
    rows = await prisma.setting.findMany({ select: { key: true, value: true } });
  } catch (error) {
    unstable_rethrow(error);
    // Vor dem ersten `prisma db push` existiert die Tabelle noch nicht.
    console.error("[settings] Einstellungen konnten nicht gelesen werden:", error);
    return settingsDefaults;
  }

  const map = new Map(rows.map((row) => [row.key, row.value]));
  const text = (key: keyof SiteSettings, fallback: string) => {
    const value = map.get(key);
    return value !== undefined && value.length > 0 ? value : fallback;
  };
  const flag = (key: keyof SiteSettings, fallback: boolean) => {
    const value = map.get(key);
    return value === undefined ? fallback : value === "true";
  };
  const nummer = (key: keyof SiteSettings, fallback: number) => {
    const value = Number(map.get(key));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };

  return {
    serverIp: text("serverIp", settingsDefaults.serverIp),
    mapUrl: text("mapUrl", settingsDefaults.mapUrl),
    discordInvite: text("discordInvite", settingsDefaults.discordInvite),
    whitelistOpen: flag("whitelistOpen", settingsDefaults.whitelistOpen),
    announcement: map.get("announcement") ?? settingsDefaults.announcement,
    announcementActive: flag("announcementActive", settingsDefaults.announcementActive),
    gameLogRetentionDays: nummer("gameLogRetentionDays", settingsDefaults.gameLogRetentionDays),
  };
}

/** Schreibt die übergebenen Werte (Teilmenge erlaubt) in die Datenbank. */
export async function saveSiteSettings(values: Partial<SiteSettings>): Promise<void> {
  const entries = Object.entries(values).filter(([, value]) => value !== undefined);

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      }),
    ),
  );
}
