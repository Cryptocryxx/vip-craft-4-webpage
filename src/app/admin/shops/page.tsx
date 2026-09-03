import { Store } from "lucide-react";
import { AdminShopRow } from "@/components/admin/AdminShopRow";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listShops } from "@/lib/shops";

export default async function AdminShopsPage() {
  const shops = await listShops();

  return (
    <div>
      <SectionHeading
        eyebrow="Wirtschaft"
        icon={Store}
        title={`${shops.length} ${shops.length === 1 ? "Shop" : "Shops"}`}
        description="Shops tragen Spieler im Dashboard ein und sind sofort im Shop-Bereich sichtbar – ohne Freigabe. Hier lassen sich unangemessene Einträge entfernen."
        className="mb-5"
      />
      <Panel className="overflow-hidden">
        {shops.length === 0 ? (
          <p className="p-10 text-center text-sm text-cream/60">Noch kein Shop eingetragen.</p>
        ) : (
          shops.map((shop) => <AdminShopRow key={shop.id} shop={shop} />)
        )}
      </Panel>
    </div>
  );
}
