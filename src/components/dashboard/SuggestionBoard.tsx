"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { Bug, MessageSquarePlus, Puzzle, Sparkles, User, X, type LucideIcon } from "lucide-react";
import { SuggestionForm } from "@/components/dashboard/SuggestionForm";
import { VoteButton } from "@/components/dashboard/VoteButton";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { timeAgo } from "@/lib/format";
import {
  SUGGESTION_TYPES,
  suggestionStatusLabels,
  suggestionTypeLabels,
  type SuggestionDTO,
  type SuggestionStatus,
  type SuggestionType,
} from "@/lib/suggestion-types";
import { cn } from "@/lib/utils";

const typeIcons: Record<SuggestionType, LucideIcon> = { MOD: Puzzle, BUG: Bug, FEATURE: Sparkles };
const typeTone: Record<SuggestionType, BadgeTone> = { MOD: "brass", BUG: "rose", FEATURE: "diamond" };
const statusTone: Record<SuggestionStatus, BadgeTone> = { OPEN: "neutral", PLANNED: "diamond", DONE: "emerald", REJECTED: "rose" };

type Filter = "ALL" | SuggestionType;
type Sort = "top" | "new";

export function SuggestionBoard({ suggestions, currentUserId }: { suggestions: SuggestionDTO[]; currentUserId: string }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sort, setSort] = useState<Sort>("top");
  const [showForm, setShowForm] = useState(false);

  const closeForm = useCallback(() => setShowForm(false), []);

  const visible = useMemo(() => {
    const list = filter === "ALL" ? suggestions : suggestions.filter((s) => s.type === filter);
    return [...list].sort((a, b) =>
      sort === "top"
        ? b.votes - a.votes || b.createdAt.localeCompare(a.createdAt)
        : b.createdAt.localeCompare(a.createdAt),
    );
  }, [suggestions, filter, sort]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: suggestions.length, MOD: 0, BUG: 0, FEATURE: 0 };
    for (const s of suggestions) c[s.type] += 1;
    return c;
  }, [suggestions]);

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/5 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="eyebrow">Vorschlags-Board</p>
          <h2 className="mt-1 text-xl font-bold text-cream">Mods vorschlagen, Bugs melden, abstimmen</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
          className={cn("btn btn-md", showForm ? "btn-outline" : "btn-diamond")}
        >
          {showForm ? <X className="size-4" /> : <MessageSquarePlus className="size-4" />}
          {showForm ? "Schließen" : "Neuer Beitrag"}
        </button>
      </div>

      {showForm && (
        <div className="border-b border-white/5 bg-diamond-950/40 p-4 sm:p-6">
          <SuggestionForm onSuccess={closeForm} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-4 py-3 sm:px-6">
        {(["ALL", ...SUGGESTION_TYPES] as Filter[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "chip transition-colors",
              filter === key ? "border-brass-500/60 bg-brass-500/15 text-brass-100" : "border-white/10 text-cream/60 hover:text-cream",
            )}
          >
            {key === "ALL" ? "Alle" : suggestionTypeLabels[key]}
            <span className="ml-1 rounded bg-black/30 px-1 font-mono text-[10px] text-cream/60">{counts[key]}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-0.5 text-xs">
          {(
            [
              ["top", "Top"],
              ["new", "Neu"],
            ] as Array<[Sort, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={cn(
                "rounded-md px-2.5 py-1 font-display font-semibold tracking-wide transition-colors",
                sort === key ? "bg-brass-500/20 text-brass-100" : "text-cream/60 hover:text-cream",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="p-10 text-center text-sm text-cream/55">Noch keine Beiträge in dieser Kategorie – mach den Anfang!</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {visible.map((suggestion) => (
            <SuggestionItem key={suggestion.id} suggestion={suggestion} isOwn={suggestion.author.id === currentUserId} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function SuggestionItem({ suggestion, isOwn }: { suggestion: SuggestionDTO; isOwn: boolean }) {
  const Icon = typeIcons[suggestion.type];
  const { author } = suggestion;
  const authorName = author.name ?? author.minecraftName ?? "Unbekannt";

  return (
    <li className="flex gap-4 p-4 sm:p-5 sm:px-6">
      <VoteButton suggestionId={suggestion.id} votes={suggestion.votes} hasVoted={suggestion.hasVoted} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={typeTone[suggestion.type]}>
            <Icon className="size-3" /> {suggestionTypeLabels[suggestion.type]}
          </Badge>
          <Badge tone={statusTone[suggestion.status]}>{suggestionStatusLabels[suggestion.status]}</Badge>
          {isOwn && <Badge tone="wood">Von dir</Badge>}
        </div>
        <h3 className="mt-2 text-base leading-snug font-bold text-cream sm:text-lg">{suggestion.title}</h3>
        <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-cream/65">{suggestion.body}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-cream/55">
          {author.image ? (
            <Image src={author.image} alt="" width={18} height={18} className="rounded-full" />
          ) : author.minecraftName ? (
            <PlayerHead name={author.minecraftName} size={18} />
          ) : (
            <User className="size-4" />
          )}
          <span className="font-semibold text-cream/80">{authorName}</span>
          <span aria-hidden>·</span>
          <time dateTime={suggestion.createdAt} suppressHydrationWarning>
            {timeAgo(suggestion.createdAt)}
          </time>
        </div>
      </div>
    </li>
  );
}
