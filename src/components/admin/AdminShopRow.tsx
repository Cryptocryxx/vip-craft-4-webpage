import Image from "next/image";
import { MapPin, User } from "lucide-react";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { Badge } from "@/components/ui/Badge";
import { deleteShopAdminAction } from "@/lib/actions/admin";
import { dimensionLabels, type ShopDTO } from "@/lib/shop-types";
import { formatShortDate } from "@/lib/format";

export function AdminShopRow({ shop }: { shop: ShopDTO }) {
  const { owner } = shop;
  const ownerName = owner.name ?? owner.minecraftName ?? "Unbekannt";

  return (
    <div className="flex flex-wrap items-start gap-3 border-t border-white/5 p-4 first:border-t-0">
      {owner.image ? (
        <Image src={owner.image} alt="" width={36} height={36} className="rounded-full ring-1 ring-brass-500/40" />
      ) : (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brass-500/20 text-brass-200">
          <User className="size-4" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display font-bold text-cream">{shop.name}</p>
          <Badge tone={shop.open ? "emerald" : "neutral"}>{shop.open ? "Geöffnet" : "Geschlossen"}</Badge>
        </div>
        <p className="mt-0.5 text-xs text-cream/50">
          von {ownerName} · eingetragen {formatShortDate(shop.createdAt)}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 font-mono text-xs text-cream/60">
          <MapPin className="size-3 text-brass-300" />
          {shop.locationX} / {shop.locationZ} · {dimensionLabels[shop.dimension]}
        </p>
        <p className="mt-1 text-sm text-cream/75">{shop.sells.join(", ")}</p>
        {shop.description && <p className="mt-1 text-xs text-cream/55">{shop.description}</p>}
      </div>

      <form action={deleteShopAdminAction.bind(null, shop.id)}>
        <ConfirmSubmit label="Entfernen" title="Shop endgültig entfernen" confirmLabel="Endgültig entfernen" />
      </form>
    </div>
  );
}
