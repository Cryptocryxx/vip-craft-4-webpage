# Brag Plan: VIP Craft 4 — Kredite (Hochformat)

## What is this app?
Die Website von VIP Craft 4 hat ein neues Feature: **Kredite zwischen Spielern**. Ein Spieler bietet einem anderen Geld aus seinem Numismatics-Konto an, zu einem selbst gewählten Zins. Der andere nimmt auf der Website an, bekommt das Geld ingame aufs Konto und zahlt es später in einem Rutsch zurück.

## The angle
"Die Bank bucht alles — nur eintreiben tut sie nichts."

Das System ist technisch streng: Der Betrag wird beim Anbieten **sofort reserviert**, der Zins wird **einmalig** gerechnet und zugunsten des Gebers aufgerundet, ein Angebot **verfällt nach 7 Tagen** von selbst. Und dann steht im Regeltext der Seite: *"Ein Rückzahlungsdatum ist eine Abmachung — eingetrieben wird nichts."* Genau dieser Bruch ist das Video: drei sauber gebuchte Schritte, und am Ende hängt alles am Vertrauen. Das ist kein Bug, das ist die Haltung des Servers.

Weil es ein Erklärer ist, folgt das Video dem echten Ablauf der Seite — anbieten → annehmen → begleichen — und zeigt die Regeln **dort, wo sie in der UI stehen** (der Zins-Hinweis am Zinsfeld, die Gültigkeit auf der Angebotskarte), statt sie als Regel-Liste nachzuschieben.

## Hook (first 2-3 seconds)
Dunkles Holz, Zahnräder. Klein in Cyan "Neu", darunter riesig in Messing **"Kredite"**. Dann darunter die Zeile, die den ganzen Rest trägt: **"Mit Zins. Ohne Inkasso."**

## Key moments (the middle)
- **Schritt 1 — Anbieten:** Das Formular von `/economy/kredite` füllt sich Zeile für Zeile: An wen → *Tobi*, Betrag → *500 Cog*, Zins → *10 %* mit dem Chip "einmalig" daneben (echter `interestHint`: "Einmalig auf den Betrag, 0 bis 50 %"). Darunter die Vorschauzeile der Seite: "500 Cog verleihen, 550 Cog zurückbekommen." Zuletzt der Warnchip **"sofort reserviert"**.
- **Schritt 2 — Annehmen:** Die echte `KreditKarte` aus Sicht des Nehmers: Spielerkopf, "Von Mira", Badge "Angeboten" in Messing, darunter das Drei-Spalten-Raster **Betrag / Zins / Zurück** (500 Cog · 10 % · 550 Cog) und die Zeile "Angebot gültig bis 28.09." Ein Cursor klickt "Annehmen", der Badge springt auf "Läuft" in Cyan, der Kontostand zählt hoch.
- **Schritt 3 — Begleichen:** Dieselbe Karte aus Schuldner-Sicht, Knopf "550 Cog begleichen". Klick, Badge wird grün: "Beglichen".

## Outro / punchline
Die Karten gehen, und es bleibt der Satz aus dem Regeltext stehen: **"Ein Rückzahlungsdatum ist eine Abmachung."** → **"Eingetrieben wird nichts."** Danach das Logo mit "Jetzt auf der Website".

## User flow worth showing
Genau der Ablauf, den die Seite vorgibt — das *ist* hier das Feature:
1. **Eintritt:** Kreditgeber füllt das Formular („Einen Kredit anbieten"): Empfänger, Betrag, Zins. Der Betrag wird sofort von seinem Konto reserviert.
2. **Aktion:** Der Kreditnehmer sieht das Angebot unter „Angebote an dich" und klickt **Annehmen** — der Betrag geht sofort auf sein Konto, die Summe mit Zins steht als Schuld offen.
3. **Ergebnis:** Später klickt er **„550 Cog begleichen"** — der Betrag wird in einem Rutsch abgebucht und geht an den Kreditgeber. Status: **Beglichen**.

## Tone
- Preset: default
- Creative direction: Werkstatt-Stolz mit trockenem Humor — hier als ruhiger, sachlicher Erklärer, dessen Pointe die eigene Regel ist
- Interpretation: Die drei Schritte werden sauber und ohne Hektik gezeigt, jeder mit Nummer und Titel, damit man folgen kann. Die Kamera bleibt ruhig, die Bewegung liegt in den Karten und im Cursor. Der Humor kommt erst am Schluss und wird nicht betont — er steht einfach da.

## Format: vertical — 1080x1920
## Duration: 22.64 seconds (an das Beat-Raster von Vol. 9 gelegt)

## Visual identity (from the project)
- Background: `#170e08` (wood-950), Panelflächen `#352314` (wood-800), Karten `#24170d` (wood-900)
- Accent: Messing `#d9a83f` / `#c48d28`, Diamant-Cyan `#3dd3ea`, Erfolgsgrün `#4ade9a`
- Text: Creme `#f3e9d6`
- Display font: Chakra Petch · Body: Inter · Beträge: JetBrains Mono
- Badge-Töne 1:1 aus `KreditKarte.tsx`: `OFFERED` → brass, `ACTIVE` ("Läuft") → diamond, `REPAID` ("Beglichen") → emerald
- Kartenaufbau 1:1 aus `KreditKarte.tsx`: Spielerkopf 32px, „Von {name}" fett, „Angeboten am {date}" klein, Status-Badge rechts, darunter `dl` mit drei Spalten Betrag / Zins / Zurück in Mono
- Strongest visual element: die Kredit-Karte selbst mit ihrem Status-Badge — sie ist das Feature, und der Badge-Wechsel brass → cyan → grün erzählt den ganzen Ablauf

## Share copy (draft)
Neu auf VIP Craft 4: Kredite zwischen Spielern. Betrag und Zins bestimmst du selbst, der Betrag wird sofort reserviert, und nach 7 Tagen verfällt das Angebot von allein. Nur eintreiben tut die Bank nichts — ein Rückzahlungsdatum ist eine Abmachung.

## Audio direction
- Role: warmer Musikteppich, sparsame bewegungsgebundene Akzente; bei der Pointe wird es ruhig
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3` (114.84 BPM)
- Music treatment: leise und gespannt starten, ab dem Schnitt auf 3.70 volle Lautstärke, unter der Pointe ab 17.38 auf ~0.6 zurücknehmen (der Satz soll stehen), Fade auf 0 über die letzten 1.5s (21.14 → 22.64). Alles über die `data-automation`-Volume-Lane.
- Music cue guidance: Preset gelesen. **Strong-Cue-Locks (3):** 3.70s (Schnitt vom Hook in Schritt 1), 8.44s (Schnitt in Schritt 2), 10.54s (der Klick auf "Annehmen"). **Beat-Raster:** Formularzeilen 4.23 / 4.75 / 5.28, Vorschauzeile 5.80, Warnchip 6.86, Badge-Wechsel 10.75, Schnitt in Schritt 3 auf 13.18, Klick auf "Begleichen" 14.76, Pointe-Zeilen 17.38 / 17.91 / 18.96, Outro 20.02.
- Audio-reactive treatment: subtle — Bass lässt den Cyan-Schein hinter dem Logo und den warmen Lichtschein der Kulisse atmen. Keine Balken, keine Wellenform.
- SFX posture: moderate, ausschließlich bewegungsgebunden
- Audio-coupled moments:
  - Hook: Holz-Thud auf "Kredite"
  - Schritt 1: drei leise Klicks, wenn sich die Formularzeilen füllen; ein Münz-Ticken beim Warnchip "sofort reserviert"
  - Schritt 2: Karten-Sound beim Erscheinen, Cursor-Klick auf 10.54, Münzen über das Hochzählen des Kontostands
  - Schritt 3: Cursor-Klick auf 14.76, danach der Bestätigungston auf "Beglichen"
  - Pointe: **kein SFX** — nur die zurückgenommene Musik
- Restraint rule: Unter der Pointe passiert akustisch nichts Neues. Kein Riser, kein Whoosh auf Schnitte, kein SFX auf jeden Textwechsel.

## Storyboard

### Szene 1 — Hook — 3.70s (0.00–3.70)
Zahnrad-Kulisse auf dunklem Holz. Klein in Cyan "Neu" (0.30). Darunter riesig in Messing **"Kredite"**, das bei 0.55 mit kurzem Overshoot einschlägt (settled 0.95). Bei 1.90 kommt darunter in Creme **"Mit Zins. Ohne Inkasso."** (settled 2.30, steht 1.40s).
Sequential/interaction: yes — drei Einsätze nacheinander.
Audio intent: gespannt, ein trockener mechanischer Akzent
Audio-coupled: Holz-Thud auf "Kredite"
Music: leiser Einstieg
Transition mood: hard → Szene 2, Schnitt auf Strong Cue 3.70s

### Szene 2 — Schritt 1: Anbieten — 4.74s (3.70–8.44)
Oben die Schrittmarke "Schritt 1" (Messing-Chip) und der Titel **"Anbieten"**. Darunter das Formular-Panel im Website-Stil. Die drei Zeilen füllen sich nacheinander im Beat-Raster: **An wen → Tobi** (4.23), **Betrag → 500 Cog** (4.75), **Zins → 10 %** (5.28) mit dem Chip "einmalig" daneben. Bei 5.80 erscheint die Vorschauzeile der Seite in Messing: **"500 Cog verleihen, 550 Cog zurückbekommen."** (settled 6.20, steht 2.24s). Bei 6.86 der Warnchip **"sofort reserviert"** (settled 7.22).
Sequential/interaction: yes — drei Formularzeilen füllen sich einzeln, danach Vorschau und Warnung.
Audio intent: sachlich, ein Formular, das sich ausfüllt
Audio-coupled: je ein leiser Klick pro Zeile, ein Münz-Ticken beim Warnchip
Music: volle Lautstärke ab 3.75
Transition mood: clean → Szene 3, Schnitt auf Strong Cue 8.44s

### Szene 3 — Schritt 2: Annehmen — 4.74s (8.44–13.18)
Schrittmarke "Schritt 2", Titel **"Annehmen"**. Die echte Kredit-Karte aus Sicht des Nehmers kommt herein (8.44, settled 8.95): Spielerkopf, **"Von Mira"**, darunter klein "Angeboten am 21.09.2026", rechts der Badge **"Angeboten"** in Messing. Darunter das Drei-Spalten-Raster **Betrag 500 Cog · Zins 10 % · Zurück 550 Cog** und die Zeile "Angebot gültig bis 28.09." Unten die Knöpfe "Ablehnen" und "Annehmen". Auf 10.54 fährt der Cursor auf "Annehmen" und klickt; der Badge springt auf **"Läuft"** in Cyan, der Kartenrahmen wird cyan, und der Kontostand oben zählt von 40 auf 540 Cog.
Sequential/interaction: yes — simulierter Cursor-Klick, danach Badge-Wechsel und hochzählender Kontostand.
Audio intent: der Moment, in dem das Geld wirklich fließt
Audio-coupled: Karten-Sound beim Erscheinen, Klick auf 10.54, Münzen über das Hochzählen
Music: gleichmäßig
Transition mood: clean → Szene 4, Schnitt auf 13.18

### Szene 4 — Schritt 3: Begleichen — 4.20s (13.18–17.38)
Schrittmarke "Schritt 3", Titel **"Begleichen"**. Dieselbe Karte, jetzt aus Schuldner-Sicht: **"An Mira"**, Badge "Läuft" in Cyan, dasselbe Drei-Spalten-Raster, und unten der Messing-Knopf **"550 Cog begleichen"** (settled 13.65). Auf 14.76 klickt der Cursor; der Badge wird grün: **"Beglichen"**, ein Haken erscheint, der Rahmen wird grün (settled 15.25, steht 2.13s).
Sequential/interaction: yes — simulierter Cursor-Klick, danach Statuswechsel.
Audio intent: abgeschlossen, sauber verbucht
Audio-coupled: Klick auf 14.76, Bestätigungston auf den Statuswechsel
Music: gleichmäßig
Transition mood: soft → Szene 5

### Szene 5 — Pointe + Outro — 5.26s (17.38–22.64)
Die Karte zieht sich zurück. Es bleibt, in Creme und groß, der Satz aus dem Regeltext der Seite: **"Ein Rückzahlungsdatum"** (17.38) / **"ist eine Abmachung."** (17.91, settled 18.30). Bei 18.96 darunter in Messing: **"Eingetrieben wird nichts."** (settled 19.35). Ab 20.02 gehen die Zeilen, das Logo kommt nach vorn mit **"Jetzt auf der Website"** (20.54, settled 20.95) und klein darunter "Wirtschaft → Kredite". Musik blendet 21.14 → 22.64 aus.
Sequential/interaction: yes — zwei Pointe-Zeilen nacheinander, dann der Übergang zum Logo.
Audio intent: Ruhe. Der Satz soll ohne Hilfe stehen.
Audio-coupled: kein SFX — die Musik geht ab 17.38 auf ~0.6 zurück und blendet am Ende aus
Music: zurückgenommen, dann Fade-out
Transition mood: none (Ende)

**Music mood for this video:** upbeat, warm — mit bewusster Rücknahme unter der Pointe
**Audio summary:** Gespannter leiser Einstieg mit einem Holz-Thud, dann ein gleichmäßiges warmes Bett, auf dem Formular-Klicks, ein Karten-Sound, zwei Cursor-Klicks, Münzen und ein Bestätigungston die drei Schritte begleiten; unter der Pointe nimmt sich die Musik zurück und blendet unter dem Logo aus.

## Notes
- **Erfundene Standins:** Die Spielernamen "Mira" und "Tobi", die Beträge (500 Cog, 10 % Zins, 550 Cog fällig, Kontostand 40 → 540) und die Daten (21.09. / 28.09.) sind Beispiele. Keine echten Spieler, keine echten Kontostände.
- **Fachlich geprüft am Code** (`src/lib/kredit-types.ts`, `src/components/credits/KreditKarte.tsx`, `messages/de.json` → `Credits`):
  - Zins 0–50 %, ganze Prozent, **einmalig** auf den Betrag (`faelligSpurs` = Betrag + aufgerundeter Zins)
  - 500 Cog bei 10 % ⇒ 550 Cog fällig ✓
  - Betrag 1–10.000 Cog; Angebot verfällt nach **7 Tagen** (`KREDIT_ANGEBOT_TAGE`)
  - Statusnamen und Badge-Töne wörtlich aus `Credits.status` bzw. `KreditKarte.tsx`: "Angeboten" (brass) → "Läuft" (diamond) → "Beglichen" (emerald)
  - Die Karte zeigt tatsächlich Betrag / Zins / Zurück als drei Spalten
- **Bewusst nicht im Bild:** Server-IP, Discord-Einladung, Map- und Modpack-URL, echte Spielernamen. Das Outro nennt nur den Weg in der Seitennavigation.
- **Sprache:** Deutsch, wie die Website.
