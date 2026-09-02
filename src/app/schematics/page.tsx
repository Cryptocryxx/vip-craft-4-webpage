import type { Metadata } from "next";
import { DraftingCompass, FolderOpen, Download, Wand2 } from "lucide-react";
import { SchematicGallery } from "@/components/schematics/SchematicGallery";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { siteConfig } from "@/lib/config";
import { getAllTags, getSchematics } from "@/lib/mock/schematics";

export const metadata: Metadata = {
  title: "Schematics",
  description: "Bauplan-Galerie: Create-Maschinen aus der Community als .nbt herunterladen.",
};

const howTo = [
  { icon: Download, title: ".nbt herunterladen", text: "Über den Button auf der Karte – die Datei landet in deinem Download-Ordner." },
  { icon: FolderOpen, title: "In den Schematics-Ordner", text: "Datei nach .minecraft/schematics kopieren (bei Prism: im Instanz-Ordner)." },
  { icon: Wand2, title: "Ingame platzieren", text: "Leere Schematic & Quill nehmen, Datei auswählen, mit der Schematicannon oder per Hand bauen." },
];

export default function SchematicsPage() {
  const schematics = getSchematics();
  const tags = getAllTags();

  return (
    <>
      <PageHeader
        eyebrow="Bauplan-Galerie"
        icon={DraftingCompass}
        title="Schematics"
        description="Blaupausen für Create-Maschinen aus der Community. Herunterladen, in den Schematics-Ordner legen und mit der Schematicannon nachbauen."
      >
        <Button href={siteConfig.discordInvite} variant="diamond" size="sm" target="_blank" rel="noopener noreferrer">
          <DiscordIcon className="size-4" /> Eigene Schematic einreichen
        </Button>
      </PageHeader>

      <Container className="space-y-12 py-10">
        <SchematicGallery schematics={schematics} tags={tags} />

        <Panel variant="blueprint" className="p-6 sm:p-8">
          <p className="eyebrow">So nutzt du eine Schematic</p>
          <ol className="mt-5 grid gap-6 sm:grid-cols-3">
            {howTo.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-diamond-300/50 bg-diamond-950 font-display text-sm font-bold text-diamond-200">
                    {index + 1}
                  </span>
                  <div>
                    <p className="flex items-center gap-2 font-display font-bold text-cream">
                      <Icon className="size-4 text-diamond-300" /> {step.title}
                    </p>
                    <p className="mt-1 text-sm text-cream/65">{step.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>
      </Container>
    </>
  );
}
