import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LegalPage } from "@/components/legal/LegalPage";
import { addressLines, legal } from "@/lib/legal";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: `Informationen zur Verarbeitung personenbezogener Daten auf ${siteConfig.name} nach Art. 13 DSGVO.`,
};

export default function DatenschutzPage() {
  const { operator } = legal;

  return (
    <LegalPage
      eyebrow="Datenschutz"
      icon={ShieldCheck}
      title="Datenschutzerklärung"
      description="Informationen über die Verarbeitung personenbezogener Daten gemäß Art. 13 und 14 DSGVO."
    >
      <h2>1. Verantwortlicher</h2>
      <p>Verantwortlich für die Datenverarbeitung auf dieser Website im Sinne des Art. 4 Nr. 7 DSGVO ist:</p>
      <address>
        {addressLines().map((line, index) => (
          <span key={`${index}-${line}`}>
            {line}
            <br />
          </span>
        ))}
        E-Mail: <a href={`mailto:${operator.email}`}>{operator.email}</a>
        <br />
        Telefon: {operator.phone}
      </address>
      <p>
        Ein Datenschutzbeauftragter ist nicht bestellt, da die Voraussetzungen des Art. 37 DSGVO in Verbindung mit
        § 38 BDSG nicht vorliegen. Bei allen Fragen zum Datenschutz wenden Sie sich bitte an die oben genannte Adresse.
      </p>

      <h2>2. Grundsätze</h2>
      <p>
        Wir verarbeiten personenbezogene Daten nur, soweit dies für die Bereitstellung dieser Website und des
        zugehörigen Minecraft-Servers erforderlich ist. Eine Weitergabe zu Werbezwecken findet nicht statt, ebenso wenig
        ein Verkauf von Daten. Es findet keine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne des
        Art. 22 DSGVO statt.
      </p>
      <p>Als Rechtsgrundlagen kommen in Betracht:</p>
      <ul>
        <li>
          <strong>Art. 6 Abs. 1 lit. a DSGVO</strong> – Ihre Einwilligung, etwa beim Laden externer Inhalte.
        </li>
        <li>
          <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> – Erfüllung des Nutzungsverhältnisses, etwa beim Login und bei der
          Bearbeitung Ihres Whitelist-Antrags.
        </li>
        <li>
          <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> – unser berechtigtes Interesse an einem technisch sicheren und
          funktionsfähigen Betrieb.
        </li>
      </ul>

      <h2>3. Hosting und Server-Logfiles</h2>
      <p>
        Diese Website wird bei folgendem Anbieter gehostet, der als Auftragsverarbeiter nach Art. 28 DSGVO für uns tätig
        wird:
      </p>
      <p>
        {legal.hosting.name}
        <br />
        {legal.hosting.address}
      </p>
      <p>
        Beim Aufruf der Website werden durch den Webserver automatisch Daten in sogenannten Logfiles erfasst, die Ihr
        Browser übermittelt. Dabei handelt es sich um:
      </p>
      <ul>
        <li>IP-Adresse des anfragenden Geräts</li>
        <li>Datum und Uhrzeit des Zugriffs</li>
        <li>aufgerufene Adresse und übertragene Datenmenge</li>
        <li>Meldung über erfolgreichen Abruf</li>
        <li>Browsertyp und Betriebssystem</li>
        <li>gegebenenfalls die zuvor besuchte Seite (Referrer)</li>
      </ul>
      <p>
        Diese Daten sind für uns technisch erforderlich, um die Website auszuliefern, die Stabilität und Sicherheit zu
        gewährleisten und Angriffe abzuwehren. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Eine Zusammenführung
        dieser Daten mit anderen Datenquellen findet nicht statt. Die Logfiles werden nach spätestens sieben Tagen
        gelöscht oder gekürzt, sofern sie nicht ausnahmsweise zur Aufklärung eines konkreten Sicherheitsvorfalls länger
        benötigt werden.
      </p>

      <h2>4. Cookies und Speicherung auf Ihrem Endgerät</h2>
      <p>
        Wir setzen keine Cookies zu Analyse- oder Werbezwecken ein. Es findet kein Tracking statt, und wir binden keine
        Werbenetzwerke ein.
      </p>
      <p>Verwendet werden ausschließlich technisch notwendige Cookies:</p>
      <ul>
        <li>
          <strong>Sitzungs-Cookie</strong> (<code>authjs.session-token</code>, bei verschlüsselten Verbindungen mit dem
          Präfix <code>__Secure-</code>): hält Sie nach dem Login angemeldet. Laufzeit 30 Tage.
        </li>
        <li>
          <strong>CSRF-Token</strong> (<code>authjs.csrf-token</code>): schützt Anmeldeformulare vor
          Manipulationsangriffen. Laufzeit auf die Sitzung begrenzt.
        </li>
        <li>
          <strong>Rücksprungadresse</strong> (<code>authjs.callback-url</code>): merkt sich während des Logins, wohin Sie
          zurückgeleitet werden. Laufzeit auf den Anmeldevorgang begrenzt.
        </li>
      </ul>
      <p>
        Zusätzlich speichern wir im lokalen Speicher Ihres Browsers Ihre Auswahl zu externen Inhalten (Schlüssel{" "}
        <code>vipcraft.consent</code>). Diese Angabe verlässt Ihr Gerät nicht und wird nicht an uns übertragen.
      </p>
      <p>
        Rechtsgrundlage für diese Speicherung ist § 25 Abs. 2 Nr. 2 TDDDG, da sie unbedingt erforderlich ist, damit wir
        den von Ihnen ausdrücklich gewünschten Dienst bereitstellen können. Die zugehörige Datenverarbeitung stützt sich
        auf Art. 6 Abs. 1 lit. b und lit. f DSGVO. Sie können Cookies jederzeit in den Einstellungen Ihres Browsers
        löschen; ein Login ist danach allerdings nicht mehr möglich, bis Sie sich erneut anmelden.
      </p>

      <h3>Hinweis zu Cookies und externen Inhalten</h3>
      <p>
        Beim ersten Besuch erscheint ein Hinweis am unteren Bildschirmrand. Er informiert über die notwendigen Cookies
        und holt Ihre Einwilligung für das Laden externer Inhalte ein. Für die technisch notwendigen Cookies wird{" "}
        <strong>keine Einwilligung abgefragt</strong>, da sie nach § 25 Abs. 2 Nr. 2 TDDDG einwilligungsfrei sind; sie
        sind entsprechend als „immer aktiv“ gekennzeichnet.
      </p>
      <p>
        Der Hinweis blockiert die Website nicht: Sie können alle Inhalte auch ohne Auswahl nutzen. Zustimmung und
        Ablehnung sind gleichwertig auf der ersten Ebene erreichbar, und es sind keine Auswahlfelder vorausgewählt. Über
        „Einstellungen“ können Sie einzelne Anbieter getrennt freigeben.
      </p>
      <p>
        Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen. Der Widerruf ist genauso
        einfach wie die Erteilung: Über den Link <strong>„Cookie-Einstellungen“</strong> im Seitenfuß öffnet sich der
        Hinweis erneut, und Sie können Ihre Auswahl ändern. Die Rechtmäßigkeit der bis zum Widerruf erfolgten
        Verarbeitung bleibt unberührt.
      </p>

      <h2>5. Anmeldung über Discord</h2>
      <p>
        Für den geschützten Bereich dieser Website bieten wir ausschließlich die Anmeldung über Discord an. Anbieter ist
        die Discord Netherlands B.V., Schiphol Boulevard 195, 1118 BG Schiphol, Niederlande, gemeinsam mit der Discord
        Inc., 444 De Haro Street, Suite 200, San Francisco, CA 94107, USA.
      </p>
      <p>
        Wenn Sie auf die Login-Schaltfläche klicken, werden Sie zu Discord weitergeleitet. Dort melden Sie sich mit Ihren
        Discord-Zugangsdaten an und entscheiden, ob Sie unserer Anwendung Zugriff gewähren. Ihre Zugangsdaten erfahren
        wir zu keinem Zeitpunkt. Discord verarbeitet den Anmeldevorgang eigenverantwortlich; hierbei werden
        insbesondere Ihre IP-Adresse und Angaben zu Ihrem Gerät an Discord übermittelt.
      </p>
      <p>
        Nach erfolgreicher Anmeldung erhalten und speichern wir aus den Bereichen „identify“, „email“ und
        „guilds.members.read“ folgende Daten:
      </p>
      <ul>
        <li>Ihre Discord-Benutzerkennung</li>
        <li>Ihren Discord-Anzeigenamen</li>
        <li>Ihre bei Discord hinterlegte E-Mail-Adresse</li>
        <li>die Adresse Ihres Profilbilds</li>
        <li>
          technische Zugriffsmerkmale der Anmeldung (Zugriffs- und Erneuerungstoken, Gültigkeitsdauer, Umfang der
          Berechtigung)
        </li>
        <li>die Information, ob Sie Mitglied unseres Discord-Servers sind, sowie den Zeitpunkt dieser Prüfung</li>
      </ul>
      <p>
        Die Berechtigung „guilds.members.read“ erlaubt uns ausschließlich die Abfrage Ihrer Mitgliedschaft in{" "}
        <strong>unserem</strong> Discord-Server. Eine Liste weiterer Server, denen Sie angehören, erhalten wir dadurch
        nicht. Gespeichert wird lediglich, ob Sie Mitglied sind, und wann wir das zuletzt geprüft haben. Die Prüfung
        erfolgt bei der Anmeldung sowie dann, wenn Sie sie in Ihrem Dashboard selbst auslösen. Sie dient dazu,
        festzustellen, ob Ihr Whitelist-Antrag vollständig ist.
      </p>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, da die Anmeldung Voraussetzung für die Nutzung des geschützten
        Bereichs und für die Bearbeitung Ihres Whitelist-Antrags ist. Da Discord auch in den Vereinigten Staaten
        verarbeitet, kann es zu einer Übermittlung in ein Drittland kommen; näheres finden Sie unter Ziffer 12.
      </p>
      <p>
        Weitere Informationen finden Sie in der{" "}
        <a href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer">
          Datenschutzerklärung von Discord
        </a>
        .
      </p>

      <h2>6. Whitelist-Antrag</h2>
      <p>
        Mit Ihrer ersten Anmeldung wird automatisch ein Antrag auf Freischaltung für den Spielserver angelegt. Für dessen
        Bearbeitung verarbeiten wir:
      </p>
      <ul>
        <li>Ihren Minecraft-Benutzernamen</li>
        <li>Ihre freiwilligen Angaben im Nachrichtenfeld</li>
        <li>den Bearbeitungsstand sowie eine etwaige Notiz des Teams</li>
        <li>Zeitpunkt der Einreichung und der Entscheidung sowie die entscheidende Person aus dem Team</li>
      </ul>
      <p>
        Diese Angaben sind für Mitglieder des Server-Teams mit Administrationsrechten einsehbar. Rechtsgrundlage ist
        Art. 6 Abs. 1 lit. b DSGVO. Die Angabe des Minecraft-Benutzernamens ist erforderlich, um Sie auf dem Spielserver
        freischalten zu können; ohne diese Angabe ist eine Teilnahme technisch nicht möglich. Die Angaben im
        Nachrichtenfeld sind freiwillig und haben keine Auswirkung auf die Entscheidung, wenn Sie darauf verzichten.
      </p>

      <h2>7. Vorschlags-Board</h2>
      <p>
        Angemeldete Personen können Beiträge einstellen und Beiträge anderer bewerten. Gespeichert werden der Titel, der
        Text, die Art des Beitrags, der Bearbeitungsstand, der Zeitpunkt sowie die Zuordnung zu Ihrem Konto. Ihre
        Beiträge und Ihr Anzeigename sind für alle angemeldeten Personen sichtbar. Bewertungen werden Ihrem Konto
        zugeordnet gespeichert, damit jede Person pro Beitrag nur einmal abstimmen kann; anderen Nutzerinnen und Nutzern
        wird nur die Gesamtzahl angezeigt.
      </p>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Veröffentlichen Sie bitte keine personenbezogenen Daten Dritter
        und keine Inhalte, die Sie nicht öffentlich machen möchten.
      </p>

      <h2>8. Profil, Spielstatistiken und Twitch-Kanal</h2>
      <p>
        In Ihrem Profil können Sie Ihren Minecraft-Benutzernamen hinterlegen oder ändern. Auf dieser Grundlage zeigen wir
        Ihnen Spielstatistiken an. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
      </p>
      <p>
        Freiwillig können Sie außerdem Ihren Twitch-Kanal angeben. Wir speichern dann den Kanalnamen und zeigen ihn
        zusammen mit dem öffentlich abrufbaren Live-Status, Streamtitel, Spiel, Zuschauerzahl und Profilbild auf der
        Streams-Seite an. Diese Angaben ruft unser Server über die offizielle Twitch-Schnittstelle ab; Ihre Verknüpfung
        ist damit für alle Besucher der Seite sichtbar. Rechtsgrundlage ist Ihre Einwilligung nach Art. 6 Abs. 1
        lit. a DSGVO, die Sie durch das Eintragen erteilen. Sie können die Verknüpfung jederzeit im Dashboard wieder
        aufheben; der Kanalname wird dann gelöscht.
      </p>
      <p className="note">
        Hinweis für den Betrieb: Solange die Statistiken aus Beispieldaten erzeugt werden, findet insoweit keine
        Verarbeitung echter Spieldaten statt. Sobald Sie ein Auswertungs-Plugin auf dem Spielserver anbinden, muss dieser
        Abschnitt um die dann tatsächlich verarbeiteten Daten und deren Speicherdauer ergänzt werden.
      </p>

      <h2>9. Der Minecraft-Server</h2>
      <p>
        Wenn Sie sich mit dem Spielserver verbinden, verarbeitet dieser technisch bedingt Ihre IP-Adresse, Ihren
        Minecraft-Benutzernamen und Ihre Minecraft-Benutzerkennung sowie Spielereignisse wie Verbindungszeiten,
        Positionen, Bauaktivitäten und Chatnachrichten. Diese Verarbeitung ist erforderlich, um das Spiel zu ermöglichen
        und Regelverstöße aufklären zu können. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und lit. f DSGVO.
      </p>
      <p>Der Spielserver wird betrieben bei:</p>
      <p>
        {legal.gameServerHosting.name}
        <br />
        {legal.gameServerHosting.address}
      </p>

      <h3>Spielerübersicht auf dieser Website</h3>
      <p>
        Diese Website zeigt unter „Spieler“ an, wer gerade auf dem Server ist, sowie die Spielstatistiken aller Personen,
        die den Server bereits besucht haben. Angezeigt werden der Minecraft-Benutzername, ein daraus erzeugtes
        Profilbild und die vom Server erfassten Spielwerte (etwa Spielzeit, zurückgelegte Strecken, abgebaute Blöcke,
        Tode und der Kontostand der Ingame-Währung). Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes
        Interesse liegt darin, den Mitgliedern der Community den Spielstand transparent zu machen.
      </p>

      <h3>IP-Adressen im Kontrollraum</h3>
      <p>
        Administratorinnen und Administratoren können sich im geschützten Kontrollraum die zuletzt bekannte IP-Adresse
        eines Spielers anzeigen lassen. Die Adresse wird dabei aus dem laufenden Protokoll des Spielservers gelesen; wir
        speichern sie nicht zusätzlich. Der Zweck ist ausschließlich die Aufklärung von Regelverstößen, insbesondere das
        Erkennen umgangener Sperren. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
      </p>
      <p>
        Die Adresse wird <strong>nicht</strong> allgemein angezeigt, sondern erst auf ausdrückliche Anforderung im
        Einzelfall. <strong>Jeder solche Abruf wird protokolliert</strong>, einschließlich der abrufenden Person, des
        betroffenen Spielers und des Zeitpunkts. Dieses Protokoll dient der Nachvollziehbarkeit und ist nur im
        Kontrollraum einsehbar.
      </p>

      <h2>10. Serverstatus-Abfrage</h2>
      <p>
        Die Anzeige, ob der Spielserver erreichbar ist, rufen wir über den Dienst mcsrvstat.us ab. Diese Abfrage erfolgt
        ausschließlich durch unseren Server. Ihre IP-Adresse wird dabei <strong>nicht</strong> an den Dienst übermittelt,
        da Ihr Browser keine Verbindung zu diesem Anbieter aufbaut. Rechtsgrundlage für den Abruf ist Art. 6 Abs. 1
        lit. f DSGVO.
      </p>

      <h2>11. Externe Inhalte</h2>
      <h3>Twitch-Einbettung</h3>
      <p>
        Auf der Seite „Streams“ können Übertragungen über den Player von Twitch angesehen werden. Anbieter ist die Twitch
        Interactive, Inc., 350 Bush Street, 2nd Floor, San Francisco, CA 94104, USA, ein Unternehmen der Amazon-Gruppe.
      </p>
      <p>
        Der Player wird <strong>erst geladen, nachdem Sie ausdrücklich darauf geklickt haben</strong>. Bis dahin sehen
        Sie lediglich einen Platzhalter, und es besteht keine Verbindung zu Twitch. Klicken Sie auf „Twitch laden“,
        werden Ihre IP-Adresse und weitere Angaben zu Ihrem Browser an Twitch übermittelt; Twitch kann dabei Cookies
        setzen und auf Informationen in Ihrem Endgerät zugreifen. Sind Sie gleichzeitig bei Twitch angemeldet, kann der
        Aufruf Ihrem dortigen Konto zugeordnet werden.
      </p>
      <p>
        Rechtsgrundlage ist Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG. Ihre Entscheidung
        wird lokal in Ihrem Browser gespeichert und gilt für künftige Besuche. Sie können sie jederzeit widerrufen, indem
        Sie die Websitedaten für diese Seite in Ihrem Browser löschen. Näheres in der{" "}
        <a href="https://www.twitch.tv/p/legal/privacy-notice/" target="_blank" rel="noopener noreferrer">
          Datenschutzerklärung von Twitch
        </a>
        .
      </p>

      <h3>Kartenansicht</h3>
      <p>
        Die Weltkarte wird als eingebettete Seite dargestellt und ebenfalls erst nach ausdrücklichem Klick geladen. Wird
        die Karte von einem fremden Anbieter bereitgestellt, erhält dieser dabei Ihre IP-Adresse. Rechtsgrundlage ist
        Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG.
      </p>

      <h3>Profil- und Skinbilder</h3>
      <p>
        Profilbilder angemeldeter Personen werden vom Discord-Bildserver geladen, Minecraft-Skinbilder vom Dienst
        mc-heads.net. Beim Abruf dieser Bilder wird Ihre IP-Adresse an den jeweiligen Anbieter übermittelt. Dies ist
        erforderlich, um die Bilder darzustellen; Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Cookies werden dabei
        nicht gesetzt.
      </p>

      <h3>Schriftarten</h3>
      <p>
        Die verwendeten Schriftarten werden von unserem eigenen Server ausgeliefert. Eine Verbindung zu Servern von
        Google oder anderen Anbietern findet dabei <strong>nicht</strong> statt, und es werden keine Daten an Dritte
        übermittelt.
      </p>

      <h2>12. Empfänger und Übermittlung in Drittländer</h2>
      <p>
        Personenbezogene Daten geben wir nur weiter, soweit dies für den Betrieb erforderlich ist oder wir gesetzlich
        dazu verpflichtet sind. Empfänger sind der Hosting-Anbieter der Website, der Anbieter des Spielservers sowie –
        bei entsprechender Nutzung – Discord und Twitch.
      </p>
      <p>
        Bei Discord und Twitch kann eine Verarbeitung in den Vereinigten Staaten stattfinden. Die Anbieter stützen solche
        Übermittlungen auf die Standardvertragsklauseln der Europäischen Kommission nach Art. 46 Abs. 2 lit. c DSGVO
        und/oder auf den Angemessenheitsbeschluss zum EU-US Data Privacy Framework nach Art. 45 DSGVO. Ungeachtet dessen
        kann in den Vereinigten Staaten nicht vollständig ausgeschlossen werden, dass dortige Behörden auf Daten
        zugreifen und dass Ihnen keine mit dem europäischen Recht vergleichbaren Rechtsbehelfe zur Verfügung stehen.
      </p>

      <h2>13. Speicherdauer</h2>
      <ul>
        <li>
          <strong>Kontodaten:</strong> für die Dauer Ihres Kontos. Löschen wir Ihr Konto oder verlangen Sie die Löschung,
          werden auch die verknüpften Anmeldedaten, Anträge, Beiträge und Bewertungen gelöscht.
        </li>
        <li>
          <strong>Whitelist-Anträge:</strong> bis zur Löschung Ihres Kontos; abgeschlossene Anträge kann das Team zuvor
          aus der Übersicht entfernen.
        </li>
        <li>
          <strong>Sitzungen:</strong> 30 Tage nach der Anmeldung, bei Abmeldung sofort.
        </li>
        <li>
          <strong>Server-Logfiles:</strong> längstens sieben Tage.
        </li>
      </ul>
      <p>Bestehen gesetzliche Aufbewahrungspflichten, tritt an die Stelle der Löschung eine Einschränkung der Verarbeitung.</p>

      <h2>14. Ihre Rechte</h2>
      <p>Ihnen stehen gegenüber uns folgende Rechte hinsichtlich Ihrer personenbezogenen Daten zu:</p>
      <ul>
        <li>
          <strong>Auskunft</strong> über die verarbeiteten Daten (Art. 15 DSGVO)
        </li>
        <li>
          <strong>Berichtigung</strong> unrichtiger Daten (Art. 16 DSGVO)
        </li>
        <li>
          <strong>Löschung</strong> (Art. 17 DSGVO)
        </li>
        <li>
          <strong>Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO)
        </li>
        <li>
          <strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO)
        </li>
        <li>
          <strong>Widerspruch</strong> gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21 DSGVO)
        </li>
        <li>
          <strong>Widerruf einer erteilten Einwilligung</strong> mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)
        </li>
      </ul>
      <p>
        Zur Ausübung genügt eine formlose Nachricht an <a href={`mailto:${operator.email}`}>{operator.email}</a>. Ihr
        Konto können Sie außerdem jederzeit löschen lassen, indem Sie sich an das Server-Team wenden.
      </p>

      <h2>15. Beschwerderecht bei der Aufsichtsbehörde</h2>
      <p>
        Unbeschadet anderweitiger Rechtsbehelfe steht Ihnen nach Art. 77 DSGVO ein Beschwerderecht bei einer
        Datenschutz-Aufsichtsbehörde zu, insbesondere in dem Mitgliedstaat Ihres Aufenthaltsorts, Ihres Arbeitsplatzes
        oder des Orts des mutmaßlichen Verstoßes. Eine Übersicht der deutschen Aufsichtsbehörden finden Sie beim{" "}
        <a href="https://www.bfdi.bund.de/DE/Service/Anschriften/anschriften_node.html" target="_blank" rel="noopener noreferrer">
          Bundesbeauftragten für den Datenschutz und die Informationsfreiheit
        </a>
        .
      </p>

      <h2>16. Sicherheit</h2>
      <p>
        Wir treffen technische und organisatorische Maßnahmen nach Art. 32 DSGVO, um Ihre Daten gegen Verlust,
        Veränderung und unberechtigten Zugriff zu schützen. Die Übertragung erfolgt verschlüsselt über HTTPS. Der Zugriff
        auf Verwaltungsfunktionen ist auf Konten mit ausdrücklich vergebener Administrationsrolle beschränkt.
      </p>

      <h2>17. Änderungen dieser Erklärung</h2>
      <p>
        Wir passen diese Datenschutzerklärung an, wenn Änderungen an der Website oder an den eingesetzten Diensten dies
        erfordern. Es gilt jeweils die hier abrufbare Fassung. Die geltenden{" "}
        <Link href="/nutzungsbedingungen">Nutzungsbedingungen</Link> und das{" "}
        <Link href="/impressum">Impressum</Link> finden Sie über die verlinkten Seiten.
      </p>
    </LegalPage>
  );
}
