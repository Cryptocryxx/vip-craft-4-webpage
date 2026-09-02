import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { toggleVote } from "@/lib/suggestions";

/** POST /api/suggestions/[id]/vote – Upvote setzen bzw. wieder entfernen (Toggle). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await toggleVote(session.user.id, id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Vorschlag nicht gefunden." }, { status: 404 });
  }
}
