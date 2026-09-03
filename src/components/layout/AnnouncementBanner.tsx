import { Megaphone } from "lucide-react";
import { getSiteSettings } from "@/lib/settings";

/** Ankündigungsbanner über dem Header – im Admin-Panel pflegbar. */
export async function AnnouncementBanner() {
  const settings = await getSiteSettings();
  if (!settings.announcementActive || !settings.announcement.trim()) return null;

  return (
    <div className="border-b border-brass-500/30 bg-linear-to-r from-brass-600/25 via-brass-500/20 to-brass-600/25">
      <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-sm text-brass-100">
        <Megaphone className="size-4 shrink-0" />
        {settings.announcement}
      </p>
    </div>
  );
}
