import { getTranslations } from "next-intl/server";
import { MapPin, Store } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import type { ShopDTO } from "@/lib/shop-types";

async function DimensionBadge({ dimension }: { dimension: ShopDTO["dimension"] }) {
  const t = await getTranslations("ShopTypes");
  if (dimension === "nether") return <Badge tone="copper">{t("nether")}</Badge>;
  if (dimension === "end") return <Badge tone="diamond">{t("end")}</Badge>;
  return null;
}

async function ShopCard({ shop }: { shop: ShopDTO }) {
  const t = await getTranslations("ShopGridExtra");
  const ownerName = shop.owner.minecraftName ?? shop.owner.name ?? "?";

  return (
    <Panel rivets className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg leading-snug font-bold text-cream">{shop.name}</h2>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-cream/60">
            <PlayerHead name={ownerName} size={18} />
            {ownerName}
          </p>
        </div>
        {shop.open ? <Badge tone="emerald">{t("open")}</Badge> : <Badge tone="rose">{t("closed")}</Badge>}
      </div>

      {shop.description && <p className="mt-3 text-sm leading-relaxed text-cream/70">{shop.description}</p>}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {shop.sells.map((item) => (
          <Badge key={item} tone="brass">
            {item}
          </Badge>
        ))}
      </div>

      <p className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3 font-mono text-xs text-cream/60">
        <MapPin className="size-3.5 text-brass-300" />
        X {shop.locationX} / Z {shop.locationZ}
        <DimensionBadge dimension={shop.dimension} />
      </p>
    </Panel>
  );
}

export async function ShopGrid({ shops }: { shops: ShopDTO[] }) {
  const t = await getTranslations("ShopGridExtra");

  if (shops.length === 0) {
    return (
      <Panel className="p-10 text-center">
        <Store className="mx-auto size-10 text-brass-500/40" />
        <p className="mt-3 font-display text-lg font-bold text-cream">{t("emptyTitle")}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-cream/60">{t("emptyText")}</p>
      </Panel>
    );
  }

  const open = shops.filter((shop) => shop.open);
  const closed = shops.filter((shop) => !shop.open);

  return (
    <div className="space-y-10">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {open.map((shop) => (
          <ShopCard key={shop.id} shop={shop} />
        ))}
      </div>

      {closed.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-sm font-bold tracking-wide text-cream/50 uppercase">
            {t("currentlyClosed")}
          </h2>
          <div className="grid gap-5 opacity-60 sm:grid-cols-2 lg:grid-cols-3">
            {closed.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
