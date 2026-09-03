import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Gear } from "@/components/ui/Gear";
import { Panel } from "@/components/ui/Panel";

export function AccessDenied({ loggedIn }: { loggedIn: boolean }) {
  return (
    <Container className="py-20">
      <Panel variant="blueprint" className="relative mx-auto max-w-xl overflow-hidden p-10 text-center">
        <Gear teeth={12} className="pointer-events-none absolute -top-12 -left-12 size-48 text-rose-300/10 animate-gear-spin" />
        <span className="relative mx-auto flex size-14 items-center justify-center rounded-full border-2 border-rose-300/60 bg-rose-500/15 text-rose-200">
          <Lock className="size-7" />
        </span>
        <h1 className="relative mt-5 text-2xl font-bold text-cream">Kein Zugriff</h1>
        <p className="relative mt-2 text-cream/70">
          {loggedIn
            ? "Dieser Bereich ist dem Server-Team vorbehalten. Wenn du Admin sein solltest, meldet sich ein bestehender Admin im Discord bei dir."
            : "Melde dich zuerst mit Discord an. Der Kontrollraum ist nur für das Server-Team."}
        </p>
        <div className="relative mt-7 flex justify-center gap-3">
          <Button href="/dashboard" variant="outline">
            Zum Dashboard
          </Button>
          <Button href="/">Zur Startseite</Button>
        </div>
      </Panel>
    </Container>
  );
}
