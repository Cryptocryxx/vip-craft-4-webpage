# Hyperframes Composition Brief: VIP Craft 4

## Objective
Create a short launch-style brag video for VIP Craft 4 — die Website eines Whitelist-Servers für Minecraft mit Create 6 und Create: Aeronautics.

## Output
- Composition directory: `brag-output-2026-09-21-152814/composition/`
- Rendered video: `brag-output-2026-09-21-152814/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 22.12 seconds (gerendert: 22.13s, 664 Frames @ 30fps)

## Source Material
- Project root: `C:\Users\Lorenz\Documents\GitHub\vip-craft-4-webpage`
- Primary files read: `src/app/globals.css` (Design-Tokens), `src/app/[locale]/layout.tsx` (Schriften), `src/app/[locale]/page.tsx`, `src/components/home/Hero.tsx`, `messages/de.json` (alle Texte), `src/lib/config.ts`, `public/logo.png`
- Product name: VIP Craft 4
- Tagline / strongest claim: *"Das erste Modell stürzt praktisch immer ab — und genau das ist der Spaß daran."* (`AeronauticsHighlight.paragraph2`)
- Key UI or visual moment to recreate: die Aeronautics-Bauteilkarten der Startseite (Holz-Panel mit Messingrahmen und Nieten, Diamant-Cyan-Akzent), die Kreditkarte von `/economy/kredite`, und die Whitelist-Statuskarte aus dem Dashboard.
- Copy that must appear verbatim (alles Deutsch, so wie auf der Website):
  - "Dein erstes Flugzeug" / "stürzt ab." / "So ist es gedacht."  *(verdichtet aus `AeronauticsHighlight.paragraph2`)*
  - "Season 4" · "Create 6" · "Minecraft 1.21.1"  *(`siteConfig`, Hero-Badges)*
  - "Fabriken, Züge und Flugmaschinen."  *(`Metadata.tagline`)*
  - "Create: Aeronautics"  *(Eyebrow)*
  - "Flugzeuge, die wirklich fliegen"  *(`AeronauticsHighlight.titleLine1/Highlight/Line2`)*
  - "Propellerlager" · "Aeronautics-Chassis" · "Boiler-Engine" · "Ballons"  *(`AeronauticsHighlight.part1–4Title`)*
  - "Sable-Physik"  *(`AeronauticsHighlight.badgePhysics`)*
  - "Wirtschaft" · "Kredite zwischen Spielern"  *(`Credits.eyebrow`, abgeleitet aus `Credits.title`/`description`)*
  - "Annehmen" · "Angenommen"  *(`Credits.accept`, `ApplicationStatuses.APPROVED`)*
  - "Whitelist-Status" · "In Prüfung" · "Freigeschaltet"  *(`WhitelistStatus.eyebrow/inReview/approved`)*
  - "Bau was, das abhebt." · "Zugang per Discord-Login"  *(Outro, im Ton der Seite)*

**Nicht zeigen (Datenschutz / Betrieb):** Server-IP, Discord-Einladungslink, Map-URL, Modpack-URL, echte Spielernamen, echte Kontostände. Der Spielername "Mira" und die Beträge (500 Cog, 10 % Zins, 40 → 540) sind erfundene Standins.

## Creative Direction
- Tone preset: default
- Creative direction: Werkstatt-Stolz mit trockenem Humor
- Interpretation: Warmes, ruhiges Tempo mit wenigen klaren Aussagen. Harte Schnitte nur auf Musik-Akzente, sonst saubere Wipes. Der Humor kommt aus den Server-Regeln selbst, nicht aus Gags oder Übertreibung. Lieber eine Zeile, die steht, als drei, die vorbeihuschen.
- Angle: Die Website verkauft nicht, dass alles funktioniert — sie sagt selbst, dass das erste Flugzeug abstürzt und dass genau das der Spaß ist. Das Video nimmt diese Ehrlichkeit als Aufhänger: ein Server mit harten Regeln (zu schwer = hebt nicht ab), und eine Website, die diese Regeln stolz ausstellt statt sie zu verstecken.
- Hook: Dunkles Holz, drehende Messing-Zahnräder. "Dein erstes Flugzeug" → "stürzt ab." → klein in Messing: "So ist es gedacht."
- Outro / punchline: Whitelist-Karte springt auf grün "Freigeschaltet", dann das Logo mit "Bau was, das abhebt."
- Avoid:
  - Generic SaaS language ("Streamline your workflow", "Join our community")
  - Abstract filler visuals — keine Farbverläufe ohne Inhalt, keine generischen Partikel
  - Unrelated visual redesign — die Seite hat eine eigene Formsprache, die gilt
  - Englische Texte — das Video ist Deutsch wie die Website

## Visual Identity
- Background: `#170e08` (wood-950); Panelflächen `#352314` (wood-800); Rahmen/Tiefe `#24170d` (wood-900)
- Text: `#f3e9d6` (cream); gedämpfter Fließtext bei 75 % Deckkraft
- Accent: Messing `#d9a83f` (brass-400) und `#c48d28` (brass-500); Diamant-Cyan `#3dd3ea` (diamond-400); Kupfer `#d4855a` als Zweitakzent; Erfolgsgrün für "Freigeschaltet"/"Angenommen"
- Display font: Chakra Petch (Überschriften, `tracking-tight`, 600/700)
- Body font: Inter; Beträge und technische Angaben in JetBrains Mono
- Visual references from the project:
  - Zahnrad-Kulisse aus `Hero.tsx`: große Messing-Zahnräder am Rand, gegenläufig, sehr langsam (`gear-spin` 40s / `gear-spin-reverse` 52s), bei 6–9 % Deckkraft
  - Cyan-Radial-Schein: `radial-gradient(60% 50% at 72% 40%, rgba(61,211,234,0.10), transparent 70%)`
  - Holz-Panel mit Messingrahmen und Nieten; `--shadow-brass` = `0 0 0 1px rgb(196 141 40 / .35), 0 14px 34px -18px rgb(0 0 0 / .8)`
  - Cyan-Glow: `--shadow-glow-diamond` = `0 0 28px -6px rgb(61 211 234 / .6)`
  - Body-Untergrund: feine vertikale Maserung + warmer Lichtschein oben (siehe `globals.css` `body`)
  - `public/logo.png` — Holz-Zahnrad, Silberring mit Nieten, goldene 4, Pixel-Schriftzug in Cyan

## Storyboard
Use the storyboard in `brag-output-2026-09-21-152814/brag-plan.md` as the creative contract.

Scene summary (endgültiger Schnitt — Szene 3 läuft bis 13.18s, damit die vierte Bauteilkarte
ihre 0.8s Standzeit bekommt; das Outro ist eine eigene Szene 6):
1. **Hook "stürzt ab"** — 3.70s (0.00–3.70) — Zahnrad-Kulisse; "Dein erstes Flugzeug" / "stürzt ab." / "So ist es gedacht." Alle drei ab 2.80s gemeinsam sichtbar.
2. **Reveal: Logo** — 4.30s (3.70–8.00) — Logo schlägt auf 3.70 ein; Badges "Season 4"/"Create 6"/"Minecraft 1.21.1" auf 4.23/4.75/5.28; Tagline "Fabriken, Züge und Flugmaschinen." auf 6.34, hält 1.44s.
3. **Flugmaschinen** — 5.18s (8.00–13.18) — Panel mit Eyebrow "Create: Aeronautics" + Überschrift "**Flugzeuge**, die wirklich fliegen" (stehen die ganze Szene); vier Bauteilkarten auf 8.44/9.50/10.54/11.60; "Sable-Physik" klein in Mono.
4. **Wirtschaft: ein Kredit** — 4.20s (13.18–17.38) — Kreditkarte "Mira · 500 Cog · 10 % Zins · fällig 550 Cog"; Cursor klickt "Annehmen" auf 14.22; Status → "Angenommen"; Kontostand zählt 40 → 540 Cog.
5. **Freigeschaltet** — 2.81s (17.38–20.19) — Whitelist-Karte "In Prüfung" (drehendes Zahnrad) → grün "Freigeschaltet" auf 18.96, Cyan-Puls im Rahmen.
6. **Outro** — 1.93s (20.19–22.12) — Logo mit "Bau was, das abhebt." (20.42) + "Zugang per Discord-Login" (20.92); Musik blendet 20.62 → 22.12 aus.

## Audio
- Audio role: warmer Musikteppich mit sparsamen, bewegungsgebundenen Akzenten
- Audio arc: leiser, gespannter Einstieg mit einem mechanischen Klick → Einschlag mit dem Logo bei 3.70 und volle Lautstärke → gleichmäßiges Bett, auf dem Karten-Klicks, Münzen und ein Bestätigungston die Bewegungen begleiten → Fade-out über die letzten 1.5s unter dem Logo.
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3` (114.84 BPM)
- Music treatment: `data-start="0"`, Lautstärke-Lane: leise starten (≈0.35), auf den Logo-Einschlag bei 3.70 auf volle Lautstärke, in den letzten 1.5s (19.56 → 21.06) auf 0 ausblenden. Volume-Automation über die `data-automation`-Lane, nicht über einen Timeline-Tween. Umgesetzt: Fade von 20.62 auf 22.12.
- Music cue guidance: Preset gelesen — `C:\Users\Lorenz\.claude\plugins\cache\brag\brag\0.3.0\skills\brag\assets\music\cues\happy-beats-business-moves-vol-9-by-ende-dot-app.music-cues.json`.
  - **Strong cues zum Locken (max. 3, umgesetzt):** 3.70s (Logo-Einschlag), 8.44s (erste Bauteilkarte), 10.54s (dritte Bauteilkarte).
  - **Beat-Raster für Sequenzen:** Badges 4.23 / 4.75 / 5.28 (kurze Labels, bleiben stehen); Bauteilkarten auf jedem *zweiten* Beat 8.44 / 9.50 / 10.54 / 11.60 (Lesbarkeit geht vor); Klick auf "Annehmen" 14.22; Whitelist-Umschlag 18.96; Tagline 6.34; Schnitt zur Wirtschaft 13.18.
  - Lesbarkeit schlägt Cue: wo ein Beat eine Zeile zu früh wegnimmt, gilt die natürliche Zeit.
- Audio-reactive treatment: **subtle** — Bass (`bands[0]`) lässt den Cyan-Schein hinter dem Logo und die Messing-Glanzkante der Panels leicht atmen (3–6 % bei Text-nahen Elementen, bis ~15 % beim reinen Hintergrund-Schein). Keine Wellenform, keine Equalizer-Balken, kein Strobe, keine Partikel. Extraktion über `hyperframes-creative/scripts/extract-audio-data.py`; fällt sie aus, ohne Audio-Reaktivität weiterbauen und das hier vermerken.
- Audio-coupled moments:
  - Szene 1, "stürzt ab." — tiefer mechanischer Klick/Einschlag auf die einschlagende Zeile
  - Szene 2, Logo bei 3.70 — ein Einschlag (beat-locked)
  - Szene 2, drei Badges — je ein leichter Interface-Klick auf dem Beat
  - Szene 3, vier Bauteilkarten — je ein Karten-/Nieten-Klick, etwas fester auf der dritten (Strong Cue 10.54)
  - Szene 4, Cursor klickt "Annehmen" bei 14.22 — ein Klick; danach Münzen über das Hochzählen des Kontostands
  - Szene 5, "Freigeschaltet" bei 17.91 — ein kurzer Bestätigungston, darf über die ausblendende Musik ausklingen
- SFX selection guidance: Alles bewegungsgebunden. Kein SFX auf jeden Textwechsel, kein Whoosh auf jeden Schnitt, kein Riser vor dem Outro. Karten-artige Reveals → Karten-Sounds; Klicks/Tippen → Interface- oder Keyboard-Sounds; Münzen → Casino-Sounds; der Bestätigungston bleibt der einzige „Announcement"-artige Einsatz.
- SFX analysis guidance: `C:\Users\Lorenz\.claude\plugins\cache\brag\brag\0.3.0\skills\brag\assets\sfx\sfx-analysis.md` (und `.json`). Für die wiederholten Reveals (Badges, vier Karten) Dateien mit **niedrigem High-Frequency-Risk** wählen, damit die Wiederholung nicht scharf wird.
- Exact SFX choice: Hyperframes wählt Dateinamen, Zeitpunkte, Dichte und Lautstärke, nachdem die Animation steht.
- Audio files: gewählte Musik und alle SFX nach `brag-output-2026-09-21-152814/composition/assets/` kopieren.

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`. /brag ist ein eigener Workflow: nicht in das `hyperframes`-Intent-Interview und nicht in den generischen product-launch-video-Workflow abbiegen.

Requirements:
- Show at least one real UI, copy, or visual element from the source project — hier: die Aeronautics-Bauteilkarten, die Kreditkarte und die Whitelist-Statuskarte, alle im echten Holz/Messing/Cyan-Stil der Seite.
- Keep all text readable: kurze Labels ≥ 0.8s gesetzt sichtbar, ganze Sätze ≥ 0.3s pro Wort (mind. 1.2s). Schnell rein, dann halten.
- Keep the video within 15–25 seconds (Ziel 21.06s).
- Include the planned music/SFX layer.
- Treat /brag audio notes as guidance, not a fixed cue sheet — SFX erst wählen, wenn die Animation steht.
- Treat music cue metadata as optional timing hints; 1–3 Strong-Cue-Locks reichen, markiert mit `// beat-locked`, Sequenzen mit `// beat-grid`.
- Honor the music fade-out over the last 1.5s via the `data-automation` volume lane.
- Use the audio-reactive workflow for at least one subtle visual (Cyan-Schein / Messing-Glanz). Fällt die Extraktion aus, ohne sie weiterbauen und es dokumentieren.
- Use local assets — GSAP und Musik/SFX lokal in `assets/`, keine Render-Zeit-Netzwerkzugriffe. Die Schriften (Chakra Petch, Inter, JetBrains Mono) als lokale Dateien mit `@font-face` einbinden; ein benannter `font-family` ohne `@font-face` löst `font_family_without_font_face` aus.
- `public/logo.png` nach `assets/` kopieren und von dort referenzieren.
- Run `npx hyperframes check` before render — brag's single gate.
