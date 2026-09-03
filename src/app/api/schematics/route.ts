import { NextResponse, type NextRequest } from "next/server";
import { getAllTags, getSchematics } from "@/lib/schematic-types";

/** GET /api/schematics?q=&tag= – Liste aller Schematics (Mock-Datenbank). */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const tag = request.nextUrl.searchParams.get("tag") ?? undefined;

  return NextResponse.json({
    source: "mock",
    tags: getAllTags(),
    items: getSchematics({ q, tag }),
  });
}
