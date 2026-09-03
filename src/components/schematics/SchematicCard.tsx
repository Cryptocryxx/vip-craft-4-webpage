import Image from "next/image";
import { Box, Download, Heart } from "lucide-react";
import { BlueprintPreview } from "@/components/schematics/BlueprintPreview";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { PlayerHead } from "@/components/ui/PlayerHead";
import { formatNumber, formatShortDate } from "@/lib/format";
import type { Schematic } from "@/lib/schematic-types";

export function SchematicCard({ schematic, onTagClick }: { schematic: Schematic; onTagClick?: (tag: string) => void }) {
  const volume = schematic.size.x * schematic.size.y * schematic.size.z;

  return (
    <Panel rivets className="group flex h-full flex-col overflow-hidden">
      <div className="relative m-1.5 overflow-hidden rounded-lg border border-diamond-400/20">
        {schematic.image ? (
          <Image
            src={schematic.image}
            alt={`Screenshot: ${schematic.title}`}
            width={800}
            height={450}
            className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <BlueprintPreview
            seed={schematic.id}
            label={`Blaupause: ${schematic.title}`}
            className="aspect-video w-full transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
        <span className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 font-mono text-[10px] text-diamond-200 backdrop-blur">
          {schematic.size.x}×{schematic.size.y}×{schematic.size.z}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 pt-2">
        <div className="flex flex-wrap gap-1.5">
          {schematic.tags.map((tag) =>
            onTagClick ? (
              <button key={tag} type="button" onClick={() => onTagClick(tag)} className="chip border-brass-500/40 bg-brass-500/10 text-brass-200 hover:bg-brass-500/20">
                #{tag}
              </button>
            ) : (
              <Badge key={tag}>#{tag}</Badge>
            ),
          )}
        </div>
        <h3 className="mt-2 text-lg leading-snug font-bold text-cream">{schematic.title}</h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-cream/65">{schematic.description}</p>

        <div className="mt-3 flex items-center gap-2 text-xs text-cream/70">
          <PlayerHead name={schematic.author} size={20} />
          <span className="font-semibold text-cream">{schematic.author}</span>
          <span className="text-cream/40">·</span>
          <span>{formatShortDate(schematic.createdAt)}</span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-3">
          <div className="flex items-center gap-3 text-xs text-cream/60">
            <span className="inline-flex items-center gap-1" title="Downloads">
              <Download className="size-3.5" /> {formatNumber(schematic.downloads)}
            </span>
            <span className="inline-flex items-center gap-1" title="Likes">
              <Heart className="size-3.5" /> {formatNumber(schematic.likes)}
            </span>
            <span className="hidden items-center gap-1 sm:inline-flex" title="Volumen">
              <Box className="size-3.5" /> {formatNumber(volume)} Blöcke
            </span>
          </div>
          <a
            href={`/api/schematics/${schematic.id}/download`}
            download={schematic.fileName}
            className="btn btn-brass btn-sm"
            title={`${schematic.fileName} herunterladen`}
          >
            <Download className="size-3.5" /> .nbt
          </a>
        </div>
      </div>
    </Panel>
  );
}
