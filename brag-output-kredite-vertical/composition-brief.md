# Hyperframes Composition Brief: VIP Craft 4 — Kredite (Hochformat)

## Objective
Ein kurzer Feature-Erklärer im Hochformat für **Kredite zwischen Spielern** auf VIP Craft 4 — der neue Bereich unter `/economy/kredite`.

## Output
- Composition directory: `brag-output-kredite-vertical/composition/`
- Rendered video: `brag-output-kredite-vertical/brag.mp4`
- Format: vertical — 1080x1920
- Duration: 22.64 seconds (gerendert: 22.67s, 680 Frames @ 30fps)

## Source Material
- Project root: `C:\Users\Lorenz\Documents\GitHub\vip-craft-4-webpage`
- Primary files read: `src/lib/kredit-types.ts` (Grenzen, Zustandsautomat, Zinsrechnung), `src/components/credits/KreditKarte.tsx` (Kartenaufbau und Badge-Töne), `src/lib/currency.ts` (Cog/Spurs), `messages/de.json` → `Credits` (alle Texte), `src/app/globals.css`, `public/logo.png`
- Product name: VIP Craft 4 — Feature "Kredite"
- Tagline / strongest claim: *"Ein Rückzahlungsdatum ist eine Abmachung — eingetrieben wird nichts."* (`Credits.rules`)
- Key UI or visual moment to recreate: die **`KreditKarte`** mit ihrem Status-Badge — Spielerkopf, "Von {name}", "Angeboten am {date}", Badge rechts, darunter `dl` mit drei Spalten **Betrag / Zins / Zurück** in Mono. Der Badge-Wechsel **Angeboten (brass) → Läuft (diamond) → Beglichen (emerald)** erzählt den ganzen Ablauf.
- Copy that must appear verbatim (Deutsch, wie auf der Website):
  - "Neu" · "Kredite" · "Mit Zins. Ohne Inkasso."  *(Hook, im Ton der Seite)*
  - "Anbieten" · "Annehmen" · "Begleichen"  *(die drei Schritte des echten Ablaufs)*
  - "An wen" · "Betrag" · "Zins"  *(`Credits.borrowerLabel/amountLabel/interestLabel`)*
  - "einmalig"  *(verdichtet aus `Credits.interestHint`: "Einmalig auf den Betrag, 0 bis 50 %.")*
  - "500 Cog verleihen, 550 Cog zurückbekommen."  *(`Credits.preview`)*
  - "sofort reserviert"  *(verdichtet aus `Credits.warning`)*
  - "Von Mira" · "An Mira" · "Angeboten am {date}"  *(`Credits.fromPlayer/toPlayer/createdOn`)*
  - "Betrag" · "Zins" · "Zurück"  *(`Credits.amount/interest/due` — die drei Spalten der Karte)*
  - "Angebot gültig bis {date}"  *(`Credits.offerValidUntil`)*
  - "Ablehnen" · "Annehmen"  *(`Credits.decline/accept`)*
  - "550 Cog begleichen"  *(`Credits.repay`)*
  - "Angeboten" · "Läuft" · "Beglichen"  *(`Credits.status.OFFERED/ACTIVE/REPAID`)*
  - "Ein Rückzahlungsdatum ist eine Abmachung." / "Eingetrieben wird nichts."  *(`Credits.rules`)*
  - "Jetzt auf der Website" · "Wirtschaft → Kredite"  *(Outro)*

**Nicht zeigen (Datenschutz / Betrieb):** Server-IP, Discord-Einladungslink, Map- und Modpack-URL, echte Spielernamen, echte Kontostände. "Mira" und "Tobi" sowie alle Beträge und Daten sind erfundene Standins. Der Spielerkopf ist ein generischer 8×8-Pixelkopf — die echte Seite lädt ihn über mc-heads.net, was beim Rendern weder deterministisch noch unsere Daten wäre.

## Fachliche Prüfung (damit der Erklärer nichts Falsches behauptet)
Gegen `src/lib/kredit-types.ts` abgeglichen:
- Zins **0–50 %**, ganze Prozent, **einmalig auf den Betrag** — nicht pro Tag (`KREDIT_MIN_ZINS` / `KREDIT_MAX_ZINS`)
- `faelligSpurs(betrag, zins) = betrag + ceil(betrag * zins / 100)` ⇒ 500 Cog bei 10 % = **550 Cog** ✓
- Betrag **1–10.000 Cog** (`KREDIT_MIN_COGS` / `KREDIT_MAX_COGS`)
- Angebot verfällt nach **7 Tagen** (`KREDIT_ANGEBOT_TAGE`) — daher "Angebot gültig bis 28.09." bei "Angeboten am 21.09."
- Der Betrag wird **beim Anbieten** reserviert (`RESERVING → OFFERED`), nicht erst beim Annehmen
- Statusnamen und Badge-Töne wörtlich aus `Credits.status` bzw. `TON` in `KreditKarte.tsx`

## Creative Direction
- Tone preset: default
- Creative direction: Werkstatt-Stolz mit trockenem Humor — hier als ruhiger, sachlicher Erklärer, dessen Pointe die eigene Regel ist
- Interpretation: Drei nummerierte Schritte, jeder mit Chip und Titel, damit man folgen kann. Die Kamera bleibt ruhig; Bewegung liegt in den Karten, im Cursor und im Badge-Wechsel. Der Humor kommt erst am Schluss und wird nicht betont.
- Angle: "Die Bank bucht alles — nur eintreiben tut sie nichts." Das System ist technisch streng (sofortige Reservierung, einmaliger Zins, automatischer Verfall nach 7 Tagen), und am Ende hängt trotzdem alles am Vertrauen. Dieser Bruch ist das Video.
- Hook: "Neu" → riesig "Kredite" → "Mit Zins. Ohne Inkasso."
- Outro / punchline: "Ein Rückzahlungsdatum ist eine Abmachung." / "Eingetrieben wird nichts." → Logo, "Jetzt auf der Website"
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Eine nachgeschobene Regel-Liste — die Regeln stehen dort, wo sie auch in der UI stehen (Zins-Chip am Zinsfeld, Gültigkeit auf der Angebotskarte)
  - Englische Texte

## Visual Identity
- Background: `#170e08` (wood-950); Panel `#352314` (wood-800); Karte `#24170d` (wood-900)
- Text: `#f3e9d6` (cream)
- Accent: Messing `#d9a83f` / `#c48d28` / `#e6c15f`; Diamant-Cyan `#3dd3ea`; Erfolgsgrün `#4ade9a`
- Display font: Chakra Petch · Body: Inter · Beträge: JetBrains Mono (tabular-nums)
- Visual references: Zahnrad-Kulisse aus `Hero.tsx` (`gear-spin` 40s / `gear-spin-reverse` 52s), `--shadow-brass`, Holz-Panel mit Nieten, Body-Maserung aus `globals.css`

## Storyboard
Use the storyboard in `brag-output-kredite-vertical/brag-plan.md` as the creative contract.

Scene summary:
1. **Hook** — 3.70s (0.00–3.70) — "Neu" (0.30), riesig "Kredite" (0.55), "Mit Zins. Ohne Inkasso." (1.90).
2. **Schritt 1: Anbieten** — 4.74s (3.70–8.44) — Formular füllt sich: Tobi (4.23), 500 Cog (4.75), 10 % + Chip "einmalig" (5.28); Vorschauzeile (5.80); Warnchip "sofort reserviert" (6.86).
3. **Schritt 2: Annehmen** — 4.74s (8.44–13.18) — Kredit-Karte mit Badge "Angeboten"; Cursor klickt "Annehmen" (10.54); Badge → "Läuft", Rahmen cyan, Konto 40 → 540 Cog (10.78).
4. **Schritt 3: Begleichen** — 4.20s (13.18–17.38) — dieselbe Karte als Schuld, Knopf "550 Cog begleichen"; Klick (14.76); Badge → "Beglichen", Rahmen grün (15.00).
5. **Pointe + Outro** — 5.26s (17.38–22.64) — "Ein Rückzahlungsdatum" (17.38) / "ist eine Abmachung." (17.91) / "Eingetrieben wird nichts." (18.96); ab 20.02 Logo mit "Jetzt auf der Website" + "Wirtschaft → Kredite".

## Audio
- Audio role: warmer Musikteppich mit sparsamen, bewegungsgebundenen Akzenten; unter der Pointe bewusst zurückgenommen
- Audio arc: leiser gespannter Einstieg mit einem Holz-Thud → ab 3.75 volle Lautstärke → Formular-Klicks, Karten-Sound, zwei Cursor-Klicks, Münzen, ein Bestätigungston → ab 17.6 auf 0.6 zurück, damit die Pointe steht → Fade auf 0 über 21.14 → 22.64
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3` (114.84 BPM)
- Music treatment: alles über die `data-automation`-Volume-Lane; `data-volume="0.9"` als Grundpegel
- Music cue guidance: Preset gelesen. **Strong-Cue-Locks (3, umgesetzt):** 3.70s (Schnitt aus dem Hook), 8.44s (Schnitt in Schritt 2), 10.54s (Klick auf "Annehmen"). **Beat-Raster:** Formularzeilen 4.23 / 4.75 / 5.28, Vorschau 5.80, Warnchip 6.86, Badge-Wechsel 10.78, Schnitt in Schritt 3 auf 13.18, Klick auf "begleichen" 14.76, Pointe 17.38 / 17.91 / 18.96, Outro 20.02.
- Audio-reactive treatment: subtle — Bass (`bands[0..1]`) lässt den Cyan-Schein hinter dem Logo und den Hintergrund-Schein atmen (3–6 % Skalenhub). Keine Balken, keine Wellenform. Extraktion über `hyperframes-creative/scripts/extract-audio-data.py`, auf 690 Frames gekürzt.
- SFX (umgesetzt, alle bewegungsgebunden):
  - `impactWood_medium_000` @ 0.55 — der Einschlag von "Kredite"
  - `impactSoft_heavy_002` @ 3.70 — Schnitt in Schritt 1
  - `click_005` @ 4.23 / 4.75 / 5.28 — die drei Formularzeilen (low HF risk, weil wiederholt)
  - `chips-stack-2` @ 6.86 — das Reservieren
  - `card-slide-1` @ 8.44 und 13.18 — die Karten
  - `click_003` @ 10.54 und 14.76 — die beiden Cursor-Klicks
  - `chips-handle-1` @ 10.78 — Münzen über das Hochzählen
  - `impactBell_heavy_000` @ 15.00 — "Beglichen"
- Restraint rule: Unter der Pointe passiert akustisch nichts Neues. Kein Riser, kein Whoosh auf Schnitte.

## Hyperframes Instructions
Domain skills: `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`. /brag ist ein eigener Workflow — nicht in das `hyperframes`-Intent-Interview abbiegen.

Requirements (Stand nach dem Bau):
- Echte UI der Seite gezeigt: Kredit-Karte, Formularfelder, Status-Badges, Drei-Spalten-Raster — alle Texte aus `messages/de.json`. ✓
- Lesbarkeit: kurze Labels ≥ 0.8s gesetzt sichtbar, Sätze ≥ 0.3s pro Wort. Der Schnitt liegt bewusst auf dem Raster statt auf jedem Strong Cue, wo ein Cue eine Zeile zu früh genommen hätte. ✓
- Länge 22.64s (15–25s). ✓
- Musik + SFX vorhanden, Fade über die `data-automation`-Lane. ✓
- Audio-reaktiv: Cyan-Schein und Hintergrund atmen mit dem Bass. ✓
- Lokale Assets: GSAP, Schriften (`@font-face` auf lokale woff2), Logo, Musik und SFX liegen unter `assets/`. Keine Netzzugriffe beim Rendern. ✓
- Cursor-Zielkoordinaten wurden im Browser per `getBoundingClientRect` gemessen, nicht geschätzt. ✓
- `npx hyperframes check`: 0 Fehler, 39/39 Kontrast-Checks nach WCAG AA. Der gewollte Badge-Übergang ist mit `data-layout-allow-overlap` markiert. ✓
