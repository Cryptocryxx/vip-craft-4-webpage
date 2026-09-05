/**
 * Typen, Konstanten und Validierung für das Vorschlags-Board.
 * Bewusst ohne Datenbank-Import, damit Client-Komponenten sie nutzen können.
 */
export const SUGGESTION_TYPES = ["MOD", "BUG", "FEATURE"] as const;
export type SuggestionType = (typeof SUGGESTION_TYPES)[number];

export const SUGGESTION_STATUSES = ["OPEN", "PLANNED", "DONE", "REJECTED"] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

/**
 * Beschriftungen kommen aus den Übersetzungen, Namespaces "SuggestionTypes"
 * und "SuggestionStatuses" – die Schlüssel entsprechen genau den Werten oben.
 */

export type SuggestionDTO = {
  id: string;
  title: string;
  body: string;
  type: SuggestionType;
  status: SuggestionStatus;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null; minecraftName: string | null };
  votes: number;
  hasVoted: boolean;
};

export function isSuggestionType(value: unknown): value is SuggestionType {
  return typeof value === "string" && (SUGGESTION_TYPES as readonly string[]).includes(value);
}

export function toSuggestionStatus(value: string): SuggestionStatus {
  return (SUGGESTION_STATUSES as readonly string[]).includes(value) ? (value as SuggestionStatus) : "OPEN";
}

export function toSuggestionType(value: string): SuggestionType {
  return isSuggestionType(value) ? value : "FEATURE";
}

export type CreateSuggestionInput = { title: string; body: string; type: SuggestionType };

/** `t` ist der Übersetzer für den Namespace "Validation". */
export type ValidationTranslator = (key: string) => string;

export function validateSuggestionInput(
  raw: {
    title?: unknown;
    body?: unknown;
    type?: unknown;
  },
  t: ValidationTranslator,
): { ok: true; data: CreateSuggestionInput } | { ok: false; error: string } {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const body = typeof raw.body === "string" ? raw.body.trim() : "";

  if (title.length < 5) return { ok: false, error: t("suggestionTitleTooShort") };
  if (title.length > 120) return { ok: false, error: t("suggestionTitleTooLong") };
  if (body.length < 20) return { ok: false, error: t("suggestionBodyTooShort") };
  if (body.length > 2000) return { ok: false, error: t("suggestionBodyTooLong") };
  if (!isSuggestionType(raw.type)) return { ok: false, error: t("invalidType") };

  return { ok: true, data: { title, body, type: raw.type } };
}
