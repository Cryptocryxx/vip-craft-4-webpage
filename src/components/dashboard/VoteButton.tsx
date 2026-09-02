"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ChevronUp } from "lucide-react";
import { toggleVoteAction } from "@/lib/actions/suggestions";
import { cn } from "@/lib/utils";

type VoteState = { votes: number; hasVoted: boolean };

export function VoteButton({ suggestionId, votes, hasVoted }: { suggestionId: string } & VoteState) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useOptimistic<VoteState, VoteState>({ votes, hasVoted }, (_current, next) => next);

  function toggle() {
    setError(null);
    startTransition(async () => {
      setOptimistic({ votes: hasVoted ? votes - 1 : votes + 1, hasVoted: !hasVoted });
      const result = await toggleVoteAction(suggestionId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={optimistic.hasVoted}
        aria-label={optimistic.hasVoted ? "Upvote entfernen" : "Upvoten"}
        title={error ?? (optimistic.hasVoted ? "Upvote entfernen" : "Upvoten")}
        className={cn(
          "flex w-14 flex-col items-center rounded-lg border py-2 font-display transition-all",
          optimistic.hasVoted
            ? "border-diamond-400/60 bg-diamond-500/15 text-diamond-100 shadow-glow-diamond"
            : "border-white/10 bg-black/20 text-cream/70 hover:border-brass-500/50 hover:text-brass-100",
          pending && "opacity-70",
        )}
      >
        <ChevronUp className={cn("size-5 transition-transform", optimistic.hasVoted && "-translate-y-0.5")} />
        <span className="text-base leading-none font-bold">{optimistic.votes}</span>
      </button>
      {error && <span className="mt-1 max-w-14 text-center text-[10px] leading-tight text-rose-300">{error}</span>}
    </div>
  );
}
