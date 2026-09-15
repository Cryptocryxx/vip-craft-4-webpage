"use client";

import { useState, useTransition } from "react";
import { Eye, Loader2, PackageMinus, PackagePlus, RefreshCw, Save, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import {
  gibItemAction,
  gibZurueckAction,
  ladeInventarAction,
  nimmItemAction,
  type EingriffZustand,
  type InventarLadeZustand,
} from "@/lib/actions/inventar";
import { timeAgo } from "@/lib/format";
import { ITEM_ID_RE, MAX_ANZAHL, type InventarEingriff } from "@/lib/inventar-types";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  /** Online-Status beim Aufbau der Seite – nach dem Laden gilt der aus dem Inventar. */
  online: boolean;
};

const ART: Record<InventarEingriff["kind"], string> = { TAKE: "Entnommen", GIVE: "Gegeben", RETURN: "Zurückgegeben" };
const STATUS: Record<InventarEingriff["status"], string> = { OK: "ausgeführt", FAILED: "gescheitert", PENDING: "läuft" };

/**
 * Inventar eines Spielers im Kontrollraum – nur für Admins.
 *
 * Nichts wird von selbst geladen: Erst der Knopf holt die Daten, und genau
 * dieser Abruf wird protokolliert. Beim Entnehmen fragt die Zeile erst nach
 * der Menge; was entnommen wurde, bleibt bis zum nächsten Laden durchgestrichen
 * stehen, weil der Speicherstand es erst nach dem nächsten Speichern kennt.
 */
export function InventarPanel({ name, online }: Props) {
  const [zustand, setZustand] = useState<InventarLadeZustand | null>(null);
  const [eingriffe, setEingriffe] = useState<InventarEingriff[]>([]);
  const [rueckmeldung, setRueckmeldung] = useState<{ error?: string; success?: string }>({});
  /** Ort → seit dem Laden entnommene Menge */
  const [entnommen, setEntnommen] = useState<Record<string, number>>({});
  const [auswahl, setAuswahl] = useState<{ ort: string; anzahl: number } | null>(null);
  const [gebenId, setGebenId] = useState("");
  const [gebenAnzahl, setGebenAnzahl] = useState(1);
  const [pending, startTransition] = useTransition();

  const inventar = zustand?.inventar ?? null;
  const spielerOnline = inventar?.online ?? online;
  const darfEingreifen = Boolean(inventar && spielerOnline && zustand?.skriptBereit);

  function laden(frisch: boolean) {
    startTransition(async () => {
      const ergebnis = await ladeInventarAction(name, frisch);
      setZustand(ergebnis);
      setEingriffe(ergebnis.eingriffe ?? []);
      setEntnommen({});
      setAuswahl(null);
      setRueckmeldung(ergebnis.error ? { error: ergebnis.error } : ergebnis.hinweis ? { success: ergebnis.hinweis } : {});
    });
  }

  function eingreifen(aufruf: () => Promise<EingriffZustand>, nachErfolg?: () => void) {
    startTransition(async () => {
      const ergebnis = await aufruf();
      if (ergebnis.eingriffe) setEingriffe(ergebnis.eingriffe);
      setRueckmeldung({ error: ergebnis.error, success: ergebnis.success });
      if (ergebnis.success && nachErfolg) nachErfolg();
    });
  }

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => laden(false)}
            title="Wird protokolliert"
            className="btn btn-ghost btn-sm disabled:opacity-40"
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : inventar ? (
              <RefreshCw className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
            {inventar ? "Neu laden" : "Inventar anzeigen"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => laden(true)}
            title="Speichert zuerst die Welt (save-all, höchstens einmal pro Minute) und liest danach"
            className="btn btn-ghost btn-sm disabled:opacity-40"
          >
            <Save className="size-3.5" /> Frisch speichern und laden
          </button>
          {inventar && (
            <span className="text-xs text-cream/50">
              Stand: Spieler {inventar.standSpieler ?? "?"} · Rucksäcke {inventar.standRucksaecke ?? "?"} (Serverzeit)
            </span>
          )}
        </div>

        {inventar && !spielerOnline && (
          <p className="mt-2 text-xs text-cream/55">
            {inventar.name} ist offline. Ansehen geht, nehmen und geben erst, sobald {inventar.name} wieder online ist.
          </p>
        )}
        {inventar && zustand?.skriptBereit === false && (
          <p className="mt-2 text-xs text-rose-300">
            inventory.js läuft auf dem Server nicht – nehmen und geben ist deshalb abgeschaltet.
          </p>
        )}
        {rueckmeldung.error && <p className="mt-2 text-sm text-rose-300">{rueckmeldung.error}</p>}
        {rueckmeldung.success && <p className="mt-2 text-sm text-emerald-300">{rueckmeldung.success}</p>}
        {inventar && inventar.hinweise.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-brass-200/80">
            {inventar.hinweise.map((hinweis) => (
              <li key={hinweis}>{hinweis}</li>
            ))}
          </ul>
        )}
      </Panel>

      {inventar && darfEingreifen && (
        <Panel className="p-4">
          <p className="mb-2 text-xs tracking-wider text-cream/50 uppercase">Item geben</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={gebenId}
              onChange={(e) => setGebenId(e.target.value.trim().toLowerCase())}
              placeholder="minecraft:diamond"
              className="input min-w-0 flex-1 font-mono"
            />
            <input
              type="number"
              min={1}
              max={MAX_ANZAHL}
              value={gebenAnzahl}
              onChange={(e) => setGebenAnzahl(Number(e.target.value))}
              className="input w-24"
            />
            <button
              type="button"
              disabled={pending || !ITEM_ID_RE.test(gebenId)}
              onClick={() => eingreifen(() => gibItemAction(inventar.name, gebenId, gebenAnzahl), () => setGebenId(""))}
              className="btn btn-sm border border-emerald-400/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-40"
            >
              <PackagePlus className="size-3.5" /> Geben
            </button>
          </div>
          <p className="mt-1.5 text-xs text-cream/45">
            Einfache Items ohne Verzauberungen. Passt es nicht mehr ins Inventar, fällt der Rest vor die Füße.
          </p>
        </Panel>
      )}

      {inventar && (
        <div className="grid gap-4 lg:grid-cols-2">
          {inventar.bereiche.map((bereich) => (
            <Panel key={bereich.schluessel} className="overflow-hidden">
              <div className="border-b border-white/5 px-4 py-3">
                <p className="font-semibold text-cream">{bereich.titel}</p>
                {bereich.untertitel && <p className="text-xs text-cream/50">{bereich.untertitel}</p>}
                <p className="text-xs text-cream/40">
                  {bereich.slots.length}
                  {bereich.plaetze !== null ? ` von ${bereich.plaetze}` : ""} belegt
                </p>
              </div>

              {bereich.slots.length === 0 ? (
                <p className="px-4 py-3 text-sm text-cream/45">Leer.</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {bereich.slots.map((slot) => {
                    const weg = entnommen[slot.ort] ?? 0;
                    const rest = slot.item.anzahl - weg;
                    const gewaehlt = auswahl?.ort === slot.ort ? auswahl : null;
                    return (
                      <li key={slot.ort} className="px-4 py-2.5">
                        <div className="flex flex-wrap items-start gap-3">
                          <span className="w-24 shrink-0 pt-0.5 text-xs text-cream/45">{slot.label}</span>
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-sm text-cream", rest <= 0 && "line-through opacity-50")}>
                              <span className="font-mono text-brass-200">{slot.item.anzahl}×</span> {slot.item.name}
                            </p>
                            <p className="truncate font-mono text-[11px] text-cream/35">{slot.item.id}</p>
                            {slot.item.details.length > 0 && (
                              <p className="text-xs text-cream/55">{slot.item.details.join(" · ")}</p>
                            )}
                            {weg > 0 && (
                              <p className="text-xs text-emerald-300">
                                {weg} entnommen – der Speicherstand zeigt das erst nach dem nächsten Speichern.
                              </p>
                            )}
                            {slot.item.inhalt.length > 0 && (
                              <details className="mt-1 text-xs text-cream/60">
                                <summary className="cursor-pointer">Inhalt ({slot.item.inhalt.length})</summary>
                                <ul className="mt-1 space-y-0.5 pl-3">
                                  {slot.item.inhalt.map((kind, index) => (
                                    <li key={index}>
                                      {kind.anzahl}× {kind.name} <span className="font-mono text-cream/35">{kind.id}</span>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </div>
                          {darfEingreifen && rest > 0 && !gewaehlt && (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => setAuswahl({ ort: slot.ort, anzahl: rest })}
                              className="btn btn-sm text-rose-200 hover:bg-rose-500/10 disabled:opacity-40"
                            >
                              <PackageMinus className="size-3.5" /> Nehmen
                            </button>
                          )}
                        </div>

                        {gewaehlt && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-rose-400/40 bg-rose-500/10 p-2">
                            <label htmlFor={`anzahl-${slot.ort}`} className="text-xs text-cream/70">
                              Anzahl
                            </label>
                            <input
                              id={`anzahl-${slot.ort}`}
                              type="number"
                              min={1}
                              max={rest}
                              value={gewaehlt.anzahl}
                              onChange={(e) => setAuswahl({ ort: slot.ort, anzahl: Number(e.target.value) })}
                              className="input w-24"
                            />
                            <button
                              type="button"
                              disabled={pending || gewaehlt.anzahl < 1 || gewaehlt.anzahl > rest}
                              onClick={() => {
                                const menge = gewaehlt.anzahl;
                                eingreifen(
                                  () => nimmItemAction(inventar.name, slot.ort, slot.item.id, menge),
                                  () => {
                                    setEntnommen((bisher) => ({ ...bisher, [slot.ort]: (bisher[slot.ort] ?? 0) + menge }));
                                    setAuswahl(null);
                                  },
                                );
                              }}
                              className="btn btn-sm border border-rose-400/60 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30 disabled:opacity-40"
                            >
                              Wirklich nehmen
                            </button>
                            <button type="button" onClick={() => setAuswahl(null)} className="btn btn-ghost btn-sm">
                              Abbrechen
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          ))}
        </div>
      )}

      {inventar && (
        <Panel className="overflow-hidden">
          <p className="border-b border-white/5 px-4 py-3 font-semibold text-cream">Eingriffe ins Inventar</p>
          {eingriffe.length === 0 ? (
            <p className="px-4 py-3 text-sm text-cream/45">Noch keine.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {eingriffe.map((eingriff) => (
                <li key={eingriff.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                  <Badge tone={eingriff.kind === "TAKE" ? "rose" : eingriff.kind === "GIVE" ? "emerald" : "diamond"}>
                    {ART[eingriff.kind]}
                  </Badge>
                  <Badge tone={eingriff.status === "OK" ? "neutral" : eingriff.status === "FAILED" ? "rose" : "brass"}>
                    {STATUS[eingriff.status]}
                  </Badge>
                  <span className="text-cream">
                    {eingriff.count}× <span className="font-mono text-xs">{eingriff.itemId}</span>
                  </span>
                  {eingriff.location && <span className="font-mono text-[11px] text-cream/40">{eingriff.location}</span>}
                  {eingriff.zurueckgegeben && <Badge tone="diamond">zurückgegeben</Badge>}
                  <span className="ml-auto text-xs text-cream/45">
                    {eingriff.actorName ?? "?"} · {timeAgo(new Date(eingriff.createdAt))}
                  </span>
                  {eingriff.zurueckgebbar && darfEingreifen && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => eingreifen(() => gibZurueckAction(inventar.name, eingriff.id))}
                      className="btn btn-ghost btn-sm disabled:opacity-40"
                    >
                      <Undo2 className="size-3.5" /> Zurückgeben
                    </button>
                  )}
                  {eingriff.error && <p className="basis-full text-xs text-rose-300">{eingriff.error}</p>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
