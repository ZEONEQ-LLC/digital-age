@AGENTS.md

# digital-age-v2 — Konventionen für Claude Code

## Projekt

News-Magazin für KI & Future Tech (DACH-Region). Aktueller Deploy:
`digital-age-v2-eight.vercel.app`. Custom Domain `digital-age.ch` läuft
noch auf WordPress/Hostpoint, Migration zu Vercel kommt später.

## Stack

- Next.js 16.2.3 (App Router, src-dir, TypeScript)
- React 19.2.4
- Tailwind CSS v4 (Theme in `src/app/globals.css` via `@theme`)
- Supabase (geplant: Postgres, Auth, Storage, Edge Functions) — einzige DB
- Hosting: Vercel mit Auto-Deploy via GitHub
- Geplante Erweiterungen: Resend (Mails), Anthropic API (AI News Ticker)

## Container-Setup

Entwicklung läuft im OrbStack-Container `claude-box`:

- **Mount:** `~/dev/ai-shared` (Mac) → `/projekt` (Container)
- **Projekt-Pfad im Container:** `/projekt/digital-age`
- **Container-Domain:** `claude-box.orb.local`

In den Container einsteigen (vom Mac-Terminal):

```bash
docker start -i claude-box
# oder
orb shell claude-box
```

Vor jedem Befehl ins Projekt-Verzeichnis wechseln:

```bash
cd /projekt/digital-age
```

**Hinweis:** Die OrbStack Debug Shell ist NICHT die richtige Shell zum
Arbeiten — sie startet, wenn man den Container über das UI direkt öffnet.
Stattdessen `docker start -i claude-box` oder `orb shell claude-box`
vom Mac-Terminal nutzen.

## Befehle

```bash
npm run dev      # Dev-Server auf 0.0.0.0:3000 (Flag ist im Script verdrahtet)
npm run build    # Production-Build
npm run start    # Production-Server lokal
npm run lint     # ESLint
```

`package.json` `dev`-Script:
```json
"dev": "next dev --hostname 0.0.0.0"
```

Der `--hostname 0.0.0.0`-Flag ist Pflicht, sonst kommt der Mac-Browser
nicht durch zum Container. Steht fest im Script — nicht entfernen.

Hinweis: `next lint` existiert in Next.js 16 nicht mehr — `eslint` direkt nutzen.

## Verzeichnisstruktur

```
src/
├── app/              # App Router (page.tsx, layout.tsx, globals.css)
├── components/       # React-Komponenten
└── ...
public/
└── images/           # Logos, Hero-Bilder, Assets (KEINE Leerzeichen in neuen Dateinamen)
supabase/
└── migrations/       # Versionierte Schema-Änderungen (sobald Supabase aktiv)
```

Path-Alias: `@/*` → `./src/*`

## Code-Stil

- Inline-Styles in Komponenten sind okay, wenn projekt-spezifisch
- Tailwind v4: Brand-Farben und Typografie sind in `src/app/globals.css` via
  `@theme` definiert — NICHT in `tailwind.config.ts` ergänzen
- Deutsche UI-Texte, englische Code-Identifier (Variablen, Funktionen, Komponenten)
- TypeScript strict, keine `any`-Schludereien

## Workflow

- Feature-Branches, kleine fokussierte PRs
- Branch Protection auf `main` — Merges nur via PR
- Vercel Preview Deploy pro PR ist Pflicht-Review-Schritt
- Nach Komponenten-Änderung: kurz im Preview-Deploy prüfen, bevor "fertig"

### Branch-Naming

- `feat/<kurzbeschreibung>` für neue Features
- `fix/<kurzbeschreibung>` für Bugfixes
- `chore/<kurzbeschreibung>` für Aufräum-Arbeiten, Deps, Config
- Kleinbuchstaben, Bindestriche, keine Umlaute

### Auto-Befehle (ohne Rückfrage)

Erlaubt: `npm run *`, `cd /projekt/**`, `git status`, `git diff`,
`git log`, `cat`, `ls`, `pwd`, `ps`, `curl localhost:*`

Bestätigungspflichtig: `git push`, `git commit` (Message vorab zeigen),
`npm install`, `rm`, `supabase db push`, alles mit `sudo`

### Git-Hygiene

- `.gitignore` muss enthalten: `.DS_Store`, `node_modules/`, `.next/`,
  `.env*.local`, `*.log`
- Versehentlich committete Dateien: `git rm --cached <file>` und neu committen
- `.env.local` NIEMALS committen — auch nicht "nur als Template"

## Mock-API & Datenmodell (Phase 7+ Migration-Targets)

Alle In-Memory-Mock-APIs in `src/lib/` sind als TODO-Phase-7+-markiert
und werden mit der Supabase-Integration ersetzt:

- `mockAuthorApi.ts` → Tabellen `authors` + `articles` + `revisions`
  - `getCurrentAuthor()` ist deprecated → `@/lib/authorApi` (seit Session B)
  - Public-facing Konsumenten (Homepage, Listings, Article-Detail, Author-Profil)
    seit Session C auf `@/lib/articleApi` und `@/lib/authorApi` migriert
  - Author-Suite-Konsumenten (Dashboard, Profil, Podcasts, AuthorShell) nutzen
    noch CRUD-Functions aus mockAuthorApi (createDraft, saveDraft, submitForReview,
    getRevisions, getDashboardStats) — Session D/E
- `mockPodcastApi.ts` → Tabelle `podcasts` (Empfehlungs-Modell, kein eigenes Hosting)
  - Public-Page `/podcasts` seit Session D auf Supabase migriert (`@/lib/podcastApi`)
  - Author-Suite-Page `/autor/podcasts` nutzt noch Mock — CRUD-Migration Session E
- `articleSlugRegistry.ts` → wird in späterer Session durch Supabase-Query ersetzt
  (aktuell nur noch von Mock-Podcast-Code referenziert; nicht mehr im Public-Flow)

### Three-Role Author-Modell

`Author.type` ist eine von drei Rollen:

- `external` — Pitcher ohne Login. Kein Dashboard, keine CRUD-Rechte.
  Reichen einmalig über `/artikel-pitchen` ein.
- `author` — Stammautor mit Login. CRUD nur auf eigene Articles und
  Podcast-Empfehlungen.
- `editor` — Redaktion/Admin mit Login. CRUD auf alles, plus
  Reassignment von Empfehlern (Podcast-Empfehlungen können auf andere
  interne Authors umgehängt werden).

Externe Authors können niemals Podcast-Empfehler sein — wird in
`mockPodcastApi.assertRecommenderEligible` validiert und später per
RLS-Policy enforced.

### Demo-Mode-Marker

Frontend-only Features mit Mock-Persistenz tragen einen
`<DemoBanner />` (siehe `src/components/DemoBanner.tsx`). Bei
Supabase-Migration entfällt der Banner.

## Supabase

**Workflow: Cloud-Only** — kein lokales Postgres, kein `supabase start`,
kein Docker. Begründung: `claude-box` ist ein OrbStack-Linux-VM-Container,
Docker-in-Container hätte Reibung gebracht; Free-Tier-Cloud reicht für
Phase 7 vollständig aus.

- **Projekt:** `digital-age db` · Region `eu-central-1` · Free-Tier
- **Project Ref:** `dkmvadaypxiaxwfkbghz`
- **Dashboard:** https://supabase.com/dashboard/project/dkmvadaypxiaxwfkbghz

### Befehle (Cloud-Only)

```bash
npx supabase migration new <name>      # neue SQL-Migration anlegen
npx supabase db push                   # alle pending Migrations auf Cloud deployen
npx supabase gen types typescript --project-id dkmvadaypxiaxwfkbghz > src/lib/database.types.ts
```

- Migrations sind versioniert in `supabase/migrations/`, sind Source-of-Truth
- Vor `db push` lokal das SQL nochmal lesen — Rollback ist teurer als Vorsicht
- Nach Schema-Änderung Types regenerieren, sonst läuft TypeScript schief
- RLS auf allen Tabellen aktiv — keine Ausnahmen

### Free-Tier-Hinweis

Projekt pausiert nach 7 Tagen Inaktivität. Bei aktiver Arbeit unkritisch;
sonst im Dashboard "Restore" klicken (~30s).

Auth-Mails: Default-SMTP von Supabase ist **2 Mails/Stunde** rate-limited.
Beim Smoke-Test der Magic-Link-Flow das im Hinterkopf behalten. Resend-Migration
mit eigenem Domain-SPF kommt auf der Phase-7-Merkliste.

### Auth-Flow (seit Phase 7 Session B)

- **Magic Link** via `supabase.auth.signInWithOtp` — kein Passwort, Klick auf
  Link in der Mail = Bestätigung
- Default-SMTP von Supabase (`noreply@mail.app.supabase.io`); Resend-Migration
  später
- Auth-Settings im Dashboard: Site URL + Redirect URLs müssen sowohl Vercel
  (`https://digital-age-v2-eight.vercel.app/**`) als auch Container
  (`http://claude-box.orb.local:3000/**`) und localhost abdecken
- Three-Role-Enum: neue Signups landen via Trigger als `external`, Editor
  promotet manuell zu `author`/`editor`

### Supabase-Client-Module (`src/lib/supabase/`)

- `client.ts` — Browser-Client für Client Components (`createBrowserClient`)
- `server.ts` — Server-Client für Server Components, Route Handlers, Server
  Actions (`createServerClient` + `cookies()` aus `next/headers`)
- `proxy.ts` — Session-Refresh-Helper für Next.js 16 Proxy. Nicht direkt in
  Components verwenden; wird nur von `src/proxy.ts` genutzt.

Auth-Gate für `/autor/*` läuft als Server-Component-Layout (`src/app/autor/layout.tsx`),
nicht als Proxy-Logik — Proxy refresht nur die Session.

### Daten-Layer (`src/lib/`, seit Session C)

- `articleApi.ts` — Server-side Article-Queries (`getFeaturedArticles`,
  `getArticlesByCategory`, `getArticleBySlug`). Joined-Selects via PostgREST-
  Embedding (`*, category:categories(...), author:authors(...)`)
- `authorApi.ts` — Server-side Author-Queries (`getCurrentAuthor`,
  `getAuthorByHandle`, `getArticlesByAuthor`, `signOut`)
- `podcastApi.ts` — Server-side Podcast-Queries (`getPublishedPodcasts` mit
  optionalen Sprache-/Kategorie-Filtern, joined mit recommender-Author)
- `mappers/articleMappers.ts` — Mapper zwischen Article-Row und
  Card-Component-Props (`articleToCard`, `articleToListRow`,
  `authorToProfileViewModel`). Card-Components bleiben Supabase-frei.
- `mappers/podcastMappers.ts` — Mapper zwischen Podcast-Row und Card-VM
  (`podcastToCardVM`) plus `PODCAST_LANGUAGES`-Konstante (DE/EN/FR/IT).
- `markdownBlocks.ts` — Markdown→Block-Tree-Konverter. Extrahiert aus
  mockAuthorApi, damit BlockReader weiterhin TOC-Anker und Quote-Attribution
  rendert. Article-Detail-Page nutzt das.

### Schema-Erweiterungen (Session C)

**authors:** `handle`, `job_title`, `location`, `social_links` (jsonb),
`joined_at` (timestamptz)

**articles:** `is_featured` (für Homepage-Bento), `word_count` und
`reading_minutes` (auto-computed via Trigger bei body_md insert/update,
200 Wörter/Minute), `subcategory` (loose Label wie "AI in Banking",
"GenAI" — separat vom normalisierten category_id)

**Subcategory-Deviation vom Spec:** Initial-Schema hat nur Hauptkategorien
in `categories`-Tabelle. Listing-Pages und Card-UI brauchen aber feinere
Sub-Labels pro Artikel. `subcategory text` auf articles ist die pragmatische
Lösung; eine separate subcategories-Tabelle wäre für loose Display-Labels
overkill. Multi-Tag-Filter kommt ggf. in Session E.

### Listing-Pages (Session C)

`/ki-im-business` und `/future-tech` rendern Subcategory-Filter-Chips und den
Author-Block dynamisch aus den geladenen Articles:
- **Subcategories:** `distinct subcategory`, sortiert, "Alle" first.
  `categoryColors` bleibt hardcoded — unbekannte Subcategories rendern den
  Filter-Chip ohne Dot.
- **Author-Block:** Name + Avatar + Count pro Author aus der Article-Liste
  aggregiert, sortiert nach Count desc. Role/Job-Title wird bewusst nicht
  angezeigt (schränkt thematisch zu stark ein). Fallback bei fehlendem
  `avatar_url`: erster Buchstabe als Initiale im Avatar-Kreis.

**TODOs:**
- **Phase 8 — Trending-Chips:** aktuell rein UI ohne Klick-Logik. Braucht
  Tag-System (eigene Tabelle, m:n zu articles) + Trending-Metrik (Click-Counter).
- **Phase 8 — Author-Filter:** Author-Block-Klicks ohne Logik. Server-Side-Filter
  via URL-Param ist gegen aktuelle DB machbar, bisher nicht implementiert.

### Author-Routing-Split (Session C Fix-Up)

`src/app/autor/` ist in zwei Route-Groups gesplittet:

- `(public)/[slug]/` — öffentliche Author-Profile, kein Auth-Gate
- `(suite)/` — Author-Suite (Dashboard, Profil, Artikel, Podcasts, etc.) hinter
  Auth-Gate (`(suite)/layout.tsx` redirected auf `/login` wenn keine Session)

Route Groups sind URL-transparent: `/autor/ali-soy` bleibt `/autor/ali-soy`,
`/autor/dashboard` bleibt `/autor/dashboard`.

### Podcasts-Schema (Session D, drop+recreate)

Modell-Wechsel von "Host produziert Episoden" → "kuratierte Empfehlungen
externer Podcasts/Episoden". Alte `podcasts`-Tabelle (slug, audio_url,
episode_number, host_id) wurde via `drop table cascade` entfernt und neu
angelegt mit:

- `language text check (de/en/fr/it)`, `podcast_category text` (loose Label)
- `spotify_url text`, `apple_podcasts_url text` — keine eigenen Audio-Files
- `recommended_by_id uuid` (FK zu authors, on delete set null)
- `recommended_at timestamptz`, `is_published boolean default true`
- Kein Review-Workflow: Author publisht direkt, keine `status`-Enum

**RLS:** Public liest published, Author CRUD nur auf eigene (any
is_published), Editor `for all` über alle Rows. Externe Authors sind
DB-technisch erlaubt zu empfehlen — Einschränkung kommt ggf. später als
zusätzliche Policy. (Mock hatte `assertRecommenderEligible` — Frontend-only,
nicht enforced auf DB-Level.)

**TODO post-Session-D:** Cover-Bilder in Supabase Storage hochladen und
URLs in den 4 Seed-Rows aktualisieren (aktuell picsum-Placeholder).

### Seed-Daten (Session C)

23 Articles und 4 Authors aus Mock-Quellen geseedet:
- Ali Soy (editor): existierende Session-B-Row geupdated zu rich Profile
- Andreas Kamm, Matthias Zwingli, Marc Keller: Insert mit Placeholder-Emails
  (`@digital-age.ch` bzw. `@helvetia-ai.ch`). user_id null bis sie sich
  einloggen.
- **TODO Session D/E:** merge-on-first-login Logic im Auth-Trigger ergänzen,
  damit bei Login mit Placeholder-Email der existierende Row geclaimt wird
  statt zu kollidieren (slug/email-unique würde sonst PK-Violation werfen).
- **TODO Session F:** body_md für 17 Listing-Only-Articles ist Placeholder
  (Lorem-Ipsum + TODO-Marker). Echter Content kommt mit Editorial-Migration.

### Auth gegen Cloud

Login einmalig pro Container-Session via Access-Token aus
https://supabase.com/dashboard/account/tokens:

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...
```

CLI findet das Token automatisch. Token nicht ins Repo committen, nicht im
`.bashrc` persistieren.

## Sicherheit

- Service-Role-Key NIEMALS client-seitig
- Secrets nur in Vercel Env Vars / Supabase Dashboard, nie im Repo committen
- `.env.local` ist gitignored — bleibt lokal
- Im OrbStack-Container ist `--dangerously-skip-permissions` für Claude Code
  okay; auf dem Host nicht verwenden

## Troubleshooting: Browser zeigt nichts auf `claude-box.orb.local:3000`

Reihenfolge zum Debuggen:

```bash
# 1. Im richtigen Verzeichnis?
pwd
# Soll sein: /projekt/digital-age

# 2. Läuft ein Next-Server?
ps aux | grep next
# Wenn nur die grep-Zeile selbst erscheint: Server ist nicht gestartet

# 3. Auf welcher Adresse hört er?
# Im Server-Output (oder /tmp/nextdev.log bei Background-Start) MUSS stehen:
#   - Network: http://0.0.0.0:3000
# Wenn nur "Local: http://localhost:3000" → fehlt der --hostname-Flag

# 4. Antwortet der Server intern?
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
# 200 = Server läuft, Problem liegt am Hostname-Binding
# 000 oder leer = Server läuft nicht oder ist abgestürzt
```

URL im Browser muss exakt sein: **`http://claude-box.orb.local:3000`**
(`http://`, nicht `https://`, mit `:3000`).

## Antwortstil (für Claude Code)

- Direkt zur Sache, kein Preamble
- Keine Bestätigungs-Floskeln ("Perfekt!", "🎯", "Bereit?")
- Bei Erfolg: kurze 1-Satz-Bestätigung, dann Stop
- Push back, wenn etwas Suboptimales angefragt wird — ehrliches Feedback
- Bei Unsicherheit: nachschlagen, nicht raten

### Token-Effizienz

- Keine Pläne ankündigen, einfach machen — nur bei mehrdeutigen
  Anforderungen vorab klären
- Nach `str_replace` oder Edit: nicht den vollen Datei-Inhalt
  zurückgeben, nur bestätigen
- Diagnose-Befehle (ls, pwd, ps) nur bei konkretem Debug-Bedarf,
  nicht zur Orientierung zwischen Tasks
- Lange Outputs (Build-Logs, Server-Start) nicht vollständig spiegeln —
  nur Status und relevante Fehler-Zeilen
- Commit-Messages: kurz, Imperativ, eine Zeile, ohne Emojis und
  Co-Author-Footer
- Bei Iterations-Bedarf: nicht jedes Zwischenergebnis ausgiebig
  kommentieren, sondern weitermachen

## Bei Unsicherheit zu Anthropic-Produkten

Web-Suche auf:
- `anthropic.com` (insb. /news, /product)
- `claude.com` (insb. /product, /docs)
- `docs.claude.com`
- `support.claude.com`

Trainings-Cutoff ist Januar 2026 — bei neueren Features nicht raten.
