import { ShieldCheck } from "lucide-react";
import { ApplicationReviewCard } from "@/components/admin/ApplicationReviewCard";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listApplications } from "@/lib/whitelist";

export default async function AdminWhitelistPage() {
  const applications = await listApplications();
  const pending = applications.filter((a) => a.status === "PENDING");
  const handled = applications.filter((a) => a.status !== "PENDING");

  return (
    <div className="space-y-12">
      <section>
        <SectionHeading
          eyebrow="Zu prüfen"
          icon={ShieldCheck}
          title={pending.length > 0 ? `${pending.length} offene ${pending.length === 1 ? "Anfrage" : "Anfragen"}` : "Keine offenen Anfragen"}
          description="Anträge entstehen automatisch, sobald sich jemand zum ersten Mal mit Discord anmeldet."
          className="mb-5"
        />
        {pending.length === 0 ? (
          <Panel className="p-10 text-center text-sm text-cream/60">
            Alles abgearbeitet. Neue Anträge tauchen hier auf, sobald sich jemand neu anmeldet.
          </Panel>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {pending.map((application) => (
              <ApplicationReviewCard key={application.id} application={application} />
            ))}
          </div>
        )}
      </section>

      {handled.length > 0 && (
        <section>
          <SectionHeading
            eyebrow="Historie"
            title="Bereits entschieden"
            description="Angenommene und abgelehnte Anträge. Löschen entfernt nur den Eintrag, nicht den Account."
            className="mb-5"
          />
          <div className="grid gap-4 xl:grid-cols-2">
            {handled.map((application) => (
              <ApplicationReviewCard key={application.id} application={application} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
