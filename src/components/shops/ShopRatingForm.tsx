"use client";

import { Fragment, useActionState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Star } from "lucide-react";
import { rateShopAction, type RatingFormState } from "@/lib/actions/shop-ratings";
import { MAX_KOMMENTAR_LAENGE, MAX_STERNE } from "@/lib/shop-types";

const initialState: RatingFormState = {};

/** 5, 4, 3, 2, 1 – absteigend, siehe die Erklärung zu `.stars` in globals.css. */
const sterne = Array.from({ length: MAX_STERNE }, (_, i) => MAX_STERNE - i);

/**
 * Bewertung abgeben.
 *
 * Die Sterne sind Radio-Knöpfe, keine Klick-Zähler: So funktioniert die Auswahl
 * auch mit der Tastatur, das Formular kommt ohne eigenen Zustand aus, und wer
 * schon bewertet hat, sieht seine Wahl voreingestellt.
 */
export function ShopRatingForm({ shopId, eigene }: { shopId: string; eigene: number | null }) {
  const t = useTranslations("ShopRating");
  const [state, formAction, pending] = useActionState(rateShopAction, initialState);

  /*
   * Die Sterne sind ABSICHTLICH ungesteuert (defaultChecked statt checked).
   *
   * Gesteuert ging es nicht: React gleicht Radio-Gruppen mit gleichem `name`
   * eigenmaechtig ab und stellte den zuletzt gespeicherten Knopf wieder her,
   * obwohl die Komponente laengst mit dem neuen Wert rechnete. Am Bildschirm
   * sprang die Auswahl damit nach einer abgewiesenen Eingabe zurueck - wer nur
   * den Kommentar verbesserte, haette unbemerkt seine ALTE Note gespeichert.
   *
   * Stattdessen bekommt die Gruppe einen Schluessel, der sich nur aendert, wenn
   * eine Antwort vom Server kommt. Dann - und nur dann - wird sie neu
   * aufgebaut und uebernimmt die Note, die eben abgeschickt wurde. Beim
   * Anklicken bleibt der Schluessel gleich, der Knopf behaelt den Fokus.
   */
  const gewaehlt = state.stars ?? eigene;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="shopId" value={shopId} />

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold tracking-wider text-cream/60 uppercase">
          {t("starsLegend")}
        </legend>
        {/* Fragment statt eines Wrappers um Knopf und Beschriftung: Der Selektor
            `input:checked ~ label` in globals.css braucht die beiden als echte
            Geschwister, ein <span> dazwischen wuerde ihn zerschneiden. */}
        <div className="stars" key={gewaehlt ?? "leer"}>
          {sterne.map((wert) => (
            <Fragment key={wert}>
              <input
                type="radio"
                id={`stars-${shopId}-${wert}`}
                name="stars"
                value={wert}
                required
                defaultChecked={gewaehlt === wert}
              />
              <label htmlFor={`stars-${shopId}-${wert}`} title={t("starsCount", { count: wert })}>
                <Star className="size-6" fill="currentColor" />
                <span className="sr-only">{t("starsCount", { count: wert })}</span>
              </label>
            </Fragment>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`comment-${shopId}`} className="sr-only">
          {t("commentLabel")}
        </label>
        <textarea
          id={`comment-${shopId}`}
          name="comment"
          rows={2}
          maxLength={MAX_KOMMENTAR_LAENGE}
          placeholder={t("commentPlaceholder")}
          className="input resize-none text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-rose-300">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-300">
          <Check className="size-4" /> {state.success}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-ghost btn-sm disabled:opacity-40">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Star className="size-4" />}
        {eigene ? t("update") : t("submit")}
      </button>
    </form>
  );
}
