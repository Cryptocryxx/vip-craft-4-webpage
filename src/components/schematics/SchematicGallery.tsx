"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { SchematicCard } from "@/components/schematics/SchematicCard";
import { Panel } from "@/components/ui/Panel";
import type { Schematic } from "@/lib/schematic-types";
import { cn } from "@/lib/utils";

type SortKey = "new" | "downloads" | "likes";

export function SchematicGallery({ schematics, tags }: { schematics: Schematic[]; tags: string[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("new");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schematics
      .filter((s) => (tag ? s.tags.includes(tag) : true))
      .filter((s) =>
        q
          ? s.title.toLowerCase().includes(q) ||
            s.author.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.tags.some((t) => t.includes(q))
          : true,
      )
      .sort((a, b) => {
        if (sort === "downloads") return b.downloads - a.downloads;
        if (sort === "likes") return b.likes - a.likes;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [schematics, query, tag, sort]);

  return (
    <div className="space-y-6">
      {/* Filterleiste */}
      <Panel className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-cream/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche nach Titel, Autor oder Tag…"
            className="input pl-9"
            aria-label="Schematics durchsuchen"
          />
        </label>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1 text-xs">
          {(
            [
              ["new", "Neu"],
              ["downloads", "Downloads"],
              ["likes", "Likes"],
            ] as Array<[SortKey, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={cn(
                "rounded-md px-3 py-1.5 font-display font-semibold tracking-wide transition-colors",
                sort === key ? "bg-brass-500/20 text-brass-100" : "text-cream/60 hover:text-cream",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Panel>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTag(null)}
          className={cn("chip transition-colors", tag === null ? "border-diamond-400/60 bg-diamond-500/15 text-diamond-100" : "border-white/10 text-cream/60 hover:text-cream")}
        >
          Alle
        </button>
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(tag === t ? null : t)}
            className={cn("chip transition-colors", tag === t ? "border-diamond-400/60 bg-diamond-500/15 text-diamond-100" : "border-white/10 text-cream/60 hover:text-cream")}
          >
            #{t}
            {tag === t && <X className="size-3" />}
          </button>
        ))}
        <span className="ml-auto text-xs text-cream/50">
          {filtered.length} von {schematics.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <Panel className="p-12 text-center text-cream/60">
          {schematics.length === 0
            ? "Noch keine Blaupause hochgeladen. Der Upload wird gerade gebaut – bis dahin tauscht ihr sie am besten im Discord."
            : "Keine Schematic passt zu deiner Suche. Vielleicht baust du sie einfach selbst?"}
        </Panel>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <SchematicCard key={s.id} schematic={s} onTagClick={(t) => setTag(t)} />
          ))}
        </div>
      )}
    </div>
  );
}
