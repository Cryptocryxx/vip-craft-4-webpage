"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createSuggestion, toggleVote, validateSuggestionInput } from "@/lib/suggestions";

export type SuggestionFormState = { error?: string; success?: boolean };

export async function createSuggestionAction(
  _prev: SuggestionFormState,
  formData: FormData,
): Promise<SuggestionFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Du musst eingeloggt sein." };

  const parsed = validateSuggestionInput({
    title: formData.get("title"),
    body: formData.get("body"),
    type: formData.get("type"),
  });
  if (!parsed.ok) return { error: parsed.error };

  await createSuggestion(session.user.id, parsed.data);
  revalidatePath("/dashboard");
  return { success: true };
}

export type VoteResult = { ok: true; voted: boolean; votes: number } | { ok: false; error: string };

export async function toggleVoteAction(suggestionId: string): Promise<VoteResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Du musst eingeloggt sein." };

  try {
    const result = await toggleVote(session.user.id, suggestionId);
    revalidatePath("/dashboard");
    return { ok: true, ...result };
  } catch {
    return { ok: false, error: "Vote konnte nicht gespeichert werden." };
  }
}
