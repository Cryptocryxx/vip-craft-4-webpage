import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { LegalPage } from "@/components/legal/LegalPage";
import { addressLines, legal } from "@/lib/legal";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Impressum",
  description: `Anbieterkennzeichnung nach § 5 DDG für ${siteConfig.name}.`,
};

export default function ImpressumPage() {
  const { operator } = legal;

  return (
    <LegalPage
      eyebrow="Anbieterkennzeichnung"
      icon={Scale}
      title="Impressum"
      description="Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG) und § 18 Abs. 2 Medienstaatsvertrag (MStV)."
    >
      <h2>Diensteanbieter</h2>
      <address>
        {addressLines().map((line, index) => (
          <span key={`${index}-${line}`}>
            {line}
            <br />
          </span>
        ))}
      </address>

      <h2>Kontakt</h2>
      <ul>
        <li>
          E-Mail: <a href={`mailto:${operator.email}`}>{operator.email}</a>
        </li>
        <li>Telefon: {operator.phone}</li>
      </ul>
      <p>
        Über diese Kontaktmöglichkeiten ist eine unmittelbare und schnelle elektronische Kommunikation im Sinne des
        § 5 Abs. 1 Nr. 2 DDG möglich.
      </p>

      {(operator.register || operator.vatId) && (
        <>
          <h2>Registerangaben</h2>
          <ul>
            {operator.register && <li>Registereintrag: {operator.register}</li>}
            {operator.vatId && <li>Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG: {operator.vatId}</li>}
          </ul>
        </>
      )}

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <address>
        {operator.responsibleForContent}
        <br />
        {addressLines()
          .slice(1)
          .map((line, index) => (
            <span key={`${index}-${line}`}>
              {line}
              <br />
            </span>
          ))}
      </address>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen (§ 36 Abs. 1 Nr. 1 VSBG).
      </p>
      <p className="note">
        Hinweis: Die von der EU betriebene Plattform zur Online-Streitbeilegung (OS-Plattform) wurde zum 20. Juli 2025
        eingestellt. Ein Link darauf ist daher nicht mehr erforderlich und sollte auch nicht mehr gesetzt werden.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich
        (§ 7 Abs. 1 DDG). Nach den §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte
        oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
        Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
        allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der
        Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir
        diese Inhalte umgehend entfernen.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb
        können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist
        stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum
        Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft; rechtswidrige Inhalte waren zum Zeitpunkt der
        Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist ohne konkrete
        Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir
        derartige Links umgehend entfernen.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
        Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen
        des Urheberrechts bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und
        Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
      </p>
      <p>
        Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden – etwa von Spielerinnen und Spielern
        hochgeladene Baupläne, Beiträge im Vorschlags-Board oder Bildschirmfotos –, werden die Urheberrechte Dritter
        beachtet und solche Inhalte als solche gekennzeichnet. Sollten Sie dennoch auf eine Urheberrechtsverletzung
        aufmerksam werden, bitten wir um einen entsprechenden Hinweis an die oben genannte E-Mail-Adresse. Bei
        Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
      </p>

      <h2>Hinweis zu Minecraft</h2>
      <p>
        {siteConfig.name} ist ein privates Community-Projekt und steht in keiner Verbindung zu Mojang Studios oder der
        Microsoft Corporation. „Minecraft“ ist eine Marke von Mojang Synergies AB. Dieses Angebot ist weder von Mojang
        noch von Microsoft genehmigt oder mit ihnen verbunden. Ebenso besteht keine Verbindung zu den Entwicklerinnen und
        Entwicklern der verwendeten Modifikationen.
      </p>
    </LegalPage>
  );
}
