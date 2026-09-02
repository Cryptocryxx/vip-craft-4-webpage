import "server-only";
import { prisma } from "@/lib/prisma";
import {
  toSuggestionStatus,
  toSuggestionType,
  type CreateSuggestionInput,
  type SuggestionDTO,
} from "@/lib/suggestion-types";

export * from "@/lib/suggestion-types";

/** Alle Vorschläge, sortiert nach Votes (dann Datum). `currentUserId` markiert eigene Votes. */
export async function listSuggestions(currentUserId?: string): Promise<SuggestionDTO[]> {
  const rows = await prisma.suggestion.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, image: true, minecraftName: true } },
      _count: { select: { votes: true } },
      votes: { where: { userId: currentUserId ?? "__anonymous__" }, select: { userId: true } },
    },
  });

  return rows
    .map<SuggestionDTO>((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      type: toSuggestionType(row.type),
      status: toSuggestionStatus(row.status),
      createdAt: row.createdAt.toISOString(),
      author: row.author,
      votes: row._count.votes,
      hasVoted: row.votes.length > 0,
    }))
    .sort((a, b) => b.votes - a.votes || b.createdAt.localeCompare(a.createdAt));
}

export async function createSuggestion(authorId: string, input: CreateSuggestionInput) {
  return prisma.suggestion.create({ data: { ...input, authorId } });
}

/** Upvote setzen oder wieder entfernen. */
export async function toggleVote(userId: string, suggestionId: string): Promise<{ voted: boolean; votes: number }> {
  const where = { userId_suggestionId: { userId, suggestionId } };
  const existing = await prisma.vote.findUnique({ where });

  if (existing) {
    await prisma.vote.delete({ where });
  } else {
    await prisma.vote.create({ data: { userId, suggestionId } });
  }

  const votes = await prisma.vote.count({ where: { suggestionId } });
  return { voted: !existing, votes };
}
