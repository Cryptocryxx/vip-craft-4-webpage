import { gzipSync } from "node:zlib";
import { getSchematicById } from "@/lib/schematic-types";

/**
 * GET /api/schematics/[id]/download
 * Liefert die .nbt-Datei einer Schematic.
 *
 * Solange es keinen echten Datei-Speicher gibt, wird eine minimale, gültige
 * (leere) NBT-Struktur ausgeliefert: ein gzip-komprimiertes TAG_Compound ohne Inhalt.
 * TODO: Datei aus dem Storage streamen und Download-Zähler erhöhen.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const schematic = getSchematicById(id);

  if (!schematic) {
    return new Response("Schematic nicht gefunden", { status: 404 });
  }

  // TAG_Compound (0x0a), Name-Länge 0, TAG_End (0x00)
  const emptyCompound = Buffer.from([0x0a, 0x00, 0x00, 0x00]);
  const payload = gzipSync(emptyCompound);

  return new Response(new Uint8Array(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${schematic.fileName}"`,
      "Content-Length": String(payload.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
