"use client";

import { useActionState } from "react";
import { Check, Loader2, Store } from "lucide-react";
import { createShopAction, updateShopAction, type ShopFormState } from "@/lib/actions/shops";
import { DIMENSIONS, dimensionLabels, type ShopDTO } from "@/lib/shop-types";

const initialState: ShopFormState = {};

type Props = {
  /** Gesetzt = Bearbeiten eines bestehenden Shops statt Neuanlegen. */
  shop?: ShopDTO;
  onCancel?: () => void;
};

/** Formular zum Eintragen bzw. Bearbeiten eines eigenen Shops. */
export function ShopForm({ shop, onCancel }: Props) {
  const [state, formAction, pending] = useActionState(shop ? updateShopAction : createShopAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {shop && <input type="hidden" name="shopId" value={shop.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="shop-name" className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">
            Name
          </label>
          <input
            id="shop-name"
            name="name"
            type="text"
            defaultValue={shop?.name}
            placeholder="z. B. Bahnhofskiosk"
            minLength={2}
            maxLength={40}
            required
            className="input"
          />
        </div>
        <div>
          <label htmlFor="shop-sells" className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">
            Artikel <span className="normal-case opacity-70">(mit Komma getrennt)</span>
          </label>
          <input
            id="shop-sells"
            name="sells"
            type="text"
            defaultValue={shop?.sells.join(", ")}
            placeholder="z. B. Kohle, Eisen, Zahnräder"
            required
            className="input"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="shop-x" className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">
            X
          </label>
          <input id="shop-x" name="locationX" type="number" step={1} defaultValue={shop?.locationX} required className="input font-mono" />
        </div>
        <div>
          <label htmlFor="shop-z" className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">
            Z
          </label>
          <input id="shop-z" name="locationZ" type="number" step={1} defaultValue={shop?.locationZ} required className="input font-mono" />
        </div>
        <div>
          <label htmlFor="shop-dimension" className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">
            Dimension
          </label>
          <select id="shop-dimension" name="dimension" defaultValue={shop?.dimension ?? "overworld"} className="input">
            {DIMENSIONS.map((dimension) => (
              <option key={dimension} value={dimension}>
                {dimensionLabels[dimension]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="shop-description" className="mb-1.5 block text-xs font-semibold tracking-wider text-cream/60 uppercase">
          Beschreibung <span className="normal-case opacity-70">(optional)</span>
        </label>
        <textarea
          id="shop-description"
          name="description"
          rows={2}
          maxLength={300}
          defaultValue={shop?.description ?? ""}
          placeholder="Öffnungszeiten, Besonderheiten, was auch immer Käufer wissen sollten."
          className="input resize-y"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-cream/75">
        <input
          type="checkbox"
          name="open"
          defaultChecked={shop?.open ?? true}
          className="size-4 rounded border-white/20 bg-black/30 accent-brass-500"
        />
        Aktuell geöffnet
      </label>

      {state.error && <p className="text-sm text-rose-300">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-300">
          <Check className="size-4" /> {state.success}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="btn btn-brass btn-md">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Store className="size-4" />}
          {shop ? "Speichern" : "Shop eintragen"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-ghost btn-md">
            Abbrechen
          </button>
        )}
      </div>
    </form>
  );
}
