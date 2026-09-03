import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { LegalPage } from "@/components/legal/LegalPage";
import { legal } from "@/lib/legal";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen",
  description: `Regeln für die Nutzung der Website und des Minecraft-Servers von ${siteConfig.name}.`,
};

export default function NutzungsbedingungenPage() {
  const { operator } = legal;

  return (
    <LegalPage
      eyebrow="Regeln"
      icon={FileText}
      title="Nutzungsbedingungen"
      description={`Bedingungen für die Nutzung der Website und des Minecraft-Servers von ${siteConfig.name}.`}
    >
      <h2>§ 1 Geltungsbereich und Anbieter</h2>
      <p>
        Diese Nutzungsbedingungen gelten für die Nutzung der Website {siteConfig.name} sowie des dazugehörigen
        Minecraft-Servers (zusammen das „Angebot“). Anbieter ist {operator.name === "[BITTE AUSFÜLLEN]" ? "der im Impressum genannte Betreiber" : operator.name}; die vollständigen Angaben finden Sie
        im <Link href="/impressum">Impressum</Link>.
      </p>
      <p>
        Mit der Anmeldung oder der Nutzung des Spielservers erkennen Sie diese Bedingungen an. Abweichende Bedingungen
        der Nutzerinnen und Nutzer finden keine Anwendung.
      </p>

      <h2>§ 2 Art des Angebots</h2>
      <p>
        Das Angebot ist ein privates, nicht gewerbliches Freizeitprojekt einer Hochschulgemeinschaft. Es wird
        unentgeltlich bereitgestellt. Ein Vertrag über eine entgeltliche Leistung kommt nicht zustande.
      </p>
      <p>
        Es besteht <strong>kein Anspruch</strong> auf Zugang zum Angebot, auf eine bestimmte Verfügbarkeit oder auf den
        Fortbestand des Servers. Wartungsarbeiten, Ausfälle, Änderungen an der Modifikations-Zusammenstellung, das
        Zurücksetzen der Spielwelt zum Saisonwechsel sowie eine vollständige Einstellung des Betriebs sind jederzeit
        möglich. Über planbare Maßnahmen informieren wir nach Möglichkeit vorab.
      </p>

      <h2>§ 3 Voraussetzungen für die Nutzung</h2>
      <p>
        Für die Anmeldung benötigen Sie ein Discord-Konto und für das Spiel ein gültiges Minecraft-Konto. Für deren
        Nutzung gelten zusätzlich die Bedingungen der jeweiligen Anbieter.
      </p>
      <p>
        Das Angebot richtet sich an Personen ab 16 Jahren. Jüngere Personen dürfen es nur mit Zustimmung der
        Erziehungsberechtigten nutzen.
      </p>
      <p>
        Sie sind verpflichtet, Ihre Zugangsdaten geheim zu halten. Die Weitergabe des Zugangs an Dritte ist nicht
        gestattet. Besteht der Verdacht eines unbefugten Zugriffs, informieren Sie uns bitte umgehend.
      </p>

      <h2>§ 4 Whitelist und Zugang</h2>
      <p>
        Der Zugang zum Spielserver setzt eine Freischaltung voraus. Mit der ersten Anmeldung wird automatisch ein Antrag
        angelegt, den Sie um Ihren Minecraft-Benutzernamen ergänzen. Über den Antrag entscheidet das Server-Team nach
        eigenem Ermessen. Ein Anspruch auf Freischaltung besteht nicht; eine Ablehnung muss nicht begründet werden.
      </p>
      <p>
        Der von Ihnen angegebene Minecraft-Benutzername muss zu einem Konto gehören, über das Sie tatsächlich verfügen.
        Die Angabe fremder Konten ist unzulässig.
      </p>

      <h2>§ 5 Verhaltensregeln</h2>
      <p>Bei der Nutzung des Angebots ist insbesondere untersagt:</p>
      <ul>
        <li>
          das mutwillige Zerstören oder Verändern fremder Bauwerke sowie das Entwenden fremden Eigentums im Spiel
          („Griefing“)
        </li>
        <li>
          der Einsatz von Programmen, Modifikationen oder Fehlern im Spiel, die einen unzulässigen Vorteil verschaffen,
          insbesondere Automatisierungs- und Sichthilfen
        </li>
        <li>
          das absichtliche Beeinträchtigen der Serverleistung, etwa durch bewusst überlastende Konstruktionen oder
          Angriffe auf die technische Infrastruktur
        </li>
        <li>
          Beleidigungen, Belästigungen, Bedrohungen sowie diskriminierende, rassistische, sexistische, gewaltverherrlichende
          oder extremistische Äußerungen
        </li>
        <li>
          das Verbreiten rechtswidriger Inhalte, insbesondere solcher, die Urheber-, Marken- oder Persönlichkeitsrechte
          verletzen
        </li>
        <li>
          das Veröffentlichen personenbezogener Daten Dritter ohne deren Einwilligung
        </li>
        <li>
          Werbung, das Anwerben für andere Server sowie jede kommerzielle Nutzung ohne unsere vorherige Zustimmung
        </li>
        <li>das Vortäuschen einer fremden Identität, insbesondere die Ausgabe als Mitglied des Server-Teams</li>
      </ul>
      <p>
        Ergänzend gelten die im Discord veröffentlichten Serverregeln. Anweisungen des Server-Teams ist Folge zu leisten.
      </p>

      <h2>§ 6 Von Nutzenden eingestellte Inhalte</h2>
      <p>
        Sie können eigene Inhalte einstellen, insbesondere Baupläne, Bildschirmfotos und Beiträge im Vorschlags-Board.
        Für diese Inhalte sind Sie selbst verantwortlich. Sie sichern zu, dass Sie über die erforderlichen Rechte
        verfügen und keine Rechte Dritter verletzen.
      </p>
      <p>
        Sie räumen uns an den eingestellten Inhalten ein einfaches, räumlich und zeitlich unbeschränktes, unentgeltliches
        Nutzungsrecht ein, das auf die Darstellung und Bereitstellung im Rahmen dieses Angebots beschränkt ist. Dies
        umfasst insbesondere das Speichern, Anzeigen und Zugänglichmachen sowie den Download durch andere Nutzende, soweit
        Sie den Inhalt dafür bestimmt haben. Ihre Urheberrechte bleiben unberührt; eine darüber hinausgehende Verwertung,
        insbesondere eine kommerzielle, erfolgt nicht.
      </p>
      <p>
        Sie können die Entfernung Ihrer Inhalte jederzeit verlangen. Wir behalten uns vor, Inhalte ohne vorherige
        Ankündigung zu entfernen, wenn ein begründeter Verdacht auf einen Verstoß gegen diese Bedingungen oder gegen
        geltendes Recht besteht.
      </p>

      <h2>§ 7 Maßnahmen bei Verstößen</h2>
      <p>
        Bei Verstößen gegen diese Bedingungen können wir je nach Schwere abgestuft reagieren: Hinweis, Verwarnung,
        Entfernen von Inhalten, zeitweise Sperre oder dauerhafter Ausschluss vom Angebot einschließlich Löschung des
        Kontos.
      </p>
      <p>
        Vor einem dauerhaften Ausschluss geben wir Ihnen grundsätzlich Gelegenheit zur Stellungnahme, sofern dem nicht
        die Schwere des Verstoßes oder überwiegende Interessen Dritter entgegenstehen. Gegen eine Maßnahme können Sie
        formlos Widerspruch an <a href={`mailto:${operator.email}`}>{operator.email}</a> richten.
      </p>

      <h2>§ 8 Verfügbarkeit und Spielstände</h2>
      <p>
        Wir bemühen uns um einen stabilen Betrieb, schulden aber keine bestimmte Verfügbarkeit. Ein Anspruch auf
        Wiederherstellung verlorener Spielstände, Gegenstände oder Bauwerke besteht nicht, auch nicht bei technischen
        Fehlern, Datenverlust oder Fehlern anderer Nutzender.
      </p>

      <h2>§ 9 Haftung</h2>
      <p>
        Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei der Verletzung des Lebens, des Körpers
        oder der Gesundheit. Ebenso bleibt die Haftung nach dem Produkthaftungsgesetz unberührt.
      </p>
      <p>
        Bei einfacher Fahrlässigkeit haften wir nur bei Verletzung einer Pflicht, deren Erfüllung die ordnungsgemäße
        Durchführung des Nutzungsverhältnisses überhaupt erst ermöglicht und auf deren Einhaltung Sie regelmäßig
        vertrauen dürfen (wesentliche Vertragspflicht). In diesem Fall ist die Haftung auf den bei Begründung des
        Nutzungsverhältnisses vorhersehbaren, vertragstypischen Schaden begrenzt.
      </p>
      <p>
        Da das Angebot unentgeltlich bereitgestellt wird, haften wir im Übrigen nur nach den Maßstäben, die das Gesetz
        für die unentgeltliche Überlassung vorsieht. Eine weitergehende Haftung ist ausgeschlossen. Die vorstehenden
        Beschränkungen gelten auch für unsere gesetzlichen Vertreter und Erfüllungsgehilfen.
      </p>
      <p>
        Für Inhalte, die von Nutzenden eingestellt werden, sowie für die Inhalte verlinkter fremder Seiten übernehmen wir
        keine Verantwortung.
      </p>

      <h2>§ 10 Freistellung</h2>
      <p>
        Verletzen Sie schuldhaft Rechte Dritter, stellen Sie uns von allen daraus entstehenden Ansprüchen frei,
        einschließlich der Kosten einer angemessenen Rechtsverteidigung. Wir werden Sie über eine Inanspruchnahme
        unverzüglich informieren und Ihnen Gelegenheit zur Abstimmung der Verteidigung geben.
      </p>

      <h2>§ 11 Laufzeit und Beendigung</h2>
      <p>
        Sie können die Nutzung jederzeit ohne Einhaltung einer Frist beenden und die Löschung Ihres Kontos verlangen.
        Eine formlose Nachricht an <a href={`mailto:${operator.email}`}>{operator.email}</a> genügt.
      </p>
      <p>
        Wir können das Nutzungsverhältnis mit einer Frist von 14 Tagen beenden; das Recht zur außerordentlichen
        Beendigung bei schwerwiegenden Verstößen bleibt unberührt. Mit der Löschung des Kontos werden auch die damit
        verknüpften Anträge, Beiträge und Bewertungen gelöscht.
      </p>

      <h2>§ 12 Datenschutz</h2>
      <p>
        Wie wir personenbezogene Daten verarbeiten, erläutert die <Link href="/datenschutz">Datenschutzerklärung</Link>.
      </p>

      <h2>§ 13 Änderung dieser Bedingungen</h2>
      <p>
        Wir können diese Bedingungen ändern, wenn dies aufgrund einer Änderung des Angebots, der Rechtslage oder der
        Rechtsprechung erforderlich ist. Über wesentliche Änderungen informieren wir mindestens 14 Tage vor
        Inkrafttreten auf der Website oder im Discord. Widersprechen Sie nicht innerhalb dieser Frist oder nutzen Sie das
        Angebot danach weiter, gelten die geänderten Bedingungen als angenommen. Auf diese Wirkung weisen wir in der
        Mitteilung gesondert hin. Widersprechen Sie, können Sie die Nutzung beenden.
      </p>

      <h2>§ 14 Schlussbestimmungen</h2>
      <p>
        Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Sind Sie Verbraucherin oder
        Verbraucher mit gewöhnlichem Aufenthalt in einem anderen Staat, bleiben die zwingenden Schutzvorschriften dieses
        Staates unberührt.
      </p>
      <p>
        Ein besonderer Gerichtsstand wird nicht vereinbart; es gelten die gesetzlichen Regelungen. Wir sind nicht bereit
        und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
      </p>
      <p>
        Sollte eine Bestimmung dieser Bedingungen unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen
        Bestimmungen unberührt. An die Stelle der unwirksamen Bestimmung treten die gesetzlichen Vorschriften.
      </p>

      <h2>§ 15 Hinweis zu Minecraft</h2>
      <p>
        {siteConfig.name} ist ein unabhängiges Community-Projekt. „Minecraft“ ist eine Marke von Mojang Synergies AB.
        Dieses Angebot ist weder von Mojang Studios noch von der Microsoft Corporation genehmigt oder mit ihnen
        verbunden.
      </p>
    </LegalPage>
  );
}
