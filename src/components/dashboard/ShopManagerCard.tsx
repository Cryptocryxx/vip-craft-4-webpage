"use client";

import { useState } from "react";
import { MapPin, Plus, Store, X } from "lucide-react";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { ShopForm } from "@/components/dashboard/ShopForm";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { deleteShopAction } from "@/lib/actions/shops";
import { dimensionLabels, type ShopDTO } from "@/lib/shop-types";
import { cn } from "@/lib/utils";

function ShopRow({ shop }: { shop: ShopDTO }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/25 p-4">
        <ShopForm shop={shop} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display font-bold text-cream">{shop.name}</p>
          <p className="mt-0.5 flex items-center gap-1 font-mono text-xs text-cream/50">
            <MapPin className="size-3" /> {shop.locationX} / {shop.locationZ} · {dimensionLabels[shop.dimension]}
            {!shop.open && <span className="text-rose-300/80">· geschlossen</span>}
          </p>
        </div>
        <Badge tone="emerald">Live</Badge>
      </div>

      <p className="mt-2 text-sm text-cream/70">{shop.sells.join(", ")}</p>

      <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
        <button type="button" onClick={() => setEditing(true)} className="btn btn-ghost btn-sm">
          Bearbeiten
        </button>
        <form action={deleteShopAction.bind(null, shop.id)}>
          <ConfirmSubmit label="Löschen" />
        </form>
      </div>
    </div>
  );
}

/** Shop-Verwaltung im Dashboard: eigene Shops auflisten, neue eintragen. */
export function ShopManagerCard({ shops }: { shops: ShopDTO[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/5 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="eyebrow">Wirtschaft</p>
          <h2 className="mt-1 text-xl font-bold text-cream">Meine Shops</h2>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          aria-expanded={adding}
          className={cn("btn btn-md", adding ? "btn-outline" : "btn-diamond")}
        >
          {adding ? <X className="size-4" /> : <Plus className="size-4" />}
          {adding ? "Schließen" : "Shop eintragen"}
        </button>
      </div>

      {adding && (
        <div className="border-b border-white/5 bg-diamond-950/40 p-4 sm:p-6">
          <ShopForm onCancel={() => setAdding(false)} />
        </div>
      )}

      <div className="space-y-3 p-4 sm:p-6">
        {shops.length === 0 ? (
          <p className="flex items-center gap-2 py-4 text-sm text-cream/55">
            <Store className="size-4" /> Noch kein Shop eingetragen. Trag deinen ein, damit er unter „Shops“ für alle auftaucht.
          </p>
        ) : (
          shops.map((shop) => <ShopRow key={shop.id} shop={shop} />)
        )}
      </div>
    </Panel>
  );
}
