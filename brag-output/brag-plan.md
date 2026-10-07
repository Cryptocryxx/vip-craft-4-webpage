# Brag Plan: VIP Craft 4

## What is this app?
Die Website eines Create-Mod-Whitelist-Servers (Minecraft 1.21.1, Create 6, Season 4) mit Discord-Login, Whitelist-Antrag, Live-Karte, Spielershops und einer eigenen Wirtschaft in Cog. Sie ist selbst schon ein Stück Werkstatt: Zahnräder, Messing und ein Flugzeug, das nur abhebt, wenn es leicht genug ist.

## The angle
"Werkstatt-Stolz mit trockenem Humor." Die Physik ist ehrlich: Ein zu schweres Flugzeug hebt nicht ab, ein Jetpack-Tank hält absichtlich nur 40 Sekunden. Das Video nimmt den Server ernst und lässt die Details für sich sprechen. Es zeigt Dinge, die es nur hier gibt: gebaute Flugmaschinen, Kredite zwischen Spielern, Whitelist per Discord.

## Hook (first 2-3 seconds)
Zahnräder drehen sich auf dunklem Holz. Zwei Zeilen kommen in Messing und Creme herein:
"Zu schwer?" / "Dann hebt es nicht ab."
Das ist die Aussage der Website zur Flugphysik als Spielregel. Sie macht neugierig, ohne das Produkt schon zu nennen.

## Key moments (the middle)
- Das Logo (`public/logo.png`) schlägt auf dem Musik-Akzent ein. Danach erscheinen die Badges "Season 4", "Create 6" und "Minecraft 1.21.1" nacheinander.
- Die vier Aeronautics-Karten (Bauteile aus `AeronauticsHighlight`) erscheinen einzeln. Danach folgt die Zeile "Jetpack: 40 Sekunden. Absicht."
- Ein Kredit zwischen zwei erfundenen Spielern, angelegt wie auf `/economy/kredite`: Angebot, Annahme, Rückzahlung mit Zins.

## Outro / punchline
Die Whitelist-Karte springt auf grün ("Freigeschaltet"). Das Logo bleibt stehen mit der Zeile "Bau was, das abhebt." und darunter "Bewerbung per Discord".

## User flow worth showing
1. Eintritt: Login mit Discord, der Whitelist-Antrag wird automatisch angelegt.
2. Aktion: Gamertag eintragen, die Karte zeigt "Antrag in Prüfung" (Messing, drehendes Zahnrad).
3. Ergebnis: Die Karte wird grün, "freigeschaltet".
Dazu als zweiter Fluss: Kredit anbieten, annehmen, zurückzahlen (Wirtschaftsseite).

## Tone
- Preset: default
- Creative direction: Werkstatt-Stolz mit trockenem Humor
- Interpretation: Warmes, ruhiges Tempo mit wenigen, klaren Aussagen. Der Humor entsteht aus den Servererregeln (Gewicht, Sprit), nicht aus Übertreibung.

## Format: vertical — 1080x1920
## Duration: 20 seconds

## Visual identity (from the project)
- Background: `#170e08` (wood-950), Flächen `#352314` (wood-800)
- Accent: Messing `#d9a83f` (brass-400) und Diamant-Cyan `#3dd3ea` (diamond-400)
- Text: Creme `#f3e9d6`
- Display font: Chakra Petch
- Body font: Inter (Daten in JetBrains Mono, Countdown-Look in Silkscreen)
- Strongest visual element: das Logo mit dem Holz-Zahnrad und der goldenen 4, dazu drehende Zahnräder als Kulisse und die Messing-Panels mit Nieten.

## Share copy (draft)
VIP Craft 4 ist live: ein Create-Server, auf dem man Flugzeuge wirklich baut, sich Kredite gibt und per Discord auf die Whitelist kommt.

## Audio direction
- Role: warm bed mit sparsamen, zu den Bewegungen passenden Akzenten
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3` (114.84 BPM, Beat-Raster ab 1.07s, gute Cues in den ersten 13 Sekunden)
- Music treatment: Start bei 0:00 mit leisem Einstieg, volle Lautstärke ab dem Logo-Einschlag, in den letzten 1.5s ausblenden
- Music cue guidance: Preset gelesen. Strong cues: 3.70s (Logo-Einschlag), 6.34s (Szenenmitte), 10.54s (vierte Karte), 12.65s (Wechsel zur Wirtschaft). Beat-Raster für die Badges: 4.23, 4.75, 5.28.
- Audio-reactive treatment: subtle; Bass/Energie lässt das Logo-Leuchten und den Cyan-Schein hinter dem Logo leicht atmen, keine Wellenformbalken.
- SFX posture: moderate; bewegungsgebunden (Zahnrad-Klick, Einschlag, Münzklirren)
- Audio-coupled moments: Logo-Einschlag, Badges nacheinander, vier Karten nacheinander, Münzen bei der Kredit-Buchung, Bestätigungston beim Grün-Werden der Whitelist-Karte
- Restraint rule: Musik trägt, überdeckt aber nie die Lesbarkeit; kein SFX auf jedem Textwechsel.

## Storyboard

### Scene 1 — Hook — 3.7s (0.00–3.70)
Dunkles Holz, drei Zahnräder drehen sich langsam. "Zu schwer?" kommt herein, dann "Dann hebt es nicht ab." Beide Zeilen stehen am Ende gemeinsam mindestens 1.5s still.
Sequential/interaction: yes — die zwei Zeilen erscheinen nacheinander.
Audio intent: gespannt, leise, mit einem tiefen Zahnrad-Klick
Audio-coupled idea: Zahnrad-Klick zur ersten Zeile
Music: Einstieg leise, Spannung baut sich auf
Transition mood: hard → Scene 2, Schnitt auf den Logo-Einschlag bei 3.70s

### Scene 2 — Reveal — 3.8s (3.70–7.50)
Das Logo schlägt mit leichtem Skalieren ein, dahinter ein Cyan-Schein. Unter dem Logo erscheinen nacheinander die Badges "Season 4", "Create 6", "Minecraft 1.21.1". Danach die Zeile "Fabriken, Züge, Flugmaschinen." (gehalten bis zum Szenenende, mindestens 1.2s).
Sequential/interaction: yes — drei Badges nacheinander im Beat-Raster (4.23, 4.75, 5.28, akzentuiert, nicht als Leseinhalt gedacht), dann die Tagline.
Audio intent: Aha-Moment, Wärme
Audio-coupled idea: Einschlag beim Logo, drei leichte Klicks bei den Badges
Music: Voll ab 3.70s
Transition mood: clean wipe → Scene 3

### Scene 3 — Flugmaschinen — 5.15s (7.50–12.65)
Das Panel "Create: Aeronautics" im Stil der Website (Nieten-Panel, Diamant-Akzent). Die vier Bauteil-Karten erscheinen einzeln mit Icon und kurzem Titel: Propeller, Rumpf, Kessel, Rückstoß (Titel aus `messages/de.json`, Abschnitt `AeronauticsHighlight`, im Composition-Schritt exakt übernehmen). Zuletzt fällt darunter "Jetpack: 40 Sekunden. Absicht." ein, gehalten mindestens 1.3s.
Sequential/interaction: yes — vier Karten nacheinander, im Abstand jeder zweiten Beat (Lesbarkeit: Titel bleiben nach dem Erscheinen stehen).
Audio intent: Aufbau, Handwerk
Audio-coupled idea: Karten-für-Karten-Klick, tiefer Ton bei der Jetpack-Zeile
Music: Energie steigt bis 10.54s
Transition mood: clean wipe → Scene 4, Schnitt auf 12.65s

### Scene 4 — Wirtschaft: Kredit — 3.85s (12.65–16.50)
Die Kreditansicht von `/economy/kredite` mit erfundenen Namen (z. B. "Mira" und "Tobi", nicht echte Spieler). Ablauf: Angebot "500 Cog · 10 % Zins" erscheint, der Status springt auf "Angenommen", dann "Zurückgezahlt: 550 Cog". Münzen fallen in den Kontostand.
Sequential/interaction: yes — simuliert einen Klick auf "Annehmen", dann auf "Begleichen".
Audio intent: zufriedenstellend, klingend
Audio-coupled idea: zwei Münzklirren, ein Klick pro simuliertem Tippen
Music: gleichmäßig
Transition mood: soft → Scene 5

### Scene 5 — Freigeschaltet + Outro — 3.5s (16.50–20.00)
Die Whitelist-Karte aus dem Dashboard: "Antrag in Prüfung" (Messing, drehendes Zahnrad) wird grün "Freigeschaltet". Danach bleibt das Logo mit "Bau was, das abhebt." und "Bewerbung per Discord". Keine echte Server-IP und kein echter Discord-Link im Bild.
Sequential/interaction: yes — Zustandswechsel der Karte, dann Logo.
Audio intent: Auflösung, Abschluss
Audio-coupled idea: Bestätigungston beim Grün-Werden, Ausblenden der Musik in den letzten 1.5s
Music: Ausklang
Transition mood: none (Ende)

**Music mood for this video:** upbeat, warm
**Audio summary:** Leiser, gespannter Einstieg, Einschlag mit dem Logo, dann ein gleichmäßiges Musikbett, auf dem Klicks, Münzen und ein Bestätigungston die Bewegungen begleiten.

## Notes
- Erfundene Standins: Spielernamen "Mira" und "Tobi" sowie die Kreditwerte sind Beispiele, keine echten Daten.
- Nicht verwendet: Server-IP, Discord-Einladung, Zugangsdaten und die echten Spielerdaten.
- Die Sprache des Videos ist Deutsch, wie die Vorgabe der Website.
