import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { createSuggestion, listSuggestions, validateSuggestionInput } from "@/lib/suggestions";

/**
 * GET /api/suggestions – alle Vorschläge inkl. der eigenen Votes.
 * Nur für eingeloggte Nutzer, damit Beiträge und Namen nicht öffentlich abrufbar sind.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const items = await listSuggestions(session.user.id);
  return NextResponse.json({ items });
}

/** POST /api/suggestions – neuen Vorschlag anlegen. Body: { title, body, type } */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const tValidation = await getTranslations("Validation");
  const parsed = validateSuggestionInput((payload ?? {}) as Record<string, unknown>, tValidation);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const created = await createSuggestion(session.user.id, parsed.data);
  return NextResponse.json({ id: created.id }, { status: 201 });
}
