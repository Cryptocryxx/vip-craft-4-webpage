import { Settings } from "lucide-react";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getSiteSettings } from "@/lib/settings";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div>
      <SectionHeading
        eyebrow="Konfiguration"
        icon={Settings}
        title="Server-Einstellungen"
        description="Diese Werte überschreiben die Vorgaben aus der .env und gelten sofort für alle Besucher."
        className="mb-5"
      />
      <Panel className="p-6">
        <SettingsForm settings={settings} />
      </Panel>
    </div>
  );
}
