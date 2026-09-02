import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSuggestion, listSuggestions, validateSuggestionInput } from "@/lib/suggestions";

/** GET /api/suggestions – alle Vorschläge (eigene Votes werden markiert, falls eingeloggt). */
export async function GET() {
  const session = await auth();
  const items = await listSuggestions(session?.user?.id);
  return NextResponse.json({ items });
}

/** POST /api/suggestions – neuen Vorschlag anlegen. Body: { title, body, type } */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const parsed = validateSuggestionInput((payload ?? {}) as Record<string, unknown>);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const created = await createSuggestion(session.user.id, parsed.data);
  return NextResponse.json({ id: created.id }, { status: 201 });
}
