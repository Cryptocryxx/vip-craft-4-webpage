# VIP Craft 4 – Website

Website des Minecraft-Servers **VIP Craft 4** (Create-Mod, Uni-Community).
Next.js 16 (App Router) · Tailwind CSS 4 · Auth.js/NextAuth (Discord) · Prisma 7 + SQLite · Lucide Icons.

## Schnellstart

```bash
npm install                 # installiert Abhängigkeiten und generiert den Prisma-Client
cp .env.example .env        # Werte eintragen (siehe unten)
npm run db:push             # SQLite-Datenbank anlegen
npm run db:seed             # Demo-User und Vorschläge einspielen (optional)
npm run dev                 # http://localhost:3000
```

### Umgebungsvariablen (`.env`)

| Variable | Beschreibung |
| --- | --- |
| `DATABASE_URL` | SQLite-Pfad, z. B. `file:./prisma/dev.db` |
| `AUTH_SECRET` | Zufälliges Secret für Auth.js (`npx auth secret` oder `openssl rand -base64 32`) |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | Client-ID/-Secret der Discord-OAuth-App |
| `NEXT_PUBLIC_SERVER_IP` | Server-Adresse – wird kopiert und für den Live-Status genutzt |
| `NEXT_PUBLIC_MAP_URL` | URL der Squaremap-Instanz (Platzhalter: `https://demo.squaremap.app/`) |
| `NEXT_PUBLIC_DISCORD_INVITE` | Discord-Einladungslink |

**Discord-Login einrichten:** Unter <https://discord.com/developers/applications> eine App anlegen, bei
_OAuth2 → Redirects_ die URL `http://localhost:3000/api/auth/callback/discord` eintragen (in Produktion die echte Domain)
und Client-ID/-Secret in die `.env` übernehmen. Ohne diese Werte startet die Seite trotzdem, der Login-Button ist dann
als „nicht konfiguriert“ markiert. In Produktion außerhalb von Vercel zusätzlich `AUTH_URL` oder `AUTH_TRUST_HOST=true` setzen.

### Scripts

| Script | Zweck |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js Entwicklung / Build / Produktion |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route-Typen generieren + `tsc --noEmit` |
| `npm run db:push` | Prisma-Schema in die SQLite-DB schreiben (Prototyping) |
| `npm run db:seed` | Seed-Daten (`prisma/seed.ts`) |
| `npm run db:studio` | Prisma Studio – z. B. um `whitelisted` für einen User zu setzen |

## Seiten & Features

| Route | Inhalt |
| --- | --- |
| `/` | Hero mit Logo und **Join-Server-Button** (kopiert die IP), Teaser, Feature-Übersicht, Einstiegs-Anleitung |
| `/map` | Großformatige Squaremap-Einbettung (iframe) mit Reload / „neuer Tab“ |
| `/community` | Event-Kalender (Grid) und Server-Timeline („Die Lore“) |
| `/leaderboards` | Hall of Fame / Hall of Shame (Tabs) und Wirtschaftsübersicht (reichste Spieler, Shops) |
| `/schematics` | Bauplan-Galerie mit Suche, Tag-Filter und `.nbt`-Download |
| `/streams` | Live-Streamer im offiziellen Twitch-Player-Embed, Übersicht aller Streamer |
| `/dashboard` | Discord-Login, Profil mit Minecraft-Gamertag, **Whitelist-Status**, persönliche Stats, **Vorschlags-Board** mit Upvotes |

Globale Komponenten: Header mit **Live-Server-Status-Widget** (Online/Offline + Spielerzahl via `mcsrvstat.us`, Aktualisierung alle 60 s), Login/Avatar, mobile Navigation, Footer.

## API-Routen

| Route | Beschreibung |
| --- | --- |
| `GET /api/server-status` | Proxy zu `api.mcsrvstat.us/3/<ip>`, 60 s gecacht |
| `GET /api/leaderboards?kind=fame\|shame` | Rankings (Mock) |
| `GET /api/economy` | Reichste Spieler & Shops (Mock) |
| `GET /api/schematics?q=&tag=` | Schematic-Liste (Mock) |
| `GET /api/schematics/[id]/download` | `.nbt`-Download (aktuell leere, gültige NBT-Struktur als Platzhalter) |
| `GET /api/streamers` | Streamer inkl. Live-Status (Mock) |
| `GET /api/stats/me` | Persönliche Ingame-Stats des eingeloggten Users (Mock, aus Gamertag abgeleitet) |
| `GET/POST /api/suggestions` | Vorschläge lesen / anlegen (DB) |
| `POST /api/suggestions/[id]/vote` | Upvote setzen/entfernen (DB) |
| `/api/auth/*` | Auth.js (Discord OAuth) |

Die Mock-Daten liegen in `src/lib/mock/` und sind so geschnitten, dass sie später 1:1 durch Abfragen an das
**Plan-Plugin** (Leaderboards, Stats, Economy), die **Twitch Helix API** (Live-Status) und einen Datei-Speicher
(Schematics) ersetzt werden können.

## Projektstruktur

```
prisma/               Schema (Auth.js-Modelle, Suggestion, Vote) + Seed
src/app/              Routen (App Router) und API-Handler
src/components/       UI-Bausteine, nach Bereich gruppiert (layout, home, dashboard, …)
src/lib/              Konfiguration, Prisma-Client, Server Actions, Formatierung, Mock-Daten
src/auth.ts           Auth.js-Konfiguration (Discord, Prisma-Adapter, Session-Callback)
src/app/globals.css   Design-Tokens (Holz / Messing / Diamant) und Komponenten-Klassen
```

## Design

Warme Holz-Basis (`wood-*`), Messing/Gold (`brass-*`) für Rahmen und Buttons, leuchtendes Diamant-Cyan (`diamond-*`)
als Kontrast. Panels haben optionale Messing-Nieten (`panel-rivets`), Blaupausen-Flächen ein Raster (`panel-blueprint`),
dekorative Zahnräder drehen sich langsam (`animate-gear-spin`). Display-Schrift: Chakra Petch, Text: Inter, Mono: JetBrains Mono.

## Offene Punkte / Nächste Schritte

- Plan-Plugin anbinden (Leaderboards, persönliche Stats, Economy)
- Twitch Helix API für echten Live-Status; Kanalnamen in `src/lib/mock/streamers.ts` ersetzen
- Schematic-Upload mit Datei-Speicher und echtem Download-Zähler
- Admin-Ansicht zum Setzen von `whitelisted` (aktuell über Prisma Studio)
- Events/Timeline aus der Datenbank statt aus Mock-Dateien
