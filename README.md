# VIP Craft 4 – Website

Website des Minecraft-Servers **VIP Craft 4** (Create-Mod, Uni-Community).
Next.js 16 (App Router) · Tailwind CSS 4 · Auth.js/NextAuth (Discord) · Prisma 7 + SQLite · Lucide Icons.

## Schnellstart

```bash
cp .env.example .env        # zuerst! Werte eintragen (siehe unten)
npm install                 # installiert Abhängigkeiten und generiert den Prisma-Client
npm run db:push             # SQLite-Datenbank anlegen
npm run dev                 # http://localhost:3000
```

### Umgebungsvariablen (`.env`)

| Variable | Beschreibung |
| --- | --- |
| `DATABASE_URL` | SQLite-Pfad, z. B. `file:./prisma/dev.db` |
| `AUTH_SECRET` | Zufälliges Secret für Auth.js (`npx auth secret` oder `openssl rand -base64 32`) |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | Client-ID/-Secret der Discord-OAuth-App |
| `ADMIN_DISCORD_IDS` | Optional: kommagetrennte Discord-User-IDs, die beim Login automatisch Admin werden |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` | Optional: Zugangsdaten der Twitch-Anwendung für den Live-Status |
| `CRAFTY_URL` / `CRAFTY_TOKEN` / `CRAFTY_SERVER_ID` | Crafty Controller – Statistiken lesen und Whitelist-Befehle senden |
| `CRAFTY_WORLD_DIR` | Optional: Name des Weltordners, Vorgabe `world` |
| `CRAFTY_ALLOW_INSECURE_TLS` | Optional: TLS-Prüfung abschalten (nur bei selbstsigniertem Zertifikat) |
| `NEXT_PUBLIC_SERVER_IP` | Startwert der Server-Adresse (im Admin-Panel überschreibbar) |
| `NEXT_PUBLIC_MAP_URL` | Startwert der Squaremap-URL |
| `NEXT_PUBLIC_DISCORD_INVITE` | Startwert des Discord-Einladungslinks |

**Discord-Login einrichten:** Unter <https://discord.com/developers/applications> eine App anlegen, bei
_OAuth2 → Redirects_ die URL `http://localhost:3000/api/auth/callback/discord` eintragen (in Produktion die echte Domain)
und Client-ID/-Secret in die `.env` übernehmen. Ohne diese Werte startet die Seite trotzdem, der Login-Button ist dann
als „nicht konfiguriert“ markiert. In Produktion außerhalb von Vercel zusätzlich `AUTH_URL` oder `AUTH_TRUST_HOST=true` setzen.

**Ersten Admin anlegen:** Ist `ADMIN_DISCORD_IDS` gesetzt, werden genau diese Discord-Accounts beim Login zu Admins.
Bleibt die Variable leer, wird der allererste Login auf einer frischen Datenbank automatisch Admin. Danach vergibt man
weitere Admin-Rollen im Kontrollraum unter _Spieler_.

### Scripts

| Script | Zweck |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js Entwicklung / Build / Produktion |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route-Typen generieren + `tsc --noEmit` |
| `npm run db:push` | Prisma-Schema in die SQLite-DB schreiben (Prototyping) |
| `npm run db:studio` | Prisma Studio für direkte Datenbank-Eingriffe |
| `npm run crafty:check` | Crafty-Verbindung prüfen (`-- --command` testet zusätzlich einen Konsolenbefehl) |

## Whitelist-Ablauf

1. Spieler meldet sich mit Discord an. Beim Login wird **automatisch ein Whitelist-Antrag** angelegt
   (nur, wenn noch keiner existiert, der Account nicht freigeschaltet ist und Anträge offen sind).
2. Im Dashboard trägt der Spieler seinen Minecraft-Gamertag und optional ein paar Sätze zu sich ein.
   Der Gamertag landet gleichzeitig im Profil.
3. Das Team sieht den Antrag im Kontrollraum unter _Whitelist-Anträge_ und nimmt ihn an oder lehnt ihn ab –
   jeweils mit optionaler Notiz, die dem Spieler angezeigt wird.
4. Beim Annehmen wird `whitelisted` gesetzt, der Gamertag übernommen und – sofern Crafty konfiguriert ist –
   automatisch `whitelist add <name>` an die Server-Konsole geschickt. Beim Ablehnen entsprechend
   `whitelist remove`. Nach einer Ablehnung kann der Spieler einen neuen Antrag stellen.

Die Whitelist-Karte im Dashboard zeigt vier Zustände: freigeschaltet (grün), Antrag in Prüfung (Messing,
mit drehendem Zahnrad), unvollständig (Gamertag fehlt) und abgelehnt (rot, mit Begründung).

## Seiten & Features

| Route | Inhalt |
| --- | --- |
| `/` | Hero mit Logo und **Join-Server-Button** (kopiert die IP), Teaser, Feature-Übersicht, Einstiegs-Anleitung |
| `/map` | Großformatige Squaremap-Einbettung (iframe) mit Reload / „neuer Tab“ |
| `/community` | Event-Kalender (Grid) und Server-Timeline („Die Lore“) |
| `/leaderboards` | Hall of Fame / Hall of Shame (Tabs) und Wirtschaftsübersicht (reichste Spieler, Shops) |
| `/schematics` | Bauplan-Galerie mit Suche, Tag-Filter und `.nbt`-Download |
| `/streams` | Verknüpfte Twitch-Kanäle mit echtem Live-Status, Player-Embed nach Einwilligung |
| `/dashboard` | Discord-Login, Profil, **Whitelist-Antrag**, persönliche Stats, **Vorschlags-Board** mit Upvotes |
| `/admin` | **Kontrollraum** (nur für Admins), siehe unten |
| `/impressum`, `/datenschutz`, `/nutzungsbedingungen` | Rechtstexte, siehe „Rechtliches“ |

Globale Komponenten: Ankündigungsbanner, Header mit **Live-Server-Status-Widget** (Online/Offline + Spielerzahl via
`mcsrvstat.us`, Aktualisierung alle 60 s), Login/Avatar, mobile Navigation, Footer.

## Kontrollraum (`/admin`)

Nur für Accounts mit der Rolle `ADMIN`. Alle anderen sehen eine Zugriff-verweigert-Seite.

| Bereich | Funktion |
| --- | --- |
| Übersicht | Kennzahlen (Registrierte, Gewhitelistete, offene Anträge, Vorschläge), neueste Spieler, aktive Konfiguration |
| Whitelist-Anträge | Offene Anträge annehmen/ablehnen mit Notiz, Historie der Entscheidungen, Einträge löschen |
| Spieler | Gamertag, Twitch-Kanal, Rolle und Whitelist-Flag jedes Accounts bearbeiten, Accounts löschen |
| Vorschläge | Status der Community-Beiträge setzen (Offen/Geplant/Umgesetzt/Abgelehnt), Beiträge löschen |
| Einstellungen | Server-Adresse, Karten-URL, Discord-Link, Whitelist offen/geschlossen, Ankündigungsbanner |

Die Einstellungen liegen in der Tabelle `Setting` und **überschreiben die `NEXT_PUBLIC_*`-Werte aus der `.env`**.
Solange nichts gespeichert wurde, gelten die `.env`-Vorgaben. Als Schutz gegen Aussperrung kann sich ein Admin
weder selbst die Rolle entziehen noch den eigenen Account löschen.

## Rechtliches

Impressum, Datenschutzerklärung und Nutzungsbedingungen liegen unter `/impressum`, `/datenschutz` und
`/nutzungsbedingungen` und sind aus dem Footer jeder Seite erreichbar.

**Vor dem Livegang auszufüllen:** Alle Pflichtangaben stehen gebündelt in [`src/lib/legal.ts`](src/lib/legal.ts)
(Name, Anschrift, E-Mail, Telefon, Hoster, Anbieter des Spielservers). Solange dort noch `[BITTE AUSFÜLLEN]` steht,
blendet jede Rechtsseite einen roten Warnhinweis mit der Liste der fehlenden Felder ein. Der Hinweis verschwindet
automatisch, sobald alles eingetragen ist.

Die Texte sind an der deutschen Rechtslage ausgerichtet (§ 5 DDG, § 18 Abs. 2 MStV, Art. 13 DSGVO, § 25 TDDDG) und
beschreiben die tatsächlich implementierten Verarbeitungen. Sie ersetzen keine Rechtsberatung – lass sie vor der
Veröffentlichung prüfen. Bei inhaltlichen Änderungen am Projekt gehört die Datenschutzerklärung mit angepasst,
besonders wenn ein Auswertungs-Plugin angebunden wird.

**Datenschutzfreundliche Umsetzung im Code:**

- Der Serverstatus wird serverseitig abgefragt, die IP-Adresse der Besucher erreicht `mcsrvstat.us` nie.
- Schriftarten werden über `next/font` lokal ausgeliefert, es gibt keine Verbindung zu Google.
- Es werden ausschließlich technisch notwendige Cookies gesetzt (Login-Sitzung, CSRF-Schutz).
- `GET /api/suggestions` erfordert einen Login, damit Beiträge und Namen nicht öffentlich abrufbar sind.

### Einwilligungsverwaltung

Die Logik steckt in [`src/lib/consent.ts`](src/lib/consent.ts); die Auswahl liegt als JSON unter dem
`localStorage`-Schlüssel `vipcraft.consent` und verlässt das Gerät nicht.

- **`CookieBanner`** erscheint beim ersten Besuch unten am Rand. Er blockiert die Seite nicht, weil die notwendigen
  Cookies nach § 25 Abs. 2 Nr. 2 TDDDG einwilligungsfrei sind. „Alle akzeptieren“ und „Nur notwendige“ sind
  gleichrangig gestaltet, nichts ist vorausgewählt, und über „Einstellungen“ lassen sich Anbieter einzeln freigeben.
- **`ConsentGate`** ersetzt jede externe Einbettung durch einen Platzhalter, bis die passende Kategorie freigegeben ist
  (Zwei-Klick-Lösung). Ein Klick direkt am Platzhalter gibt nur diese eine Kategorie frei.
- **`CookieSettingsLink`** im Footer öffnet den Hinweis erneut – der Widerruf ist damit so einfach wie die Zustimmung.

Neue Kategorie ergänzen: in `CONSENT_CATEGORIES` und `consentCategoryInfo` eintragen, dann die Einbettung in
`<ConsentGate category="…">` verpacken. `CONSENT_VERSION` erhöhen, wenn sich der Umfang so ändert, dass alle
Besucher erneut gefragt werden sollen — vorhandene Auswahlen gelten dann als ungültig.

## Crafty-Anbindung (Statistiken & Whitelist)

Die Website spricht mit dem [Crafty Controller](https://docs.craftycontrol.com/) über dessen API v2. Damit kommen
zwei Dinge zusammen: **Statistiken lesen** (Dateizugriff) und **Whitelist-Befehle senden** (Server-Konsole).

### Token anlegen

In Crafty einen eigenen Benutzer mit einer Rolle anlegen, die **nur** diese zwei Berechtigungen auf genau diesem
Server hat – ausdrücklich **kein Superuser**:

| Berechtigung | wofür |
| --- | --- |
| `FILES` | `world/stats/*.json` und `usercache.json` lesen |
| `COMMANDS` | `whitelist add` / `whitelist remove` über `/api/v2/servers/{id}/stdin` |

Anschließend unter Profil → API Keys einen Token erzeugen und in die `.env` eintragen. Die Server-ID steht in der
Crafty-Oberfläche in der Server-URL, alternativ zeigt `npm run crafty:check` alle sichtbaren Server mit ID an.

> **Achtung:** `FILES` erlaubt auch Schreiben und Löschen – eine reine Lese-Berechtigung gibt es in Crafty nicht.
> Und `COMMANDS` erlaubt der Website grundsätzlich jeden Konsolenbefehl. Deshalb sind in
> [`src/lib/server-commands.ts`](src/lib/server-commands.ts) nur feste Befehlsvorlagen erlaubt, Spielernamen werden
> vorher gegen `GAMERTAG_RE` geprüft, und **jeder** abgesetzte Befehl landet mit Auslöser und Ergebnis in der Tabelle
> `CommandLog` und ist im Kontrollraum unter _Server-Anbindung_ einsehbar.

### Verbindung prüfen

```bash
npm run crafty:check              # nur lesend
npm run crafty:check -- --command # zusätzlich ein harmloses `whitelist list`
```

Das Skript prüft Erreichbarkeit, Token, Server-ID, Dateizugriff, `usercache.json` und optional den Befehlskanal.

### Wissenswertes zur API

Die Datei-Endpunkte (`POST /api/v2/servers/{id}/files` mit `{ "path": "…" }`) stehen **nicht** in Craftys offizieller
OpenAPI-Spezifikation, existieren aber. Sie liefern Verzeichnisse als Objekt mit den Einträgen als Schlüssel plus
einen `root_path`-Sondereintrag; Dateiinhalte kommen als String in `data.content`. Da das undokumentiert ist, kann es
sich zwischen Crafty-Versionen ändern – deshalb das Prüfskript.

### Statistiken

Quelle sind die Vanilla-Statistikdateien, die Minecraft ohne Zusatzmod schreibt. Ausgewertet wird in
[`src/lib/minecraft-stats.ts`](src/lib/minecraft-stats.ts); die Zuordnung UUID → Name kommt aus `usercache.json`.
Gelesen wird alle fünf Minuten neu.

Abgedeckt sind Spielzeit, abgebaute Blöcke und Eisen, hergestellte Andesit-Legierung, Laufstrecke, Tode,
Creeper-Tode und erlittener Schaden. **Nicht** abgedeckt, weil Vanilla es nicht erfasst: Tode nach Schadensquelle
(etwa Lava), Create-Zugkilometer und exakt platzierte Blöcke. Dafür bräuchte es Scoreboard-Objectives und ein
kleines Datapack. Kategorien ohne Werte blendet die Seite automatisch aus; ohne Crafty-Konfiguration bleibt die
Rangliste leer.

## API-Routen

| Route | Beschreibung |
| --- | --- |
| `GET /api/server-status` | Proxy zu `api.mcsrvstat.us/3/<ip>`, 60 s gecacht |
| `GET /api/leaderboards?kind=fame\|shame` | Rankings aus den Statistikdateien des Servers |
| `GET /api/economy` | Umlauf & reichste Spieler aus den Numismatics-Bankkonten (Beträge in Spurs) |
| `GET /api/schematics?q=&tag=` | Schematic-Liste (noch ohne Speicher, daher leer) |
| `GET /api/schematics/[id]/download` | `.nbt`-Download (aktuell leere, gültige NBT-Struktur als Platzhalter) |
| `GET /api/streamers` | Verknüpfte Twitch-Kanäle inkl. Live-Status aus der Twitch-API |
| `GET /api/stats/me` | Persönliche Ingame-Stats des eingeloggten Users aus `world/stats` |
| `GET/POST /api/suggestions` | Vorschläge lesen / anlegen (DB, Login erforderlich) |
| `POST /api/suggestions/[id]/vote` | Upvote setzen/entfernen (DB) |
| `/api/auth/*` | Auth.js (Discord OAuth) |

Erfundene Beispieldaten gibt es nicht mehr: Was keine echte Quelle hat, bleibt leer und sagt das auch.
Betroffen sind aktuell der Event-Kalender (geplant: Sync mit den Discord-Events), die Server-Timeline
(wird von Hand gepflegt) und die Schematic-Galerie (braucht noch ein Prisma-Modell plus Dateispeicher).
Die zugehörigen Typen liegen in `src/lib/event-types.ts`, `timeline-types.ts` und `schematic-types.ts`.

### Währung

Numismatics rechnet intern in **Spurs**, angezeigt wird auf der Website in **Cog** – ein Cog sind 64 Spurs.
Die Umrechnung und alle Münzwerte stehen in [`src/lib/currency.ts`](src/lib/currency.ts).

> **Hinweis:** Frühere Fassungen dieses Dokuments nannten das Plugin *Plan (Player Analytics)* als geplante Quelle.
> Das war falsch: Plan unterstützt Spigot/Paper, Sponge, Velocity und Fabric, **aber kein Forge/NeoForge**. Da dieser
> Server auf NeoForge läuft, ist die Quelle stattdessen `world/stats/<uuid>.json`, das Minecraft ohne Zusatzmod
> für jeden Spieler schreibt.

## Twitch-Streams

Jede Person verknüpft ihren Kanal selbst: Dashboard → Profil → **Twitch-Kanal**. Eingetragen wird nur der Kanalname
(der Teil hinter `twitch.tv/`), eine vollständige Adresse wird ebenfalls akzeptiert und automatisch gekürzt. Admins
können den Kanal im Kontrollraum unter _Spieler_ für jeden Account setzen oder entfernen.

Der Live-Status kommt aus der offiziellen **Twitch Helix API** ([`src/lib/twitch.ts`](src/lib/twitch.ts)):

1. Anwendung anlegen unter <https://dev.twitch.tv/console/apps>. Als OAuth-Redirect-URL genügt
   `http://localhost:3000` – sie wird nicht verwendet, ist bei Twitch aber ein Pflichtfeld.
2. Client-ID und Client-Secret erzeugen und als `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` in die `.env` eintragen.
3. Dev-Server neu starten.

Technische Details: Die Abfrage nutzt ein App Access Token (Client-Credentials-Flow), das im Speicher gehalten und
bei Ablauf automatisch erneuert wird. Live-Status, Titel, Spiel, Zuschauerzahl und Twitch-Profilbild werden pro
Abfrage für 60 Sekunden zwischengespeichert; pro Anfrage werden bis zu 100 Kanäle gebündelt. Alle Aufrufe laufen
serverseitig, die IP-Adresse der Besucher erreicht Twitch also nicht.

Ohne hinterlegte Zugangsdaten funktioniert die Seite weiter: Die Kanäle werden angezeigt, gelten aber als offline,
und auf der Streams-Seite erscheint ein entsprechender Hinweis. Netzwerkfehler und ungültige Zugangsdaten werden
abgefangen und protokolliert, ohne die Seite zu beeinträchtigen.

## Projektstruktur

```
prisma/               Schema (Auth.js, WhitelistApplication, Suggestion, Vote, Shop, ServerEvent, Setting)
src/app/              Routen (App Router), Admin-Bereich und API-Handler
src/components/       UI-Bausteine, nach Bereich gruppiert (layout, home, dashboard, admin, …)
src/lib/              Konfiguration, Prisma-Client, Server Actions, Whitelist-, Shop-, Settings- und Watchdog-Logik
src/auth.ts           Auth.js-Konfiguration inkl. signIn-Event (Antrag + Admin-Bootstrap)
src/app/globals.css   Design-Tokens (Holz / Messing / Diamant) und Komponenten-Klassen
```

Dateien mit Datenbankzugriff importieren `server-only`; die zugehörigen Typen und Validierungen liegen
in `*-types.ts`, damit Client-Komponenten sie ohne Prisma-Import nutzen können.

## Design

Warme Holz-Basis (`wood-*`), Messing/Gold (`brass-*`) für Rahmen und Buttons, leuchtendes Diamant-Cyan (`diamond-*`)
als Kontrast. Panels haben optionale Messing-Nieten (`panel-rivets`), Blaupausen-Flächen ein Raster (`panel-blueprint`),
dekorative Zahnräder drehen sich langsam (`animate-gear-spin`). Display-Schrift: Chakra Petch, Text: Inter, Mono: JetBrains Mono.

## Offene Punkte / Nächste Schritte

- Scoreboard-Objectives plus Datapack für die Kategorien, die Vanilla nicht erfasst (Lava-Tode, Zugkilometer)
- Whitelist-Entscheidungen per Discord-Webhook an den Spieler melden
- Schematic-Upload mit Datei-Speicher und echtem Download-Zähler
- Event-Kalender aus den Discord-Events synchronisieren
- Server-Timeline im Kontrollraum pflegbar machen
