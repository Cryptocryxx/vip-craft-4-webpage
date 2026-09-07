import { CalendarDays, Timer } from "lucide-react";
import { EventForm, type EventEntwurf } from "@/components/admin/EventForm";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { requireTeam } from "@/lib/admin";
import { alleEventsRoh } from "@/lib/events";
import { formatDate } from "@/lib/format";
import { datumNachBerlin } from "@/lib/zeit";

export default async function AdminEventsPage() {
  // Wie auf der Community-Seite: die Uhrzeit einmal am Anfang festhalten,
  // statt mitten im Rendern erneut nachzusehen.
  const jetzt = new Date().getTime();

  await requireTeam();
  const zeilen = await alleEventsRoh();

  // Zeitpunkt und Formularfassung zusammen halten: Die Zeile braucht beides,
  // und ein zweites Nachschlagen ueber die Id waere nur Umweg.
  const termine = zeilen.map((zeile) => ({
    start: zeile.start,
    entwurf: {
      id: zeile.id,
      title: zeile.title,
      description: zeile.description,
      titleEn: zeile.titleEn ?? "",
      descriptionEn: zeile.descriptionEn ?? "",
      start: datumNachBerlin(zeile.start),
      end: zeile.end ? datumNachBerlin(zeile.end) : "",
      location: zeile.location,
      host: zeile.host,
      type: zeile.type,
      countdown: zeile.countdown,
    } satisfies EventEntwurf,
  }));

  const kommend = termine.filter((t) => t.start.getTime() >= jetzt).reverse();
  const vergangen = termine.filter((t) => t.start.getTime() < jetzt);

  return (
    <div className="space-y-12">
      <section>
        <SectionHeading
          eyebrow="Kalender"
          icon={CalendarDays}
          title="Neuen Termin anlegen"
          description="Steht danach auf der Community-Seite und – wenn angehakt – als Countdown auf der Startseite."
          className="mb-5"
        />
        <EventForm />
      </section>

      <section>
        <SectionHeading
          eyebrow="Kommt noch"
          icon={Timer}
          title={
            kommend.length > 0 ? `${kommend.length} ${kommend.length === 1 ? "Termin" : "Termine"}` : "Nichts geplant"
          }
          description="Bearbeiten oder löschen – Änderungen wirken sofort auf der ganzen Seite."
          className="mb-5"
        />
        {kommend.length === 0 ? (
          <Panel className="p-10 text-center text-sm text-cream/60">
            Noch kein kommender Termin. Der erste entsteht oben.
          </Panel>
        ) : (
          <div className="space-y-5">
            {kommend.map(({ start, entwurf }) => (
              <div key={entwurf.id}>
                <p className="mb-2 flex flex-wrap items-center gap-2 text-sm text-cream/60">
                  <span className="font-semibold text-cream">{entwurf.title}</span>
                  <span>· {formatDate(start)}</span>
                  {entwurf.countdown && <Badge tone="diamond">Countdown</Badge>}
                </p>
                <EventForm event={entwurf} />
              </div>
            ))}
          </div>
        )}
      </section>

      {vergangen.length > 0 && (
        <section>
          <SectionHeading
            eyebrow="Vorbei"
            title="Vergangene Termine"
            description="Bleiben in der Chronik stehen, bis sie gelöscht werden."
            className="mb-5"
          />
          <Panel className="overflow-hidden">
            <ul className="divide-y divide-white/5">
              {vergangen.map(({ start, entwurf }) => (
                <li key={entwurf.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                  <span className="font-semibold text-cream">{entwurf.title}</span>
                  <span className="text-cream/50">{formatDate(start)}</span>
                  <span className="ml-auto text-xs text-cream/40">{entwurf.location}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      )}
    </div>
  );
}
