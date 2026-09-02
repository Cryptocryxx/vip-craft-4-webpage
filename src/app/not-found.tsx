import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Gear } from "@/components/ui/Gear";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <Gear teeth={12} className="size-24 text-brass-500/40 animate-gear-spin [animation-duration:12s]" />
      <p className="eyebrow mt-6">Fehler 404</p>
      <h1 className="mt-2 text-4xl font-bold text-cream sm:text-5xl">Diese Maschine gibt es nicht</h1>
      <p className="mt-3 max-w-md text-cream/65">
        Die Seite wurde abgebaut, verschoben oder nie gebaut. Vermutlich war ein Creeper beteiligt.
      </p>
      <Button href="/" className="mt-8">
        Zurück zum Spawn
      </Button>
    </Container>
  );
}
