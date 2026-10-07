# Brag Plan: VIP Craft 4

## What is this app?
Die Website eines Whitelist-Servers für Minecraft 1.21.1 mit Create 6 — Discord-Login mit automatischem Whitelist-Antrag, Live-Karte, Spieler-Shops, eine Wirtschaft in Cog mit Krediten und Kopfgeldern, und als Herzstück Create: Aeronautics, wo Flugzeuge mit echter Physik gebaut werden.

## The angle
"Werkstatt-Stolz mit trockenem Humor." Die Website verkauft nicht, dass alles funktioniert — sie sagt selbst: *"Das erste Modell stürzt praktisch immer ab — und genau das ist der Spaß daran."* Das Video nimmt diese Ehrlichkeit als Aufhänger. Es zeigt einen Server, der harte Regeln hat (zu schwer = hebt nicht ab), und eine Website, die diese Regeln stolz ausstellt statt sie zu verstecken. Kein generisches "Join our community" — die Seite hat eigene Sätze, die niemand sonst schreiben würde.

## Hook (first 2-3 seconds)
Dunkles Holz, drei Messing-Zahnräder drehen sich langsam. Zwei Zeilen kommen nacheinander in Creme herein:
**"Dein erstes Flugzeug"** → **"stürzt ab."**
Danach klein in Messing darunter: **"So ist es gedacht."**
Das ist die eigene Aussage der Website über die Sable-Physik, verdichtet auf drei Zeilen. Es widerspricht der Erwartung an einen Server-Trailer und macht damit den Rest des Videos verdient.

## Key moments (the middle)
- Das Logo (`public/logo.png` — Holz-Zahnrad mit goldener 4) schlägt auf dem Musik-Akzent ein, dahinter der Cyan-Schein aus dem Hero. Danach die drei Badges aus dem Hero: "Season 4", "Create 6", "Minecraft 1.21.1".
- Die vier Aeronautics-Bauteile aus `AeronauticsHighlight` erscheinen einzeln als Nieten-Karten mit ihren echten Titeln: **Propellerlager, Aeronautics-Chassis, Boiler-Engine, Ballons**. Darüber steht die ganze Zeit die Überschrift der Seite: "**Flugzeuge**, die wirklich fliegen" (im Video gekürzt auf die Kernaussage, damit sie einzeilig bleibt).
- Ein Kredit zwischen zwei Spielern wie auf `/economy/kredite`: Das Angebot "500 Cog · 10 % Zins" liegt da, ein Cursor klickt "Annehmen", der Status springt um und der Kontostand zählt mit Münzklirren hoch. Das ist Spielerwirtschaft, die in einer Website stattfindet — nicht im Spiel.

## Outro / punchline
Die Whitelist-Karte aus dem Dashboard steht auf "In Prüfung" mit drehendem Zahnrad und springt auf grün: **"Freigeschaltet"**. Dann das Logo mit **"Bau was, das abhebt."** und darunter klein "Zugang per Discord-Login".

## User flow worth showing
1. **Eintritt:** Login mit Discord — der Whitelist-Antrag entsteht dabei automatisch (`HowToJoin`, Schritt 1).
2. **Aktion:** Minecraft-Username eintragen, die Karte steht auf "In Prüfung".
3. **Ergebnis:** Das Team schaltet frei, die Karte wird grün: "Freigeschaltet".

Zweiter Fluss, der die Website als *laufendes Produkt* zeigt: Kreditangebot annehmen auf `/economy/kredite` — Angebot → Klick auf "Annehmen" → Betrag landet auf dem Konto.

## Tone
- Preset: default
- Creative direction: Werkstatt-Stolz mit trockenem Humor
- Interpretation: Warmes, ruhiges Tempo mit wenigen, klaren Aussagen; harte Schnitte nur auf die Musik-Akzente. Der Humor kommt aus den Server-Regeln selbst (das erste Modell stürzt ab), nicht aus Übertreibung oder Gags.

## Format: landscape — 1920x1080
## Duration: 22.12 seconds (an das Beat-Raster von Vol. 9 gelegt)

## Visual identity (from the project)
- Background: `#170e08` (wood-950), Panelflächen `#352314` (wood-800), Rahmen `#24170d` (wood-900)
- Accent: Messing `#d9a83f` (brass-400) / `#c48d28` (brass-500); Diamant-Cyan `#3dd3ea` (diamond-400)
- Text: Creme `#f3e9d6`, gedämpft `#f3e9d6` bei 75 % Deckkraft
- Display font: Chakra Petch (Überschriften, tracking-tight)
- Body font: Inter; Zahlen und Beträge in JetBrains Mono
- Strongest visual element: das Logo (Holz-Zahnrad, Silberring mit Nieten, goldene 4, Pixel-Schrift in Cyan) vor der Kulisse langsam drehender Messing-Zahnräder, dazu der Cyan-Radial-Schein aus dem Hero und die Holz-Panels mit Messingrahmen.
- Weitere Zutaten aus dem Code: `--shadow-brass` (Messing-Hairline + tiefer Schatten), `--shadow-glow-diamond` (Cyan-Glow), die Zahnrad-Animationen `gear-spin` / `gear-spin-reverse`.

## Share copy (draft)
Auf VIP Craft 4 baust du dein Flugzeug Block für Block — und das erste stürzt praktisch immer ab. Genau das ist der Spaß.

## Audio direction
- Role: warmer Musikteppich mit sparsamen, bewegungsgebundenen Akzenten
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3` (114.84 BPM)
- Music treatment: Start bei 0:00 leise und gespannt, volle Lautstärke ab dem Logo-Einschlag (3.70s), Ausblenden über die letzten 1.5s
- Music cue guidance: Preset gelesen (`assets/music/cues/…vol-9….music-cues.md`). Auf Strong Cues gelegt (`// beat-locked`): **3.70s** (Logo-Einschlag), **8.44s** (erste Bauteil-Karte), **10.54s** (dritte Bauteil-Karte). Beat-Raster (`// beat-grid`): Badges auf 4.23 / 4.75 / 5.28 (Akzente, kein Lesegut), Tagline auf 6.34, Bauteil-Karten auf jedem zweiten Beat 8.44 / 9.50 / 10.54 / 11.60 (Titel bleiben danach stehen), Klick auf "Annehmen" auf 14.22, Whitelist-Umschlag auf 18.96. Der Schnitt zur Wirtschaft liegt auf 13.18 (Raster statt Strong Cue) — 12.65 hätte der vierten Karte ihre Standzeit genommen.
- Audio-reactive treatment: subtle — Bass/Energie lässt den Cyan-Schein hinter dem Logo und den Messing-Glanz der Panels leicht atmen. Keine Wellenformbalken, keine sichtbaren Pegel.
- SFX posture: moderate, ausschließlich bewegungsgebunden — tiefer Zahnrad-Klick, ein Einschlag beim Logo, leichte Klicks bei Badges und Karten, Münzklirren beim Kontostand, ein Bestätigungston beim Grün-Werden.
- Audio-coupled moments: Logo-Einschlag, drei Badges nacheinander, vier Bauteil-Karten nacheinander, simulierter Cursor-Klick auf "Annehmen", hochzählender Kontostand mit Münzen, Statuswechsel der Whitelist-Karte.
- Restraint rule: Musik trägt, überdeckt aber nie die Lesbarkeit. Kein SFX auf jedem Textwechsel, kein Whoosh auf jeden Schnitt, kein Riser vor dem Outro.

## Storyboard

> Endgültiger Schnitt. Gegenüber der ersten Fassung wurde Szene 3 bis 13.18s verlängert
> (die vierte Bauteilkarte hatte sonst keine 0.8s Standzeit) und das Outro als eigene
> Szene 6 abgetrennt. Gesamtlänge dadurch 22.12s statt 21.06s.

### Szene 1 — Hook: "stürzt ab" — 3.70s (0.00–3.70)
Dunkles Holz (`#170e08`) mit der Zahnrad-Kulisse aus dem Hero: Messing-Zahnräder am Rand drehen sich langsam gegenläufig, rechts unten der Cyan-Schein. Mittig, Chakra Petch: "Dein erstes Flugzeug" kommt bei 0.35s herein, "stürzt ab." schlägt bei 1.25s darunter ein (die Kulisse ruckt kurz mit). Bei 2.35s erscheint klein in Messing "So ist es gedacht." Alle drei Zeilen stehen ab 2.80s gemeinsam still.
Sequential/interaction: yes — drei Zeilen nacheinander. Hauptsatz ab 1.60s vollständig lesbar (2.10s gesetzt), Messingzeile 0.90s.
Audio intent: gespannt und leise, ein einzelner mechanischer Akzent
Audio-coupled: Holz-Thud (`impactWood_medium_000`) auf "stürzt ab."
Music: leiser Einstieg (Lane 0.30 → 0.42)
Transition mood: hard → Szene 2, Schnitt auf Strong Cue 3.70s

### Szene 2 — Reveal: das Logo — 4.30s (3.70–8.00)
Das Logo schlägt auf 3.70s ein (Overshoot, `back.out(1.7)`), dahinter der Cyan-Schein, der mit dem Bass atmet. Darunter die drei Hero-Badges nacheinander auf dem Beat-Raster: "Season 4" (4.23), "Create 6" mit Zahnrad-Icon (4.75), "Minecraft 1.21.1" (5.28) — alle bleiben stehen. Auf 6.34 setzt sich die Tagline "Fabriken, Züge und Flugmaschinen." und steht 1.44s still.
Sequential/interaction: yes — drei Badges als Akzente im Beat-Raster, danach die Tagline als eigener Einsatz.
Audio intent: Aha-Moment, Wärme, Ankunft
Audio-coupled: Einschlag (`impactSoft_heavy_002`) beim Logo, drei leise Klicks bei den Badges
Music: ab 3.75s volle Lautstärke
Transition mood: clean → Szene 3

### Szene 3 — Flugmaschinen — 5.18s (8.00–13.18)
Holz-Panel mit Messingrahmen und Nieten. Oben die Eyebrow "Create: Aeronautics" in Cyan und die Überschrift "**Flugzeuge**, die wirklich fliegen" (Flugzeuge in Diamant-Cyan, wie `titleHighlight` auf der Seite); rechts oben klein in Mono "Sable-Physik". Beide stehen ab 8.5s die ganze Szene. Darunter erscheinen vier Nieten-Karten einzeln mit Icon und echtem Titel: **Propellerlager** (8.44), **Aeronautics-Chassis** (9.50), **Boiler-Engine** (10.54, Strong Cue), **Ballons** (11.60). Jede bleibt stehen; die letzte hat 1.32s Standzeit.
Sequential/interaction: yes — vier Karten auf jedem zweiten Beat, kurze Titel, alle bleiben sichtbar.
Audio intent: Aufbau, Handwerk, Teile, die zusammenkommen
Audio-coupled: `card-slide-1` pro Karte, etwas fester auf der dritten (Strong Cue 10.54)
Music: Energie steigt bis 10.54s
Transition mood: clean → Szene 4

### Szene 4 — Wirtschaft: ein Kredit — 4.20s (13.18–17.38)
Die Kreditansicht von `/economy/kredite` im Website-Stil. Eyebrow "Wirtschaft", Überschrift "Kredite zwischen Spielern", rechts oben der Kontostand "40 Cog" in Mono. In der Angebotskarte: **Mira** (erfunden) "bietet dir einen Kredit an", **500 Cog**, darunter "10 % Zins · fällig 550 Cog", rechts die Knöpfe "Ablehnen" und "Annehmen". Ab 13.80s steht alles. Auf 14.22 fährt ein Cursor auf "Annehmen" und klickt; der Knopf drückt sich ein, das Knopfpaar weicht dem grünen Statusband **"Angenommen"**, der Kartenrahmen wird grün und der Kontostand zählt 40 → 540 Cog, während Münzen klirren. Hält bis 17.14s.
Sequential/interaction: yes — simulierter Cursor-Klick, danach Statuswechsel und hochzählender Kontostand.
Audio intent: zufriedenstellend, klingend, ein abgeschlossener Handel
Audio-coupled: `click_003` beim Drücken (14.22), `chips-handle-1` über das Hochzählen (14.44)
Music: gleichmäßig, trägt
Transition mood: soft → Szene 5

### Szene 5 — Freigeschaltet — 2.81s (17.38–20.19)
Die Whitelist-Karte aus dem Dashboard: Eyebrow "Whitelist-Status", darunter "In Prüfung" in Messing mit einem drehenden Zahnrad-Icon. Auf 18.96 springt die Karte um: das Zahnrad weicht einem grünen Haken, "In Prüfung" wird **"Freigeschaltet"**, ein Cyan-Puls läuft durch den Rahmen. "In Prüfung" steht 1.18s, "Freigeschaltet" 0.94s.
Sequential/interaction: yes — Zustandswechsel der Karte.
Audio intent: Auflösung
Audio-coupled: Bestätigungston (`impactBell_heavy_000`) auf 18.96, darf über die Musik ausklingen
Music: gleichmäßig
Transition mood: soft → Szene 6

### Szene 6 — Outro — 1.93s (20.19–22.12)
Das Logo kommt nach vorn, darunter in Chakra Petch **"Bau was, das abhebt."** (20.42) und klein in Messing "Zugang per Discord-Login" (20.92). Keine echte Server-IP, kein Einladungslink im Bild. Die Musik blendet von 20.62 bis 22.12 auf 0 aus.
Sequential/interaction: yes — Logo, dann Zeile, dann Unterzeile.
Audio intent: Abschluss, ein sauber gesetzter Schlusspunkt
Audio-coupled: kein neues SFX — nur die ausblendende Musik
Music: Fade-out über die letzten 1.5s
Transition mood: none (Ende)

**Music mood for this video:** upbeat, warm
**Audio summary:** Leiser, gespannter Einstieg mit einem Holz-Thud, Einschlag mit dem Logo, dann ein gleichmäßiges warmes Bett, auf dem Karten-Klicks, ein Cursor-Klick, Münzen und ein einzelner Bestätigungston die Bewegungen begleiten, bevor die Musik unter dem Logo ausblendet.

## Notes
- **Erfundene Standins:** Der Spielername "Mira" und die Kreditwerte (500 Cog, 10 % Zins, Kontostand 40 → 540) sind Beispiele. Keine echten Spielerdaten, keine echten Kontostände.
- **Bewusst nicht im Bild:** Server-IP, Discord-Einladungslink, Map-URL, Modpack-URL, E-Mail-Adressen, echte Spielernamen. Das Outro sagt "Zugang per Discord-Login" statt einen Link zu zeigen.
- **Sprache:** Deutsch, wie die Website selbst. Alle Überschriften, Badges und Bauteil-Titel sind wörtlich aus `messages/de.json` bzw. `src/lib/config.ts` übernommen.
- Die Zahnrad-Kulisse, die Nieten-Panels und der Cyan-Schein sind keine Erfindung fürs Video, sondern direkt die Bauteile aus `globals.css` und `src/components/home/Hero.tsx`.
