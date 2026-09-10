import { getTranslations } from "next-intl/server";
import { MapPin, Star, Store } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { ShopRatingForm } from "@/components/shops/ShopRatingForm";
import { MAX_STERNE, type ShopDTO } from "@/lib/shop-types";

async function DimensionBadge({ dimension }: { dimension: ShopDTO["dimension"] }) {
  const t = await getTranslations("ShopTypes");
  if (dimension === "nether") return <Badge tone="copper">{t("nether")}</Badge>;
  if (dimension === "end") return <Badge tone="diamond">{t("end")}</Badge>;
  return null;
}

/**
 * Die Sterne eines Ladens.
 *
 * Gefuellt wird auf den gerundeten Schnitt - halbe Sterne waeren genauer, aber
 * bei einer Handvoll Bewertungen taeuscht die Genauigkeit mehr, als sie sagt.
 * Die genaue Zahl steht daneben.
 */
function Sterne({ schnitt }: { schnitt: number }) {
  const voll = Math.round(schnitt);
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: MAX_STERNE }, (_, i) => (
        <Star
          key={i}
          className={i < voll ? "size-3.5 text-brass-300" : "size-3.5 text-cream/20"}
          fill="currentColor"
        />
      ))}
    </span>
  );
}

type KartenProps = {
  shop: ShopDTO;
  /** Angemeldeter Besucher, oder null. */
  viewerId: string | null;
  /** Wie dieser Besucher den Laden bisher bewertet hat. */
  eigene: number | null;
};

async function ShopCard({ shop, viewerId, eigene }: KartenProps) {
  const t = await getTranslations("ShopGridExtra");
  const tr = await getTranslations("ShopRating");
  const ownerName = shop.owner.minecraftName ?? shop.owner.name ?? "?";
  const eigenerLaden = viewerId !== null && viewerId === shop.owner.id;
  const { bewertungen } = shop;

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

      {/* Bewertungen ganz unten und einklappbar: Die Karte soll zuerst sagen,
          was der Laden verkauft und wo er steht. */}
      <div className="mt-3 border-t border-white/5 pt-3">
        <p className="flex items-center gap-2 text-xs text-cream/60">
          <Sterne schnitt={bewertungen.schnitt} />
          {bewertungen.anzahl === 0 ? (
            <span>{tr("none")}</span>
          ) : (
            <span>
              {bewertungen.schnitt.toLocaleString("de-DE", { minimumFractionDigits: 1 })} ·{" "}
              {tr("count", { count: bewertungen.anzahl })}
            </span>
          )}
        </p>

        <details className="group mt-2">
          <summary className="cursor-pointer text-xs text-brass-200 hover:text-brass-100">
            {eigenerLaden ? tr("showOnly") : tr("showAndRate")}
          </summary>

          <div className="mt-3 space-y-3">
            {bewertungen.letzte.length > 0 && (
              <ul className="space-y-2">
                {bewertungen.letzte.map((eintrag) => (
                  <li key={eintrag.id} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <p className="flex items-center gap-2 text-[11px] text-cream/50">
                      <Sterne schnitt={eintrag.stars} />
                      {eintrag.autor}
                    </p>
                    {eintrag.comment && <p className="mt-1 text-sm text-cream/75">{eintrag.comment}</p>}
                  </li>
                ))}
              </ul>
            )}

            {eigenerLaden ? (
              <p className="text-xs text-cream/50">{tr("ownShopHint")}</p>
            ) : viewerId === null ? (
              <p className="text-xs text-cream/50">{tr("signInFirst")}</p>
            ) : (
              <ShopRatingForm shopId={shop.id} eigene={eigene} />
            )}
          </div>
        </details>
      </div>
    </Panel>
  );
}

export async function ShopGrid({
  shops,
  viewerId = null,
  eigene,
}: {
  shops: ShopDTO[];
  viewerId?: string | null;
  /** shopId → eigene Sterne, fuer die Voreinstellung im Formular. */
  eigene?: Map<string, number>;
}) {
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
          <ShopCard key={shop.id} shop={shop} viewerId={viewerId} eigene={eigene?.get(shop.id) ?? null} />
        ))}
      </div>

      {closed.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-sm font-bold tracking-wide text-cream/50 uppercase">
            {t("currentlyClosed")}
          </h2>
          <div className="grid gap-5 opacity-60 sm:grid-cols-2 lg:grid-cols-3">
            {closed.map((shop) => (
              <ShopCard key={shop.id} shop={shop} viewerId={viewerId} eigene={eigene?.get(shop.id) ?? null} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
