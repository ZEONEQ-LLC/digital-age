@AGENTS.md

# digital-age-v2 — Konventionen für Claude Code

## Projekt

News-Magazin für KI & Future Tech (DACH-Region). Aktueller Deploy:
`digital-age.ch` (Vercel). Cutover von WordPress/Hostpoint ist durch;
eingehende WP-URLs werden über `next.config.ts → redirects()` auf die
neuen Pfade umgeleitet. Der Vercel-Alias `digital-age-v2-eight.vercel.app`
bleibt erreichbar, ist aber nicht mehr primäre Domain.

## Stack

- Next.js 16.4.5 (App Router, src-dir, TypeScript)
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

## Container-Rebuild: Auth wiederherstellen

Beim Rebuild des `claude-box`-Containers gehen `gh`-Auth und
`SUPABASE_ACCESS_TOKEN` verloren. Auth-Persistierung via Volume-Mount ist
bewusst nicht eingerichtet — Rebuilds sind selten, der Mehrwert zu klein.
Nach jedem Rebuild manuell:

### gh CLI

```bash
gh auth login
```

Auswahl im interaktiven Flow:

- `GitHub.com`
- `HTTPS`
- `Yes` (authenticate with credentials)
- `Login with a web browser` → 8-stelligen Code merken, URL manuell im
  Mac-Browser öffnen, Code eingeben

Die Browser-Auto-Open-Meldung im Container ist harmlos — der Code-Flow
funktioniert per Hand.

Verifikation:

```bash
gh auth status
```

### SUPABASE_ACCESS_TOKEN

Token aus dem Supabase-Dashboard → Account → Access Tokens (oder
bestehenden wiederverwenden), dann:

```bash
export SUPABASE_ACCESS_TOKEN=<token>
```

Für Persistenz innerhalb der laufenden Container-Session in `~/.bashrc`
ergänzen — geht beim nächsten Rebuild wieder verloren, ist aber innerhalb
derselben Container-Lifetime stabil:

```bash
echo 'export SUPABASE_ACCESS_TOKEN=<token>' >> ~/.bashrc
```

Verifikation:

```bash
npx supabase projects list
```

### Wenn häufiger Rebuilds nötig werden

Dann auf Volume-Mount-basierte Persistierung umsteigen: `~/.config/gh`
als Volume mounten und `SUPABASE_ACCESS_TOKEN` aus einer Env-Datei laden.
Aktuell bewusst nicht eingerichtet — Aufwand-Nutzen-Verhältnis stimmt
bei der geringen Rebuild-Häufigkeit nicht.

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

## Datenmodell

Phase 7 abgeschlossen — alle Public- und Author-Suite-Pages laufen seit
Session E gegen Supabase. Mock-APIs sind vollständig entfernt:

- ~~`mockAuthorApi.ts`~~ — entfernt in Session E, ersetzt durch `@/lib/authorApi`
  (Reads) + `@/lib/authorActions.ts` (Server-Action-Mutationen)
- ~~`mockPodcastApi.ts`~~ — entfernt in Session E, ersetzt durch
  `@/lib/podcastApi` + `@/lib/podcastActions.ts`
- ~~`articleSlugRegistry.ts`~~ — entfernt in Session E (Slug-Lookup über
  `getArticleBySlug` in articleApi)
- `@/types/blocks.ts` — übrig gebliebener `Block`-Type für Editor/Renderer
  (Markdown ↔ Block-Tree über `@/lib/markdownBlocks`)

**Out-of-scope, bleibt vorerst Mock-UI:**
- `/artikel-pitchen` — Pitch-Formular zeigt nach Submit eine Success-UI,
  persistiert aber nicht. Anonymous-Insert-Flow braucht eigenes Design
  (Rate-Limit, Email-Bestätigung, Anti-Spam) — Session F+.

### Three-Role Author-Modell

`Author.type` ist eine von drei Rollen:

- `external` — Pitcher ohne Login. Kein Dashboard, keine CRUD-Rechte.
  Reichen einmalig über `/artikel-pitchen` ein.
- `author` — Stammautor mit Login. CRUD nur auf eigene Articles und
  Podcast-Empfehlungen.
- `editor` — Redaktion/Admin mit Login. CRUD auf alles, plus
  Reassignment von Empfehlern (Podcast-Empfehlungen können auf andere
  interne Authors umgehängt werden).

Externe Authors können niemals Podcast-Empfehler sein — RLS-Policy
`podcasts_internal_author_insert/update` enforced das DB-seitig (Session D
Fix-up). Article-Insert ist Authors+Editors vorbehalten, mit
Status-Gating (Authors nur draft → in_review, Editors alles inkl. published/
archived). Siehe `articles_*` Policies in den Session-E-Migrations.


## Supabase

**Workflow: Cloud-Only** — kein lokales Postgres, kein `supabase start`,
kein Docker. Begründung: `claude-box` ist ein OrbStack-Linux-VM-Container,
Docker-in-Container hätte Reibung gebracht; Free-Tier-Cloud reicht für
Phase 7 vollständig aus.

- **Projekt:** `digital-age db` · Region `eu-central-1` · Free-Tier
- **Project Ref:** in `.env.local` als `SUPABASE_PROJECT_REF` (nicht im Repo)
- **Dashboard:** https://supabase.com/dashboard/project/<project-ref>

### Befehle (Cloud-Only)

```bash
npx supabase migration new <name>      # neue SQL-Migration anlegen
npx supabase db push                   # alle pending Migrations auf Cloud deployen
npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" > src/lib/database.types.ts
```

- Migrations sind versioniert in `supabase/migrations/`, sind Source-of-Truth
- Vor `db push` lokal das SQL nochmal lesen — Rollback ist teurer als Vorsicht
- Nach Schema-Änderung Types regenerieren, sonst läuft TypeScript schief
- RLS auf allen Tabellen aktiv — keine Ausnahmen

### Storage

**Bucket `avatars`** — public-read, RLS-geschützt write.
- Pfad-Konvention: `<author_id>/<timestamp>.jpg`
- Bucket-Limit: max 2 MB, JPEG/PNG/WebP
- Cleanup: Altes Avatar wird beim Upload via `uploadAvatar`-Server-Action gelöscht
- Upload-Flow: `src/lib/storageActions.ts → uploadAvatar(authorId, formData)`
- Next.js Image: `*.supabase.co/storage/v1/**` in `remotePatterns`

**Avatar-Storage (Free-Tier-Anpassung):** Client resized via Canvas auf
512×512 JPEG quality 0.85 (~80–120 KB) bevor die Datei zum Server geht.
Supabase Image-Transformation-API ist NICHT auf Free-Tier verfügbar
(Render-Endpoint wirft `FeatureNotEnabled`), daher Object-Endpoint
(`/storage/v1/object/public/...`) statt Render-Endpoint. Bei Upgrade auf
Pro könnte server-side Transformation reaktiviert werden für
Retina-Variants oder Crop-Optionen — `uploadAvatar` müsste dann
`getPublicUrl(path, { transform })` zurückbringen.

**Bucket `articles`** — public-read, RLS-geschützt write (Phase 8a).
- Pfad-Konvention: `<article_id>/<filename>`, Filename-Pattern
  `<shortUuid>-<slugifiedOriginalName>.<ext>` (z.B. `a3f8c2e1-mountain-sunset.webp`)
- Bucket-Limit: max 5 MB, JPEG/PNG/WebP/GIF, plus video/mp4 (nur für
  Hero-Studio-Animationen per Direkt-Upload aus dem Browser; die Server-
  Whitelist in `uploadArticleImage` bleibt ein reiner Bild-Upload)
- Compression: client-seitig via `browser-image-compression` (max 2400px,
  quality 0.85, Ziel-Output WebP < 500 KB; GIFs durchlaufen ohne Compression
  damit Animation erhalten bleibt)
- Upload-Flow: `src/lib/storageActions.ts → uploadArticleImage(articleId, formData)`,
  Auth doppelt-gated (Application-Layer Owner-Check + Storage-RLS-Policy)
- Cleanup-Cascade: `deleteArticle` in `authorActions.ts` ruft
  `deleteAllArticleImages(id)` vor dem DB-Delete (Option B, kein DB-Trigger)
- Orphan-Cleanup: Edge Function `supabase/functions/cleanup-orphan-drafts/`
  findet Drafts mit `title='Unbenannter Artikel'`, `body_md=''`,
  `updated_at < now() - 7d` und löscht Row + Storage-Files. Deploy + Cron-
  Schedule manuell (Dashboard), siehe README in der Function.

**Helper-Functions (in Migrations definiert):**
- `public.current_author_id()` — gibt `authors.id` für `auth.uid()` zurück
- `public.is_editor()` — boolean, ob aktueller User Editor-Rolle hat
- `public.can_modify_article_image(article_id_text text)` — boolean, true
  wenn User Editor ist oder der Article ihm gehört. Akzeptiert text, fängt
  ungültige UUID-Casts intern → liefert `false` statt zu werfen.

Alle sind `SECURITY DEFINER` mit `search_path = public`, damit Storage-RLS-
Policies sie sicher aufrufen können ohne Recursion-Risk.

**Editor-Override für Avatare:** RLS-Policies erlauben Editoren bereits
fremde Avatare zu schreiben (`is_editor()` Branch in den storage.objects
WITH-CHECK-Clauses). UI dafür folgt in einer Folge-Session.

**Wichtig — `/autor/artikel/neu`:** Der Route Handler erzeugt SOFORT einen
Draft in der DB (für die `article_id`, die der Storage-Pfad braucht). Alle
Links auf diese Route MÜSSEN `prefetch={false}` setzen, sonst erzeugt das
Next.js-Hover-/Viewport-Prefetch leere Drafts. Aktuelle Links in
`(suite)/artikel/page.tsx` und `(suite)/dashboard/page.tsx` sind korrekt.

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
- Auth-Settings im Dashboard: Site URL + Redirect URLs müssen seit dem
  Cutover die Production-Domain (`https://digital-age.ch/**`) plus den
  bestehenden Vercel-Alias (`https://digital-age-v2-eight.vercel.app/**`,
  zusätzlich für Notfälle) sowie Container (`http://claude-box.orb.local:3000/**`)
  und localhost abdecken
- Three-Role-Enum: neue Signups landen via Trigger als `external`, Editor
  promotet manuell zu `author`/`editor`

### Self-Registration entfernt (PR A — Auth-Flow-Cleanup)

Self-Registration ist **kein** unterstützter Flow mehr. Onboarding läuft
ausschließlich über Editor-Invites (kommt mit PR B Editor-Author-Management).

Entfernte Legacy-Mock-Pages (Phase-5-Reste, alle ohne State-Backing):

- `/registrieren` — Two-Step-Mock (Email+PW Form, Platzhalter-Submit)
- `/autor/profil-erstellen` — Schritt 2/2 des Mock-Chains, Mock-Profil-Form
- `/autor/wartezimmer` — Mock-Status-Page mit hardcodedem Datum

**Wartezimmer-Entscheidung:** komplett gelöscht (statt Stub/Wiederverwendung).
Begründung: reine Mock-UI, kein State-Backing, keine externen Refs außer der
Mock-Chain selbst. Der Invite-Flow in PR B nutzt einen separaten Token-Pfad
(`/onboarding?token=...`), nicht `/wartezimmer` — eine generische "wartet auf
Prüfung"-Anzeige passt dort UX-mässig nicht (Token-basierte Page hat anderen
State und andere Copy).

**Login-Page-CTA** wurde von "Noch kein Konto? Jetzt registrieren" auf
"Du willst Author werden? Pitch deinen Artikel →" (Link auf `/artikel-pitchen`)
umgestellt.

### Editor-Admin-Section (PR B)

Editors haben eine zusätzliche **Admin**-Sektion in Sidebar (Desktop) und
TopNav (Tablet), bedingt sichtbar via `author.userRole === 'editor'`. Routen:

- `/autor/admin/artikel` — Alle Artikel cross-author mit Status-Tabs,
  Filter (Author / Kategorie) und Sort (Datum asc/desc). Klick auf Row
  öffnet den regulären Artikel-Editor.
- `/autor/admin/autoren` — Author-Liste mit Add-Modal (zwei Modi) + Edit-Drawer
- `/autor/admin/einladungen` — Invite-Übersicht mit Status-Filter und
  Copy/Revoke/Resend-Actions

**Gating:** `src/app/autor/(suite)/admin/layout.tsx` redirected non-editors auf
`/autor/dashboard`. RLS doppelt-gated on DB-Level (s.u.).

### Editor-Tools (PR 2a)

- **Author-Zuweisung pro Artikel:** Im Artikel-Editor sieht der Editor in
  der Sidebar einen Dropdown `Author` (zwischen Veröffentlichungsdatum und
  Statistiken). Server-Action `updateArticleAuthor` in
  `authorAdminActions.ts`, RLS via bestehende `articles_editor_all` Policy.
- **Avatar-Upload für fremde Authors:** `AvatarUploadBlock` wird im
  EditAuthorDrawer oberhalb des Anzeigename-Felds gerendert. Nutzt die
  bestehende `uploadAvatar`-Server-Action (Own-or-Editor-Check schon drin),
  Storage-Policy `avatars_*_own_or_editor` deckt's auf DB-Ebene ab. Cache-
  Bust via `?t=<ts>`-URL-Param.
- **Alle-Artikel-Listing:** neue Page `/autor/admin/artikel` mit Status-
  Tabs, Author-/Category-/Sort-Filtern. Eigener Filter-Bar oberhalb der
  Listing-Rows. Reset-Button nur sichtbar wenn Filter aktiv.

### Featured & Spotlight (PR 2b)

- **DB:** `articles.is_hero boolean` neu (is_featured existiert seit
  Initial-Schema). Constraint `hero_must_be_featured` (Hero impliziert
  Featured). Partial-Unique-Index `one_hero_per_category` für max 1 Hero
  pro Kategorie. Max-3-Featured pro Kategorie wird im Server-Action-Layer
  enforced, NICHT in der DB.
- **Server-Action** `updateFeaturedStatus(articleId, featured, hero,
  forceReplace?)` in `authorAdminActions.ts`. Returns Discriminated-Union
  mit Codes `MAX_FEATURED_REACHED` / `HERO_CONFLICT` (mit existing-Daten)
  / `UNAUTHORIZED` / `INVALID`. Bei HERO_CONFLICT zeigt UI Bestätigungs-
  Dialog, ruft mit `forceReplace=true` erneut auf → bisheriger Hero wird
  zurückgesetzt vor neuem Set (Partial-Unique-Index sonst).
- **Auto-Reset:** `saveArticle` setzt Featured/Hero auf false wenn
  `category_id` wechselt; `archiveArticle` setzt beide auf false. UI im
  Editor zeigt zusätzlich Confirmation-Dialog beim Kategorie-Wechsel.
- **Editor-UI:** Featured-Section in der Artikel-Sidebar zwischen
  Veröffentlichungsdatum und Author. Beide Checkboxen, Hero disabled
  wenn nicht Featured. Hero-Replace-Dialog zeigt Link zum aktuellen Hero.
- **Public-UI:**
  - `SpotlightSection.tsx` rendert bis zu 3 Featured-Cards in einer Grid.
  - Kategorie-Pages (`/ki-im-business`, `/future-tech`) zeigen Spotlight
    oben mit `getFeaturedByCategory(slug, 3)`. Section verschwindet bei
    0 Featured.
  - Homepage zeigt 2-Card-Spotlight direkt nach `HeroBold`. `BentoGrid`
    wurde entfernt — Hero im Spotlight + restliche Artikel in den
    Kategorie-Sections decken das gleiche Ziel ab.
  - Kategorie-Sections auf der Homepage filtern Hero-Featured raus
    (`getArticlesByCategory(..., { excludeHero: true })`) damit jeder
    Artikel max einmal auf der Homepage erscheint.
- **Admin-Listing-Badges:** `HERO` (orange solid) bzw. `FEATURED` (orange
  outline) neben dem Status-Badge in `/autor/admin/artikel`. Zusätzlicher
  Filter "Featured: Alle / Nur Featured / Nur Hero / Nicht featured".
- **Default-Cover-Bild:** Artikel ohne `cover_image_url` (z.B. Legacy-
  Artikel aus 2020/2021 die im WP keine Cover hatten) zeigen
  `/images/defaults/article-cover-default.png`. Zentraler Helper
  `getCoverUrl(article)` in `src/lib/coverImage.ts` — überall verwenden
  wo Cover gerendert wird (Listing-Cards via Mapper, Detail-Page-Hero,
  Admin-Listing, Dashboard, Author-Public-Profile).

### Tag-System Foundation (PR T1)

- **DB:** Tabellen `tags` (slug-unique, name, timestamps) und `article_tags`-
  Junction. Backwards-Compat: `articles.tags text[]` bleibt erhalten und
  wird parallel gepflegt — Cleanup in Folge-PR sobald T2 + T3 produktiv.
- **RLS:** `tags_public_read` für anon, `tags_author_insert` für authenticated
  authors (Editor-Save-Flow legt neue Tags an), `tags_editor_update/delete`
  für Editor-Rolle. `article_tags`: public-read, Author kann Junctions für
  eigene Articles managen, Editor für alle.
- **Migrations-Skript** `migration/migrate-tags.ts` (zwei Phasen):
  - `--export` → schreibt `migration/tag-export.json` (sortiert nach
    Häufigkeit). User reviewt + legt `migration/tag-merge-mapping.json`
    an (Synonym-Map: `{ "AI Agents": "Agentic AI" }`).
  - `--apply` → upserted Tags, befüllt Junction, schreibt parallel
    `articles.tags[]` mit kanonischen Namen (Backwards-Compat).
- **Editor-UI:** `TagInput.tsx` ist ein Autocomplete-Pill-Input. Sucht via
  `searchTags`-Server-Action in der `tags`-Tabelle (`ilike` auf name).
  Suggestion-Dropdown listet bis zu 8 Matches plus „+ Neuer Tag „xyz""-
  CTA. Enter/Tab/Komma fügen Pille hinzu, Backspace bei leerem Input
  entfernt letzte Pille, ESC schliesst Dropdown.
- **Save-Flow:** `saveArticle` ruft `syncArticleTags()` nach dem Article-
  Update. Slugify-Logik identisch zum Migrations-Skript. Junction wird
  komplett neu gesetzt (delete-all + insert) — pro Article max 1 Schreib-
  zyklus, einfach + atomar genug für unsere Scale.

T3 (Admin-Tag-Verwaltung mit Merge/Rename/Delete) folgt.

### Tag-System Public-Frontend (PR T2)

- **Routen:**
  - `/tag/[slug]` — Tag-Detail-Page mit chronologischer Artikel-Liste
    (max 50). SSG via `generateStaticParams`; bei Neutags zwischen zwei
    Builds rendert Next.js on-demand. `generateMetadata` setzt Title +
    Description. 404 via `notFound()` bei unbekanntem Slug.
  - `/tags` — Alphabetische Pill-Cloud aller Tags ohne Count-Badges.
    Render dynamisch (kein SSG nötig).
- **Helper-Modul** `src/lib/tags.ts`:
  - `getAllTags()`, `getTagBySlug(slug)`, `getTopTags(limit=5)` (über RPC),
    `getArticlesByTagSlug(slug, limit)` (Zwei-Step: tag-id auflösen,
    junction-Filter, articles mit Standard-Relations laden).
- **Postgres-Funktion** `get_top_tags(limit_count)` (Migration
  `20260514205726_top_tags_function.sql`): `SECURITY DEFINER`, EXECUTE
  für anon+authenticated. Aggregiert tags über published Articles,
  sortiert count DESC, name ASC. Global, all-time, kein Zeitfenster.
- **Top-Themen-Sidebar** in `TopicListing`-Komponente: neuer optionaler
  `topTags`-Prop, gerendert als Section ZWISCHEN Kategorien und Autoren
  (Reihenfolge: Kategorien → Top Themen → Autoren → Newsletter). Nur in
  `/ki-im-business` und `/future-tech` verdrahtet. Pills sind Links auf
  `/tag/[slug]`, kleiner monospace-Count daneben. "Alle Themen →"-Link
  unter den Pills auf `/tags`.
- **Klickbare Tag-Pills** im Artikel-Detail (`/artikel/[slug]`): die
  bestehenden Mono-Pills (`article.tags[]`) sind jetzt Links auf
  `/tag/[slugifyTag(name)]` via `src/lib/tagSlug.ts` (gleiche Slugify-
  Logik wie im Migrations-Skript und `syncArticleTags`).
- **Build-Hinweis:** `generateStaticParams` in `/tag/[slug]` darf den
  ssr-Client (`createClient`) NICHT verwenden, weil der intern
  `cookies()` aufruft (build-time verboten). Statt dessen direkt
  `@supabase/supabase-js` mit `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`.
  Falls die Env-Vars beim Build fehlen (lokal ohne `.env.local`),
  returnt die Funktion `[]` und Next rendert alle Slugs dynamisch.
- **Bewusst nicht in T2:** Tag-Cloud auf der Homepage, Top-Tags-Sidebar
  auf anderen Public-Pages, echtes Trending mit Zeitfenster, Related-
  Tags, Tag-Admin-UI (kommt in T3), Tags auf Article-Cards.

### Tag-System Admin-Verwaltung (PR T3)

Editor-Self-Service für Rename / Merge / Delete von Tags. Damit ist das
Tag-System komplett (T1 Foundation, T2 Public-Frontend, T3 Admin).

- **Route:** `/autor/admin/tags` — Editor-only via bestehendem
  `(suite)/admin/layout.tsx`-Gate (kein zusätzlicher Check nötig).
- **UI:** Suche (Name + Slug, case-insensitive), sortierbare Tabelle
  (Default: Article-Count DESC, Name ASC), Mobile-Card-Layout <768px.
  Action-Buttons pro Row: Rename / Merge / Löschen.
- **Audit-Log:** `tag_audit_log`-Tabelle (Migration
  `20260514212235_tags_admin.sql`). Append-only, kein UPDATE/DELETE-
  Policy. SELECT nur für Editor (`tag_audit_log_editor_read`). `tag_id`
  ist BEWUSST kein FK — bei delete/merge bleibt der Audit-Eintrag
  bestehen. `merged_into_tag_id` referenziert tags(id) mit
  `on delete set null`.
- **Postgres-Functions** (alle SECURITY DEFINER, search_path=public,
  EXECUTE für authenticated, interner Editor-Check via `public.is_editor()`):
  - `rename_tag(p_tag_id, p_new_name)` — regeneriert Slug aus Name
    (identische Slugify-Logik wie `src/lib/tagSlug.ts`), Conflict-Check
    auf `slug`, Update `tags.name+slug+updated_at`, parallel-Update
    `articles.tags[]` via `array_replace`, Audit-Insert. Returnt
    `{success, new_slug, affected_count}`.
  - `merge_tags(p_from_id, p_to_id)` — Junctions umhängen via
    `INSERT … ON CONFLICT DO NOTHING` + DELETE der Source-Junctions,
    `articles.tags[]` dedupliziert (`array_remove(from) || [to]` →
    `array_agg(distinct …)`), Source-Tag löschen, Audit-Insert.
  - `delete_tag(p_tag_id)` — `articles.tags[]` updaten, Junctions +
    Tag löschen, Audit-Insert.
- **Server Actions** (`src/lib/admin/tagOperations.ts`): `renameTag`,
  `mergeTag`, `deleteTag`. Rufen die RPCs, mappen Postgres-Errorcodes
  (`23505` → "Slug bereits vergeben", `42501` → "Nur Editoren …",
  `P0002` → "Tag nicht gefunden", `22023` → "Name darf nicht leer
  sein"), revalidieren `/autor/admin/tags`, `/tags`, `/tag/[new-slug]`
  und die Listing-Pages mit Top-Themen-Sidebar
  (`/ki-im-business`, `/future-tech`).
- **Modals** (`src/components/admin/`):
  - `RenameTagModal` — Slug-Vorschau live, Warnung bei Slug-Wechsel
    inkl. 404-Hinweis für alte URL.
  - `MergeTagModal` — Single-Select-Autocomplete via bestehender
    `searchTags`-Server-Action (Reuse aus T1), zeigt Affected-Count
    vor Bestätigung.
  - `DeleteTagModal` — Type-to-confirm-Pattern (Tag-Name muss exakt
    getippt werden, GitHub-Style).
- **Audit-Log-Anzeige:** `TagAuditLog`-Komponente unter der Tabelle,
  letzte 20 Operationen. Actor-Name kommt aus separater
  authors-Query (`user_id IN (...)` → `display_name`), weil
  `auth.users` nicht direkt joinbar ist.

### Newsletter-Backend (Phase 9)

DSGVO-konformes Backend für Newsletter-Anmeldungen. Confirmation-Flow ist
schema-bereit (Token wird pro Subscriber generiert), aber **inaktiv** bis
Resend in einem späteren PR aufgeschaltet wird — alle Anmeldungen bleiben
vorerst `status='pending'`.

- **Tabelle `newsletter_subscribers`** (Migration `20260515150547_newsletter.sql`):
  - `email` ist UNIQUE, beim Insert lowercase-normalisiert in der Server Action,
    plus zusätzlicher Index auf `lower(email)` für case-insensitive Lookups.
  - `email_domain` ist eine **STORED Generated Column**
    `lower(split_part(email,'@',2))` — automatisch beim Insert berechnet.
    Postgres 12+, Supabase-supported. In TS-Types erscheint sie als
    optionales Insert-Feld; wir setzen es nie und überlassen es der DB.
  - `status` check (`pending` / `confirmed` / `unsubscribed`)
  - `source` check (`footer` / `inline` / `full` / `sidebar`)
  - `consent_at` + `consent_text` als DSGVO-Beweispflicht: wer hat WANN
    welchen WORTLAUT abgesegnet (CONSENT_TEXT-Konstanten in
    `NewsletterSignup.tsx`).
  - `ip_hash` ist die SHA-256-gehashte IP mit Server-Salt
    (`NEWSLETTER_IP_HASH_SALT`), nie Klartext.
  - `confirmation_token` wird pro Insert generiert, bleibt unbenutzt bis
    Resend-Flow kommt.

- **Tabelle `newsletter_signup_attempts`** (gleiche Migration): nur für
  serverseitiges Rate-Limiting. Index auf `(ip_hash, attempted_at DESC)`.
  RLS aktiv, KEINE Policies — nur Service-Role-Client (Server Action)
  schreibt + liest. Cleanup opportunistisch: bei jedem Insert werden
  Einträge >24h alt mit-gelöscht (kein Cron).

- **RLS:** SELECT/UPDATE auf `newsletter_subscribers` nur für Editor
  (`is_editor()` aus T1-Migration). KEIN DELETE-Policy — Unsubscribe
  setzt nur `status='unsubscribed'` + `unsubscribed_at`. Subscriber-
  History bleibt für Audit. Inserts laufen ausschliesslich über die
  Server Action mit Service-Role-Key, der RLS bypasst.

- **Server Action `subscribeToNewsletter`**
  (`src/lib/newsletter/subscribe.ts`):
  - Honeypot-Check (`honeypot`-Feld in allen Form-Varianten, hidden via
    `position: absolute; left: -9999px`) — gefüllt = Bot → silent success.
  - Email-Validation: `^[^\s@]+@[^\s@]+\.[^\s@]+$`, max 320 Zeichen, lowercase.
  - Consent-Check: `consent !== true` → Error.
  - Rate-Limit pro IP-Hash: ≤5/1h und ≤20/24h. Über-Limit → silent success.
  - On unique-Conflict (Duplikat-Email): silent success (Privacy:
    keine Email-Enumeration via Probe-Requests).
  - Nutzt `createServiceClient()` aus `src/lib/supabase/service.ts`
    (`SUPABASE_SERVICE_ROLE_KEY`), nicht den ssr-Client. RLS-bypass ist
    absichtlich, da keine anon-INSERT-Policy existiert.

- **Komponente `NewsletterSignup.tsx`**: 4 Varianten (compact = Footer,
  inline = Artikel-CTA, full = `/newsletter`, sidebar = TopicListing).
  Alle haben Honeypot + Einwilligungs-Checkbox + Datenschutz-Link.
  `consentText` ist als Konstante pro Variant gepflegt und wird mit dem
  Insert persistiert. Submit-Button bleibt disabled bis Email valid +
  Checkbox checked. Success-Verhalten:
  - `full` / `inline`: Redirect auf `/newsletter/danke`.
  - `compact` / `sidebar`: Inline-Success-Message (Footer-/Sidebar-Redirect
    wäre für den User unangenehm).

- **`TopicListing`-Sidebar**: hardcoded Form weg, `<NewsletterSignup
  variant="sidebar" />` rein. Damit hat die Sidebar-Anmeldung die gleiche
  DSGVO-Behandlung wie die anderen Touchpoints. Der bisher unused
  `newsletter`-Prop auf `TopicListing` wurde gestrichen, ebenso in
  `/ki-im-business` und `/future-tech`.

- **`/newsletter/danke`-Copy** angepasst auf "Wir haben deine Anmeldung
  erhalten. Sobald wir den E-Mail-Versand aufschalten, schicken wir dir
  eine Bestätigungs-Mail…" — kein "wir haben dir eine Mail geschickt"
  mehr, solange Resend noch nicht da ist.

- **Admin-View `/autor/admin/newsletter`** (Editor-only via
  `(suite)/admin/layout.tsx`-Gate):
  - Status-Tabs (Alle / Pending / Confirmed / Unsubscribed) mit Counts.
  - URL-State via `?status=...&sort=...` (router.push).
  - Sortierung: `created_at` desc (default), `email` asc, `status` asc.
  - Tabelle Desktop / Card-Layout <768px.
  - **CSV-Export** client-seitig: aktuell sichtbare gefilterte Rows,
    Filename `newsletter-subscribers-<YYYY-MM-DD>-<status>.csv`.
  - **Unsubscribe-Action** (`unsubscribeSubscriber` Server Action) mit
    Confirm-Dialog. Setzt nur `status='unsubscribed'` + Timestamp, löscht
    nichts.

- **Env-Variable** `NEWSLETTER_IP_HASH_SALT` (32-byte hex, z.B.
  `openssl rand -hex 32`) muss in Vercel + `.env.local` gesetzt sein.
  Ohne Salt wird kein IP-Hash gespeichert und das Rate-Limit greift
  pro-Request (nicht pro-IP).

### Resend-Integration (Phase 10)

Aktiver Email-Versand für Newsletter-Lifecycle + Invite-Automation. React-
Email als Template-Stack. Auth-Magic-Link-Mails laufen separat über
Supabase Custom SMTP (Dashboard-Config), nicht über diese Integration.

- **Migration `20260515173722_newsletter_token_expiry_and_rate_limit_action.sql`:**
  - Neue Spalte `newsletter_subscribers.confirmation_expires_at timestamptz
    NOT NULL DEFAULT now() + interval '7 days'`. Keine Generated Column —
    Postgres lehnt `timestamptz + interval` als STABLE statt IMMUTABLE ab.
    `created_at` und `confirmation_expires_at` haben beide `now()` als
    Default und sehen denselben Transaktions-`now()`-Wert beim Insert,
    differieren also exakt um 7 Tage.
  - Partial-Index nur auf `WHERE status='pending'`.
  - `newsletter_signup_attempts.action` mit CHECK in (`subscribe`,
    `unsubscribe`) damit beide Rate-Limit-Pools sauber getrennt sind.
    Composite-Index `(action, ip_hash, attempted_at DESC)`.

- **Email-Templates** (`src/emails/`):
  - `_layout.tsx` ist die geteilte Basis: Light-Default-Styles inline +
    Dark-Override per `@media (prefers-color-scheme: dark)` im `<Head>`
    mit `!important` auf jeder Color-Property (Inline-Styles haben sonst
    höhere Spezifität). Semantische Klassen `.heading`, `.text-primary`,
    `.text-muted`, `.cta-button`, `.accent-link`, `.hint-box`,
    `.hint-strong`, `.hint-text`, `.footer-text`, `.url-text`,
    `.divider`. Color-Scheme-Meta-Tags + Outlook-Web-Hard-Dark-Mode-
    Schutz via `[data-ogsc]`-Selector. Wiederverwendbare Subkomponenten
    `Heading`, `Paragraph`, `CtaButton`, `HintBox`, `UrlFallback`. Text-
    Logo statt Bild (`digital-age` + Accent-`.ch`).
  - `NewsletterConfirmation.tsx` — Subject "Bestätige deine Anmeldung
    bei digital-age", 7-Tage-Hinweis.
  - `NewsletterWelcome.tsx` — Subject "Willkommen bei digital-age", CTA
    auf `/` (Homepage = beste Discovery), Unsubscribe-Link im Footer-
    Bereich mit demselben Token.
  - `AuthorInvite.tsx` — Subject "Einladung: Werde Autor bei digital-age",
    14-Tage-Hinweis, Rolle wird im Text genannt.

- **Mail-Versand-Modul** `src/lib/newsletter/mail.ts`:
  - `import "server-only"` erzwingt Server-Kontext.
  - `sendConfirmationMail`, `sendWelcomeMail`, `sendInviteMail` rendern
    das jeweilige React-Email-Template via `@react-email/render` und
    versenden über Resend SDK.
  - Fehler werden geloggt, NICHT geworfen — Caller bekommt
    `{ ok: false, error }` zurück und entscheidet selbst (z.B. Subscriber
    bleibt `pending`, Editor sieht Clipboard-Fallback).
  - `SITE_URL` aus `NEXT_PUBLIC_SITE_URL`, sonst Preview-Fallback.

- **Newsletter-Lifecycle:**
  - `subscribeToNewsletter` selektiert nach Insert den
    `confirmation_token` zurück und ruft `sendConfirmationMail`. Bei
    Mail-Failure bleibt der Subscriber als `pending` — User sieht
    trotzdem Success-UI (Privacy: kein Email-Enumeration-Vector).
  - Route `/newsletter/confirm/[token]/page.tsx`: Service-Role-Lookup,
    UUID-Format-Check, Status-Check (pending → confirmed +
    `confirmed_at`, idempotent bei bereits confirmed, Redirect zu
    `/newsletter/abgelaufen` bei unbekannt/expired/unsubscribed),
    `sendWelcomeMail` fire-and-forget.
  - Route `/newsletter/abmelden/[token]/page.tsx`: Server-Component
    lookt Subscriber + maskiert Email (`r***@zeoneq.com`-Pattern). Bei
    bereits unsubscribed direkter Redirect auf `/newsletter/abgemeldet`.
    Confirm-Button als Client-Component → ruft
    `unsubscribeByToken`-Server-Action.
  - `unsubscribeByToken` (`src/lib/newsletter/unsubscribePublic.ts`):
    UUID-Check, Rate-Limit (10 Versuche / IP / 1h via
    `action='unsubscribe'` in `newsletter_signup_attempts`), Setzt
    `status='unsubscribed'` + `unsubscribed_at`. Kein Expiry-Check —
    Abmeldung muss jederzeit funktionieren (DSGVO).
  - Bestätigungs-Pages `/newsletter/bestaetigt`, `/newsletter/abgelaufen`,
    `/newsletter/abgemeldet` als statische Server-Pages, gleicher
    Look-and-Feel wie `/newsletter/danke`.
  - `/newsletter/danke` Copy auf "Bestätigungs-Mail ist unterwegs" +
    7-Tage-Hinweis aktualisiert.

- **Admin-View Erweiterung** (`/autor/admin/newsletter`):
  - Neue Spalte "Expiry" für Pending-Rows (`<24h`, `1 Tag`, `5 Tage`,
    `Abgelaufen`-Status mit Farbcode). Confirmed/Unsubscribed: "—".
  - CSV-Export bekommt `confirmation_expires_at` mit dazu.
  - Mobile-Card zeigt Expiry-Hint nur bei Pending.

- **Invite-Automation:**
  - `dispatchInviteMail`-Helper in `inviteActions.ts` ruft
    `sendInviteMail` und fängt Errors als `mailSent: false`.
  - `createInvite`, `createAuthorWithInvite`, `resendInvite`,
    `generateInviteForExistingPlaceholder` returnen jetzt zusätzlich
    `mailSent: boolean`. DB-Insert bleibt erfolgreich, auch wenn der
    Mail-Versand scheitert — Token bleibt nutzbar.
  - `AdminInvitesClient.tsx` zeigt `info`-Banner mit "Einladung versendet"
    bzw. "Mail-Versand fehlgeschlagen, Clipboard-Copy nutzen".
  - `AdminAuthorsClient.tsx` zeigt im Success-Modal von
    `createAuthorWithInvite` und im Placeholder-Banner von
    `generateInviteForExistingPlaceholder` den Mail-Status; Clipboard-
    Buttons bleiben sichtbar als Fallback-Kanal.

- **Env-Variablen** (alle in Vercel als `Sensitive` markiert):
  - `RESEND_API_KEY` — Resend API-Key
  - `NEWSLETTER_FROM_EMAIL` — z.B. `digital-age <redaktion@digital-age.ch>`
  - `NEWSLETTER_REPLY_TO` — z.B. `digital-age@zeoneq.com`
  - `NEXT_PUBLIC_SITE_URL` — Public, Production-Domain; Fallback ist die
    Preview-URL.

### Form-Mail-Logic (Phase 10b — Kontakt + Pitch)

- Vorher reine UI-Mocks. `/kontakt` und `/artikel-pitchen` schreiben jetzt
  in DB und versenden Mails über Resend. Block 2 (AI-Prompt + Swiss-AI
  Submission-Lifecycle) und Block 3 (Article-Workflow) folgen in eigenen PRs.

- **Migration `20260515220741_contact_messages_and_article_pitches.sql`:**
  - `contact_messages` (name/email/topic/organization/message/ip_hash/
    status/notes/timestamps). Status: `new`/`replied`/`archived`.
  - `article_pitches` mit reichem Schema, das den bestehenden 3-Step-Form
    abbildet (title, excerpt, body_md, category, author_*, author_website).
    Status: `new`/`reviewing`/`accepted`/`rejected`. `original`+`editorial`-
    Checkboxen sind reine Acceptance-Gates (Form-Validation), NICHT persistiert.
  - RLS: Editor-only SELECT/UPDATE, kein public-read/delete. Inserts laufen
    via Service-Role aus den Server Actions.
  - Rate-Limit-Tabelle `newsletter_signup_attempts.action`-CHECK erweitert
    um `contact` + `pitch`.

- **Shared Rate-Limit-Helper** (`src/lib/rate-limit.ts`): `hashIp`,
  `getRequestContext`, `checkRateLimit(action, perHour, perDay)`, `logAttempt`.
  Filtert immer nach `action` damit Pools sich nicht gegenseitig blockieren.
  Verwendet von neuen Contact/Pitch-Submits. Bestehende `subscribe`/
  `unsubscribe`-Pfade bleiben mit ihrer inline-Logik (kein Refactor in
  diesem PR — risikoarm).

- **Server Actions:**
  - `src/lib/contact/submit.ts → submitContactMessage(input)` —
    Honeypot, Inline-Validation (Email/Min/Max), Rate-Limit 5/h+20/24h,
    DB-Insert, Editor-Notification-Mail. Bei Mail-Failure bleibt
    DB-Row (Editor sieht im Admin).
  - `src/lib/pitch/submit.ts → submitArticlePitch(input)` —
    analog. Mail-Versand parallel via `Promise.allSettled`:
    Editor-Notification (Reply-To = Pitcher-Email) UND
    Submitter-Confirmation.
  - `src/lib/contact/adminActions.ts → updateContactStatus`,
    `updateContactNotes` (Editor-only).
  - `src/lib/pitch/adminActions.ts → updatePitchStatus`,
    `updatePitchNotes` (Editor-only). Status-Changes versenden **noch
    keine** Submitter-Mails — kommt mit Block 2.

- **Email-Templates** (`src/emails/`):
  - `ContactNotification.tsx` — Editor-Notification, Reply-To = Absender.
  - `PitchNotification.tsx` — Editor-Notification mit Body-Preview
    (max 1500 Zeichen, voller Text im Admin).
  - `PitchConfirmation.tsx` — Submitter-Bestätigung. Kein CTA-Button (kein
    nächster Schritt), Reply-To = `digital-age@zeoneq.com`.
  - Alle drei nutzen `_layout.tsx` mit Light-Default + Dark-Override.

- **Form-Komponenten** (`/kontakt` und `/artikel-pitchen`): bestehende
  State-/Validation-Logik beibehalten, Mock-Submit ersetzt durch
  Server-Action-Call via `useTransition`. Honeypot-Feld
  (`position: absolute; left: -9999px`), Server-Error-Banner bei
  Validation-Errors aus dem Server, Pending-State auf dem Submit-Button.

- **Admin-Views:**
  - `/autor/admin/nachrichten` mit Status-Tabs (Alle/Neu/Beantwortet/
    Archiviert), Detail-Modal mit Notes-Textarea (auto-save onBlur),
    Status-Actions, `mailto:`-CTA für Direktantwort.
  - `/autor/admin/pitches` analog mit zusätzlichen Status-Stufen (Neu/In
    Review/Akzeptiert/Abgelehnt) und reichem Detail-Modal (Abstract,
    Volltext-Markdown, Bio, Author-Website).
  - Sidebar+TopNav haben Nav-Links mit Icons. **Badge-Counter für
    `status='new'` ist NICHT in diesem PR** (würde Sidebar-Datenfluss
    von Server-Component umbauen erfordern — Follow-up).

### Submission-Lifecycle-Mail (Phase 10c — Prompts + Startups)

Mail-Aktivierung für die zwei Public-Submission-Flows. Drei Trigger-
Punkte pro Flow: Submit (Confirmation + Editor-Notification), Approve
(Approval-Mail mit Live-Link), Reject (Reject-Mail mit optionalem
Grund). Schema-Differenz zur Spec-Skizze: Status-Werte sind
`pending|published|featured|rejected|archived` — "Approved" = published
ODER featured. Beide Tables hatten bereits `rejection_reason` → **keine
Migration** in diesem PR.

- **Mail-Templates** (`src/emails/`):
  - `PromptSubmissionConfirmation.tsx`, `PromptApproved.tsx` (CTA-Link
    auf `/ai-prompts/<slug>`, seit PR 190; vorher UUID),
    `PromptRejected.tsx`.
  - `StartupSubmissionConfirmation.tsx`, `StartupApproved.tsx` (CTA-Link
    auf `/swiss-ai/[slug]`), `StartupRejected.tsx`.
  - `SubmissionNotification.tsx` — generisch via `type: "prompt" |
    "startup"`-Discriminator. Subject + Admin-Link via type. Reply-To =
    Submitter-Email damit der Editor mit einem Klick direkt antworten
    kann.
  - Rejected-Templates zeigen den Grund in einer HintBox, fallen bei
    leerem Grund auf generic-Text zurück ("Leider passt aktuell nicht
    in unsere Sammlung").

- **Mail-Dispatch** (`src/lib/submissions/mail.ts`): 4 Funktionen mit
  `SubmissionType`-Discriminator. Identischer try/catch-Pattern wie
  `contact/mail.ts` (Render-Errors + Resend-Errors gemeinsam, Lehre aus
  PR #51).

- **Submit-Actions** (`submitPromptExternal`, `submitStartupExternal`):
  nach Insert werden Confirmation + Notification parallel via
  `Promise.allSettled` versendet. Failure ist nicht-kritisch (DB-Insert
  durch, Editor sieht im Admin). KEIN `.select()` nach Insert — anon
  hat keine SELECT-Policy für pending-Rows; Editor-Notification-CTA
  zeigt auf die Listing-Page (`/autor/admin/prompts` bzw.
  `/autor/admin/startups`), nicht auf eine konkrete Detail-Row.

- **Approve/Reject-Actions:**
  - **Idempotenz:** vor jedem Update wird der aktuelle Status + die
    Submitter-Daten gelesen. Wenn schon im Ziel-Status → kein
    Re-Send der Mail (Doppel-Klick-Schutz). Approve = bereits
    published/featured → skip. Reject = bereits rejected → skip.
  - **Reject-Signatur**: `reason?: string | null` ist jetzt optional
    (vorher: erzwang non-empty). Leerer/null-Wert → `null` in DB +
    Submitter bekommt generic-Mail-Text.
  - **Submitter-Email-Check**: wenn `submitter_email` null/leer ist
    (z.B. Author-interner Prompt), wird die Submitter-Mail
    übersprungen ohne Error. Editor-Notification + DB-Update laufen
    trotzdem.

- **Admin-UI** (`/autor/admin/prompts`, `/autor/admin/startups`):
  - Reject-Modal-Textarea: Label umgestellt auf "Grund — wird dem
    Submitter in der Mail mitgeteilt (optional)". `maxLength=500`.
  - Button-Label: "Ablehnen & benachrichtigen" (statt nur "Ablehnen").
  - Disable-Logic: nur während laufender Action (`busyId !== null`),
    nicht mehr abhängig von Textarea-Inhalt.

### Article-Workflow-Mail (Phase 10d — Block 3)

Mail-Aktivierung für die zwei Status-Übergänge im Article-Workflow.
Damit ist die Mail-Logik-Trilogie (Block 1 Kontakt/Pitch, Block 2
Submission-Lifecycle, Block 3 Article-Workflow) komplett.

- **Templates** (`src/emails/`):
  - `ArticleSubmittedForReview.tsx` — Editor-Notification mit Reply-To
    = Author-Email. Admin-CTA zeigt auf Listing-Page
    `/autor/admin/artikel` (anon-RLS-safe, Lehre aus PR #55).
  - `ArticlePublished.tsx` — Author-Notification mit CTA auf
    `/artikel/[slug]`. Freundlicher Stil wie PromptApproved.
  - Beide über `_layout.tsx` (Light/Dark, kein `<Tailwind>`-Wrapper —
    Lehre aus PR #51).

- **Mail-Dispatch** (`src/lib/articles/mail.ts`): zwei Funktionen
  `sendArticleSubmittedForReviewNotification` +
  `sendArticlePublishedNotification`. Try/catch um render+send,
  `[article]`-Log-Prefix. Pattern identisch mit submissions/contact/pitch.

- **`submitForReview` erweitert:**
  - Status- + Title- + Author-Email-Read in einer Query (Embed
    `author:authors(display_name, email)`).
  - Bestehender Status-Guard "nur draft" macht den Doppel-Submit-Schutz
    inherent — Mail wird genau bei erfolgreichem draft → in_review
    versendet.
  - Wenn `author.email` oder `title` aus irgendeinem Grund fehlt: skip,
    `console.log` mit articleId, kein Error.
  - Mail-Failure ist nicht-kritisch (Status-Update bleibt durch).

- **`publishArticle` erweitert:**
  - **Idempotenz-Signal:** `published_at != null` vor dem Update.
    Wenn der Artikel schon mal live war → kein Re-Send der Author-
    Mail. Deckt sowohl Re-Publish-after-Edit als auch den
    archived→published-Edge-Case sauber ab (Submitter wurde schon
    einmal benachrichtigt).
  - Author-Daten via Embed `author:authors(display_name, email)` aus
    der `current`-Query. Skip-Pfad mit Log wenn `email`, `slug` oder
    `title` fehlt — defensiv, weil `authors.email` zwar NOT NULL ist,
    aber Daten-Drift bzw. zukünftige Gast-Authors ohne Mail-Adresse
    sauber abgefangen werden sollen.
  - Mail-Failure nicht-kritisch (published-Status bleibt).

- **Bewusst nicht in diesem PR:**
  - `archiveArticle`-Notification (Entscheidung: kein Mail-Versand).
  - Article-Reject-mit-Feedback-Mail (Reject-Flow existiert gar nicht
    im Schema — `article_status` hat kein `rejected`-Wert).
  - Gast-Author-Logik (separater Folge-PR). Wenn der Gast-Author-Flow
    später kommt, kann er die bestehende `email`-Skip-Logik
    weiterverwenden.

### Phase 11 — AI-Infrastruktur (A1a)

Fundament für AI-gestützte Editor-Features. Reines Plumbing: ein Provider,
eine zentrale Aufruf-Funktion, ein kombinierter Rate-Limit-+-Kosten-Store.
Keine Editor-Buttons verdrahtet (das ist eigener späterer Task), kein
zweiter Provider, kein Streaming, keine Task→Modell-Verzweigung.

- **SDK:** `@anthropic-ai/sdk` (offiziell). Kein roher `fetch`.

- **Provider-Adapter** (`src/lib/ai/`):
  - `types.ts` — `LLMParams`, `AiTask` (acht Werte, 1:1 mit den
    Editor-Buttons: `title_variants`, `tone_check`, `summary`,
    `seo_title`, `seo_description`, `seo_slug`, `seo_keyword`,
    `closing_paragraph`), `AiResult` (Discriminated Union success vs
    `{ kind: "config" | "auth" | "rate_limit" | "timeout" | "unknown" }`),
    `LLMProvider`-Interface.
  - `providers/anthropic.ts` — `AnthropicProvider` mit non-streaming
    `messages.create`, 30s-Hard-Timeout via AbortController, Fehler-
    Mapping (401/403→auth, 429→rate_limit, AbortError→timeout, fehlende
    Env→config, Rest→unknown). Roher SDK-Fehler wird **nur server-side
    geloggt**, nie im `AiResult`-Payload nach aussen gegeben. Der
    API-Key wird niemals geloggt.
  - `client.ts` (`"use server"`) — `callLLM(params)` ist der einzige
    legitime Einstiegspunkt. Ablauf: (1) Author-ID via Supabase-Server-
    Client auflösen (Pattern aus authorActions), (2) `checkAiRateLimit`
    VOR Provider-Call, bei `allowed:false` → sofortiger `rate_limit`-
    Result ohne Call, (3) Provider-Call, (4) `logAiUsage` bei jedem
    tatsächlich erfolgten Provider-Outcome (success/auth/rate_limit-vom-
    Provider/timeout/unknown), **NICHT** bei config-Fehlern (kein Call
    = keine Kosten).
  - **Naht ist das Interface, nicht eine Registry.** Provider-Registry
    kommt erst bei zweitem Provider.

- **DB-Tabelle `ai_usage_log`** (Migration
  `20260518090731_ai_usage_log.sql`):
  - Spalten: `id, author_id (FK→authors), task, provider, model,
    input_tokens, output_tokens, created_at`.
  - Composite-Index `(author_id, created_at DESC)` für Rate-Limit-
    Sliding-Window-Query.
  - RLS aktiv ohne Policies → ausschliesslich Service-Role-Zugriff.
    Client kann nicht lesen oder schreiben.
  - Rollback-Statement als auskommentierter Kommentar im Migrations-File.

- **Rate-Limit + Logging** (`src/lib/ai/rateLimit.ts`):
  - `checkAiRateLimit(authorId)` zählt Zeilen im 1h-Sliding-Window,
    Limit hartkodiert auf **20 Calls/Stunde pro Author**. Bei
    Überschreitung Returnt zusätzlich `retryAfterSeconds` (errechnet
    aus dem ältesten Eintrag im Window).
  - `logAiUsage({...})` inserted eine Zeile in `ai_usage_log` —
    derselbe Insert dient sowohl als Rate-Limit-Zähler als auch als
    Kosten-Hauptbuch-Eintrag.

- **Pragmatische Abweichungen vom bestehenden `rate-limit.ts`**
  (eigener Limiter statt Erweiterung):
  - **Identifier**: Author-ID (authentifizierter Editor-Kontext) statt
    IP-Hash. Andere Use-Case-Klasse — User-Quoten vs Anti-Spam.
  - **Storage**: eigene Tabelle `ai_usage_log` statt
    `newsletter_signup_attempts` — getrennte Identifier-Klassen, andere
    Retention.
  - **Kein 24h-Auto-Cleanup** (bewusst anders als
    `newsletter_signup_attempts`). Grund: `ai_usage_log` ist
    persistenter Kosten-Hauptbuch, Historie muss erhalten bleiben für
    spätere Kosten-Auswertung. Ein Long-Term-Cleanup für >365 Tage
    alte Zeilen ist nur als auskommentierter Vorschlag im File
    dokumentiert, nicht aktiv.
  - `src/lib/rate-limit.ts` und `newsletter_signup_attempts` wurden
    NICHT angefasst.

### Phase 11 — AI-Konfiguration (A1b-0)

DB-gepflegte Konfiguration als Singleton, gepflegt von Editor-Rolle,
gelesen von `callLLM` zur Laufzeit. Ersetzt die starre `ANTHROPIC_MODEL`-
Env als Default-Quelle (Env bleibt Fallback).

- **DB-Tabelle `ai_config`** (Migration `20260518121905_ai_config.sql`):
  Singleton mit `id text primary key default 'global' check (id =
  'global')` (erzwingt genau eine Row). Spalten: `system_prompt text
  not null default ''`, `default_model text not null`,
  `task_model_overrides jsonb not null default '{}'`, `updated_at`,
  `updated_by uuid → authors(id) on delete set null`. Migration seedet
  die eine Row mit `default_model='claude-haiku-4-5'` (idempotent via
  `on conflict (id) do nothing`).
- **RLS-Pattern:** SELECT für alle eingeloggten Authors (`using (true)`),
  INSERT/UPDATE nur Editor via `public.is_editor()`-Helper. KEINE
  DELETE-Policy — Singleton soll nicht löschbar sein.
- **Config-Resolver** `src/lib/ai/config.ts → resolveLLMConfig(params)`:
  liest die `global`-Row über den bestehenden Supabase-Auth-Server-Client
  (kein Service-Role), merged `system_prompt` (DB zuerst, dann Caller-
  System, getrennt durch `"\n\n"` falls beide nicht leer), wählt Modell
  per `task_model_overrides[params.task] ?? default_model`. Defensiv:
  Overrides-Keys, die nicht in `AiTask` sind, werden ignoriert.
- **Fehlerverhalten:** Wenn der DB-Read fehlschlägt (Tabelle fehlt,
  Service down, RLS unerwartet, 0 Rows): graceful Fallback —
  `params.system` bleibt der Caller-Wert, `params.model` bleibt unset
  (Provider fällt auf `process.env.ANTHROPIC_MODEL` zurück). Ein
  `console.warn` mit Kennung `[ai-config] resolve failed/threw, falling
  back to env` wird emittiert (kein Secret-Leak). `callLLM` returnt
  NICHT `kind:"config"` — Config-Fehlen ist kein Abbruchgrund.
- **Provider-Naht:** `LLMParams.model?: string` neu (optional).
  `AnthropicProvider.generate` liest `params.model ?? process.env.
  ANTHROPIC_MODEL` (eine einzige Zeile angepasst, alles andere am
  A1a-Pfad unangetastet: Fehler-Mapping, Timeout, API-Key-Read, Logging-
  Branches).
- **Editor-UI** `/autor/admin/ai-config` (`(suite)/admin/*`-Layout
  doppelschicht-gegated): Textarea für Systemprompt, Input für Default-
  Modell, ein Override-Input pro `AiTask`-Wert (leer = Default).
  Speichern via Server Action `saveAiConfig`, die zusätzlich zur RLS
  Editor-Auth prüft und Nicht-Editoren mit klarer Message abweist statt
  rohen RLS-Errors zu zeigen. Nav-Items in `AuthorSidebar` + `AuthorTopNav`
  (`id: admin-ai-config`).
- **Kein Cache:** Config wird bei jedem `callLLM` frisch gelesen
  (bewusste Entscheidung — Anthropic-Call-Latenz dominiert; DB-Read mit
  `single()` ist ~20–50 ms; Worker-übergreifende Cache-Invalidierung
  hätte realen Komplexitätskosten ohne messbaren Nutzen).

- **Env-Variablen** (in Vercel als Sensitive anlegen — `.env.example`
  hat Platzhalter):
  - `ANTHROPIC_API_KEY` — Provider-Key. Niemals committen.
  - `ANTHROPIC_MODEL` — globale Default-Modell-Wahl
    (z.B. `claude-haiku-5-5`). Task→Modell-Verzweigung ist explizit
    out-of-scope für A1a.

- **Manuelle Type-Ergänzung in `database.types.ts`:** der
  `ai_usage_log`-Type ist temporär manuell im Public-Tables-Block
  eingefügt (mit `// ── PHASE 11`-Markern), weil die Migration zum
  Zeitpunkt des PR noch nicht via `supabase db push` deployed war.
  Nach DB-Push + erneutem `gen types` wird der Block automatisch
  identisch durch das CLI überschrieben — die Marker dürfen dann
  entfernt werden.

### Podcast-Empfehlung per Teilen (Ingest)

iOS-Kurzbefehl «An digital-age» schickt einen Apple-Podcasts-Link an
`POST /api/podcasts/ingest` (Bearer `PODCAST_INGEST_TOKEN`, IP-Rate-Limit
über `newsletter_signup_attempts.action = 'podcast_ingest'`). Der Endpoint
legt sofort einen Entwurf an (`is_published = false`, `ingest_status =
pending`) und ergänzt nach der Antwort per `after()` Metadaten (Apple-Seite
plus iTunes Lookup) und KI-Felder (Task `podcast_ingest`, ohne Session über
`src/lib/ai/systemCall.ts`). Freigabe nur eingeloggt unter
`/autor/freigaben` (eigene Route-Gruppe `(freigaben)`, Shell mit
`mobile="allow"`, damit die Seite auf dem Handy läuft; die übrige Suite
bleibt unter 768px gesperrt). Nach der Anreicherung Mail an `authors.email`
des Empfehlers über `src/lib/podcasts/mail.ts` (Template
`src/emails/PodcastDraftReady.tsx`, ready wie failed; nur vom Endpoint,
nicht beim Retry). YouTube-Link über `src/lib/podcasts/platformLinks.ts`
(Data-API-Suche mit Titelabgleich `titleMatch.ts`, Schwellen 0.6 Folge /
0.7 Show; Env `YOUTUBE_API_KEY`, fehlend = null); im Podcast-Formular als
Button «Suchen» über die Server Action `lookupActions.ts`. Spotify bewusst
ohne API (Premium-Pflicht seit 2026, #178), Links manuell. Dubletten über
`podcasts.apple_episode_id` / `apple_show_id` (partielle Unique-Indizes).
Anleitung für den Kurzbefehl: `docs/podcast-kurzbefehl.md`.

### Hero Studio, Teil 1: Daten und Ausspielung (PR 180)

Migration `20261102150000_hero_studio_cover_fields.sql`, fünf nullable
Spalten auf `articles`: `og_image_url` (Teilen-Bild 1200×630 für og:image
und twitter:image, leer = Cover wie bisher), `cover_video_url` (Hero-Animation
MP4, nur Beitragsseite), `cover_video_alt` (keine Publish-Pflicht, nicht
gerendert), `cover_recipe` (Rezept des Studios, Pflicht nur numerisches
`version`), `cover_proposals` (KI-Zwischenspeicher ab PR 3). Die ersten vier
sind im Revisions-Snapshot und in der Trigger-Feldliste
(`article_editorial_snapshot`, `create_article_revision`,
`restore_article_revision` per `create or replace` erweitert, Spiegel
`REVISION_SNAPSHOT_FIELDS`); `cover_proposals` bewusst ausserhalb der
Revisionen wie `copilot_last_run`. Alte Snapshots ohne die Keys restaurieren
die vier Felder auf NULL (damals kein Studio-Hero). Bucket `articles` erlaubt
zusätzlich video/mp4. `ArticlePatch` kennt die vier Felder, `saveArticle`
prüft sie serverseitig (`validateHeroFields`: https-URL max 1000 Zeichen,
ALT max 1000, Rezept-Objekt mit `version` max 32 KB; Fehlertext landet im
roten Editor-Banner). `database.types.ts` ist bis zum `db push` manuell
ergänzt (Marker `HERO STUDIO`), danach `gen types`.

Ausspielung: `resolveOgImage` in `artikel/[slug]/page.tsx` nimmt
`og_image_url` → `cover_image_url` → Fallback; JSON-LD und Sitemap bleiben
beim Cover. `src/components/ArticleCoverVideo.tsx` (Client) liegt nur bei
gesetztem `cover_video_url` als dekorative Ebene über dem `<Image priority>`:
SSR ohne autoPlay und unsichtbar, nach dem Mount `muted` als Property, play(),
Einblenden bei `playing`; bei `prefers-reduced-motion` nichts (Bild bleibt,
kein Knopf); Pause-Knopf unten rechts (WCAG 2.2.2), pausiert ausserhalb des
Viewports und bei verstecktem Tab. Das Bild bleibt LCP, Poster und Fallback.
Listen, Spotlight, Rubriken, Admin, Dashboard, Autorenprofil: immer statisch.

### Hero Studio, Teil 2: Studio im Editor (PR 182)

Tab «Hero Studio» im Artikel-Editor (zwischen Details und Quellen, bedingt
gerendert, `dynamic(..., { ssr: false })`), Button «Hero Studio öffnen» in der
Box «Beitragsbild». Port des abgenommenen Prototyps (`claude code briefings/
hero-studio-uebergabe/`, Stand 31.10.2026). Geräte: iPad und Desktop ab
1024 px, Handy ist kein Ziel.

**Aufbau**
- `src/lib/hero-studio/vendor/hero-engine.js`: Engine des Prototyps als ESM-
  Vendor-Modul, GENERIERT von `scripts/hero-studio/freeze-engine.py` aus den
  Prototyp-Quellen plus `scripts/hero-studio/parts/engine-api.js` (Render-
  Fassade). Factory `createHeroEngine({ icons, iconTags, scriptFont, logoMask })`,
  alle Globals des Prototyps sind Closure-Variablen pro Instanz; `mulberry32`,
  `strHash`, `recipeFor` unverändert (gleiches Rezept = gleiches Bild). Typen
  in `vendor/index.d.ts`. Ordner steht in `eslint.config.mjs` globalIgnores,
  keine Edits von Hand (EDIT-Liste im Freeze-Skript).
- Daten `src/lib/hero-studio/data/lucide-icons.json` (1691 Lucide-Symbole als
  Pfade plus Tags, ISC) und `ems-allure.json` (Einstrich-Schrift, OFL 1.1);
  `lucide-static`/`hersheytext` sind NICHT installiert, Regenerieren siehe
  `scripts/hero-studio/README.md`. Schriften fürs Canvas als Kopie in
  `public/fonts/` («DA Grotesk», «DA Mono», «DA Inter» per FontFace,
  `fonts.ts`), Logo-Maske `public/images/hero-studio/logo-mask.png`. Alles
  lädt nur im Studio (`engine.ts` → dynamische Imports).
- Komponenten `src/components/author/hero-studio/`: `HeroStudio` (Wurzel: ein
  rAF-Loop, läuft nur bei sichtbarer Bühne und sichtbarem Tab, `dispose()`
  beim Unmount), `HeroFlow`, `HeroProposals`, `HeroStage`, `HeroPanel`,
  `HeroTake`, `HeroDownloads`, `HeroPosts`, Stile `studioStyles.ts` (Präfix
  `hs-`, Container-Queries, Admin-Tokens). Alle IDs per `useId()`.
- Sitzung (Vorschläge, Auswahl, letztes Ergebnis mit Blobs) lebt im
  EditorClient (`heroSessionRef`) und überlebt den Tab-Wechsel.

**Rezept v1** (`recipe.ts`, `articles.cover_recipe`, im Revisions-Snapshot):
`{ version: 1, studioVersion, engine, variant, overrides (nur Schlüssel aus dem
Optionen-Schema), text, figure, kiMotifs (v1 nur icon), animated, seedKey, fp,
snapshot { title, author, date, category }, files { hero, og, video },
createdAt }`. `seedKey` ist der Slug beim ersten Übernehmen und bleibt auch nach
einer Slug-Änderung. `parseHeroRecipe` liefert null für alles, was kein Rezept
v1 ist (auch JSON-null aus dem Restore alter Snapshots). Artikeldaten fürs
Studio kommen aus dem Editor-State (`heroArticle`-Memo: Titel, Rubrikname,
zugewiesener Autor, Datum TT.MM.JJJJ oder heute, Lesezeit, Fokus-Keyword, Lead,
Klartext des Body, Sprache); Lazy-Sync des Tiptap-Stands beim Tab-Wechsel.
Schlagwort-Reihenfolge: Fokus-Keyword → Schlagwort der KI-Vorschläge → aus dem
Titel (`keyword.ts`, ganzer Titel bis 26 Zeichen, sonst Wortgrenze, Satzzeichen
weg); die Engine bekommt nie einen leeren Text. Ohne Fokus-Keyword steht ein
Hinweis in Schritt 1 und beim Schlagwort-Feld in Schritt 2.

**Übernehmen** (`runTake` → `handleHeroApply` im EditorClient): Hero-PNG
1920×1080 und OG-PNG 1200×630 bei `heroP` rendern, bei «animiert» das Hero-MP4
1280×720 mit Mediabunny (`video.ts`: H.264 über WebCodecs, 30 fps, eine
Schleife ab `heroP`, Keyframe alle 2 s, Bitrate W·H·30·0,14 geklemmt 3 bis
14 Mbit/s; über 5 MB einmal mit 60 % Bitrate, sonst Fehlermeldung). Direkt-
Upload aus dem Browser (`upload.ts`, Muster Podcast) in den Bucket `articles`
als `<articleId>/hero-<uuid8>.png`, `og-<uuid8>.png`, `hero-<uuid8>.mp4`,
cacheControl 1 Jahr, upsert false. Dann EIN `saveArticle` mit explizit
zusammengesetzten Werten (Muster Co-Pilot, ungespeicherte Editor-Änderungen
gehen mit) = eine Revision: `cover_image_url`, `cover_image_alt`,
`cover_image_source` (= «digital age», wenn leer oder noch der Studio-Wert;
ein anderer Wert des Autors bleibt; Caption bleibt leer), `og_image_url`,
`cover_video_url`, `cover_video_alt`, `cover_recipe`. ALT-Texte baut `alt.ts`
aus Bausteinen der Engine (`altParts`): Standbild ohne Präfix, höchstens 125
Zeichen (Stufen: mit Farbklang, ohne, kurzer Schlagwort-Teil, Wortgrenze),
Animation höchstens 250 Zeichen; Test `__tests__/alt.manual.ts`. Scheitert das Speichern (RLS, Guard), setzt der Editor nichts
und das Studio löscht die eben hochgeladenen Dateien.

`saveArticle` revalidiert bei publizierten Artikeln zusätzlich `/artikel/<slug>`
(bei Slug-Wechsel alten und neuen Pfad), damit das neue Hero sofort live ist;
Startseite und Rubrikseiten bleiben beim ISR. Der Vorschau-Tab zeigt bei
gesetzter Animation dieselbe `ArticleCoverVideo` über dem Bild.

**Aufräumregel (seit PR 190):** Studio-Dateien `hero-*`/`og-*` eines einmal
gespeicherten Rezepts bleiben im Storage, denn Revisionen verweisen auf
`cover_image_url`, `og_image_url`, `cover_video_url` und `cover_recipe` und ein
Restore braucht die Dateien (bis PR 189 löschte `cleanupHeroFiles` sie nach dem
nächsten Save; zwei Revisionen von `einfuehrung-in-iot` vom 02.11.2026 zeigen
deshalb auf gelöschte Dateien). `deleteHeroAssets` läuft nur noch im Studio für
eben hochgeladene Dateien, wenn das Speichern scheitert. Wird das
Beitragsbild im Details-Tab ersetzt oder entfernt, leert `handleCoverChange`
Teilen-Bild, Animation und Rezept im State. «Veraltet» (`heroStaleChanges`:
Rezept-Snapshot gegen Titel, Autor, Datum, Rubrik) erscheint orange im
Details-Tab und im Studio, kein Publish-Blocker.

**Downloads** (`HeroDownloads`, `zip.ts`): immer lokal aus dem Rezept
gerendert, Videos beim ersten Klick, danach in der Sitzung. ZIP (eigener Store-
Writer) `digital-age_<slug>_hero-paket.zip` mit website/, social/, texte/,
rezept.json, LIESMICH.txt; Auslieferung per `<a download>` mit Object-URL.

**KI** (`src/lib/ai/heroPrompts.ts`, `heroActions.ts`): Tasks `hero_proposals`
(Default Haiku 5.5, maxTokens 1200) und `social_posts` (700), editierbare
Strategien `hero_proposals`/`social_posts` in der Registry, Gruppe «Hero Studio»
im Admin. Kein Auto-Start: Box in Schritt 1 links unter dem Titel, ohne KI-
Vorschläge Hinweis mit primärem Button «Vorschläge mit KI erstellen» (Karten
darunter heissen «Vorschläge aus Stichworten»), mit Vorschlägen sekundärer
Button «Neue KI-Vorschläge»; Fortschritt und Fehler in derselben Box. Listen (Animationen,
Bewegungen, Farbklänge, letzte Heroes, Symbolnamen) kommen aus der Engine in
den User-Prompt; der Parser prüft Symbolnamen gegen `lucide-icons.json`, die
Kennungen gegen `enums.ts` (Spiegel der Engine, bei Engine-Änderungen
nachziehen). Ergebnis in `articles.cover_proposals` `{ version: 1, contentHash,
createdAt, schlagwort, kennzahl, linie, typo }` über `saveHeroProposals` (Server-
Client, RLS, max 64 KB, KEIN saveArticle, keine Revision); beim Öffnen gelten
gespeicherte Vorschläge nur, wenn `contentHash` (FNV-1a aus Titel, Keyword,
Lead, Text ≤ 3500, Rubrik) zum Inhalt passt. Posttexte werden nicht
gespeichert (Anzeige und ZIP). Anti-Wiederholung: `memory.ts` liest die
letzten 40 `cover_recipe` anderer Artikel über den Browser-Client (RLS).

**Lizenzen:** `src/lib/hero-studio/LICENSES.md` und ausgeliefert unter
`/licenses/hero-studio.txt` (Link «Lizenzen» im Studio): Lucide ISC (Feather-
Teile MIT), hersheytext MIT, EMS Allure OFL 1.1, Site-Schriften OFL 1.1,
Mediabunny 1.65.0 MPL-2.0 (exakt gepinnt, unverändert verwendet).

**Prüfen:** `scripts/hero-studio/compare-references.mjs` rendert die sechs
Referenzen aus `referenzen/` mit der Engine (Playwright) und vergleicht Pixel;
mit `--prototype` zusätzlich gegen den Prototyp im selben Chromium (muss 0 px
liefern; gegen fremd erzeugte PNGs weichen nur Glyphenränder der Text-
Rasterung ab). Manuelle Tests: `src/lib/ai/__tests__/heroPrompts.manual.ts`,
`src/lib/hero-studio/__tests__/recipe.manual.ts`.

**Bekannte Grenzen:** H.264-Encoder braucht WebCodecs (Safari ab 16.4, Chrome,
Edge; Secure Context, also localhost oder https); fehlt er, ist der Schalter
«Im Beitrag animiert abspielen» aus und Social-Videos entfallen. Der Headless-
Chromium im Container kann kein H.264 (Pipeline dort nur mit VP9/WebM
prüfbar). `ImageUploader` löscht das Vorgängerbild sofort beim Hochladen
(bekannt, eigener Punkt). `cover_video_alt` ist keine Publish-Pflicht. Eigene
KI-Zeichnungen (`d`) und Vision-Bildkontrolle sind in v1 aus.

### Pitch → Artikel-Entwurf, Slug aus dem Titel (PR 187)

**Pitch → Entwurf.** Im Pitch-Modal (`/autor/admin/pitches`) gibt es den
Abschnitt «Artikel-Entwurf» mit «Entwurf erstellen» und optional «Zusätzlich
per E-Mail zum Login einladen». Server Action `createDraftFromPitch(id,
{ invite })` in `src/lib/pitch/adminActions.ts`, Editor-only, alles über den
Server-Client (RLS `articles_editor_all`, `authors_editor_insert`,
`article_pitches_editor_update`, `invites_editor_all`):
- Gast-Autor per E-Mail suchen (`ilike`, eingeloggte Rows zuerst), sonst neu
  als `external` ohne Login anlegen (Name, Bio, `job_title` aus «Rolle»,
  Website als `social_links.website`, nur http(s)).
- Volltext: `normalizePitchMarkdown` (erste H1 gleich dem Titel fällt weg,
  andere H1 werden H2) und danach dieselbe Pipeline wie der Knopf «MD-Cleanup»
  (`cleanupMarkdown`, Quellen inklusive). Reine Helfer in
  `src/lib/pitch/draftFromPitch.ts`, Test `__tests__/draftFromPitch.manual.ts`.
- Artikel `draft` mit Titel, Abstract, Kategorie (unbekannt → `ki-business`),
  `body_blocks` und `body_md`, Slug aus dem Titel.
- Migration `20261109180000_article_pitches_article_id.sql`: Spalte
  `article_pitches.article_id` (FK, `on delete set null`). Ein Pitch mit
  Entwurf liefert diesen zurück, statt einen zweiten anzulegen; das Modal
  zeigt dann «Entwurf öffnen». Pitch-Status wird `accepted`, keine Mail an den
  Pitcher. Schlägt die Verknüpfung fehl, wird der eben angelegte Artikel
  wieder gelöscht.
- Einladung: `inviteAuthorFromPitch` (`inviteActions.ts`) überspringt Autoren
  mit Login und solche mit aktiver Einladung; sonst Invite mit
  `intended_role = author`, beim ersten Login hebt `handle_new_user` die Rolle
  von `external` an. Ohne Einladung bleibt der Gast ohne Login.
- Beim ersten Publizieren schickt `publishArticle` wie bei jedem Autor die
  Mail «Artikel veröffentlicht» an die Pitch-Adresse.

**Slug aus dem Titel** (`src/lib/articleSlug.ts`): `slugFromTitle` (NFC,
ä→ae, ö→oe, ü→ue, ß→ss, übrige Akzente weg, Wortgrenze bis 60 Zeichen).
Der Editor setzt den Slug bei jeder Titeländerung neu, solange der Artikel nie
publiziert war (`published_at` null) und `slugFollowsTitle` gilt (Slug leer,
Platzhalter `draft-<ts>-<rand>`, gleich dem Titel-Slug oder Titel-Slug mit
Zahlen-Suffix). Hinweis im SEO-Tab unter dem Feld. Wer den Slug von Hand oder
per KI-Knopf ändert, beendet das Nachführen. Publizierte Artikel behalten
ihre URL. `saveArticle` hängt bei nie publizierten Artikeln und
`articles_slug_key`-Konflikt `-2` … `-20` an; der Editor übernimmt den
gespeicherten Slug (`applySavedSlug`). Seit PR 188 nutzen auch der KI-Knopf
und der Co-Pilot (`normalizeArticleSlug`) dieselbe Transliteration.

**Server Actions: erwartete Fehler zurückgeben, nicht werfen.** Next.js
ersetzt in Production die Meldung jedes geworfenen Fehlers aus einer Server
Action durch einen generischen Text («omitted in production builds»). Fehler,
die der Nutzer lesen soll, kommen als Rückgabewert. Muster seit PR 188 in
`src/lib/actionResult.ts` (kein "use server"):
- Server: eigene Meldungen als `throw new FormError("…")`; die exportierte
  Action ist ein Wrapper `runAction("name", () => nameInner(...), knownError)`
  und liefert `ActionResult<T>` (`{ ok: true, value } | { ok: false, error }`).
  `knownError` bildet bekannte DB-Fehler ab (`isUniqueViolation(e,
  "<constraint>")`), alles andere wird geloggt und zu `GENERIC_ACTION_ERROR`.
- Client: `unwrapAction(await action(...))` wirft im Browser ein normales
  `Error` mit der Meldung, bestehende try/catch-Pfade bleiben.
- Umgestellt: `authorActions` (saveArticle, submitForReview, publishArticle,
  archiveArticle, deleteArticle, updateAuthorProfile; Slug-Konflikt → «Dieser
  Slug ist schon vergeben …», Handle-Konflikt → «Dieser Handle ist schon
  vergeben.»), `storageActions` (uploadAvatar, uploadArticleImage),
  `inviteActions` (alle Client-Actions), `authorAdminActions`
  (updateAuthorAsEditor, deleteAuthorAsEditor, updateArticleAuthor) und
  `createDraftFromPitch`. `createDraft` wirft weiter (Aufruf aus einem Route
  Handler, dort greift die Schwärzung nicht).
- PR 189: `startupActions`, `promptActions` (ohne `incrementPromptUses`,
  fire-and-forget), `newsTickerActions`, `pageActions`, `podcastActions`,
  `admin/tagOperations` ebenso. Actions mit eigenem Ergebnis-Typ
  (`{ ok: false, message }`, z.B. Pitch-Status, Kontakt, Newsletter-Abmeldung,
  YouTube-Suche) nutzen `guardMessage(requireEditor)`, damit auch «Nicht
  eingeloggt.» als Wert zurückkommt.
- Neue Action: Wrapper + `unwrapAction` im Client, eigene Meldungen als
  `FormError`. Nie wieder `throw new Error("…")` für Texte, die der Nutzer
  lesen soll.
Prüfen geht nur gegen `npm run build` + `next start`, im Dev-Server kommt die
Meldung durch.

### Beitragsbild, SEO-Metadaten, Build-Info im Footer (PR 188)

**Beitragsbild.** Ein Upload ersetzt das Bild nur im Editor-State, der
Uploader löscht nichts mehr (`ImageUploader`, «Bild entfernen» in
`FeaturedImageBox` ebenso). Ein einmal gespeichertes Cover bleibt im Storage,
denn Revisionen verweisen auf `cover_image_url` und ein Restore braucht die
Datei. Gelöscht werden nur Uploads, die nie gespeichert wurden:
`cleanupAfterSave` nach jedem erfolgreichen Save (ausser dem gerade
gespeicherten und dem aktuell angezeigten Bild) und beim bestätigten
Verlassen über «← Zurück». Schliesst jemand den Tab ohne Speichern, bleibt
die Datei verwaist. Regel und Helfer in `src/lib/coverUploads.ts`
(Hero-Studio-Dateien `hero-*`/`og-*` sind ausgenommen, gespeicherte bleiben
ebenso liegen), Test `__tests__/coverUploads.manual.ts`.

**SEO-Metadaten.** Client-Seiten (`"use client"`) können keine Metadaten
exportieren und erben sonst Titel und Beschreibung der Startseite. Dafür gibt
es ein `layout.tsx` im Segment mit `buildListingMetadata` (Titel,
Beschreibung, Canonical, OG): `/kontakt`, `/artikel-pitchen`,
`/ai-prompts/einreichen`, `/swiss-ai/einreichen`. Status- und Hilfsseiten
(Newsletter-Bestätigungen, `/login`, `/onboarding`, `/design-test`) setzen
`robots: { index: false, follow: true }`. CMS-Seiten setzen ihren Canonical
selbst. Die Sitemap enthält zusätzlich Podcasts (`/podcast/<slug>`), die vier
Formularseiten und CMS-Seiten mit eigener Route, sofern publiziert und nicht
auf noindex (`CMS_PAGE_SLUGS` in `src/app/sitemap.ts`; neue CMS-Route dort
eintragen).

**Build-Info im Footer.** `next.config.ts` setzt per `env`
`NEXT_PUBLIC_APP_VERSION` (package.json), `NEXT_PUBLIC_BUILD_COMMIT`
(`VERCEL_GIT_COMMIT_SHA`, 7 Zeichen) und `NEXT_PUBLIC_BUILD_TIME` (einmal pro
Build, über `process.env.DA_BUILD_TIME` an die Worker vererbt, damit Server-
und Client-Bundle denselben Wert haben). Formatierung in
`src/lib/buildInfo.ts`: «Version 0.1.0 · Build 1ae69fe · Deploy 11.11.2026,
13:45» (Europe/Zurich), lokal «Build lokal».

### SEO-Review übernehmen, Vorschau, Bild-Guard (PR 189)

**SEO-Analyse sieht H2 und H3.** `seoHeadingOutline` (`src/lib/ai/seoHeadings.ts`)
liefert die Gliederung, `buildSeoReviewPrompt` schreibt sie eingerückt in den
Input. Der Hinweis «H3 zu H2 anheben statt neue H2 erfinden» steht im Input,
nicht in der Strategie, weil `seo_review` in der Prompt-Verwaltung
überschrieben ist (DB-Override ohne H3-Wortlaut).

**«Übernehmen» pro Vorschlag.** Das Schema (Code, nicht überschreibbar) hat
`action: replace | insert_before | insert_after | none`; Alt-Reviews ohne das
Feld bekommen keinen Knopf. `handleApplySuggestion` im EditorClient sucht das
Zitat (Marker vorher per `stripAllMarkup` entfernt) zuerst im Titel (nur
Ersetzen), dann im Abstract (ein Text-Knoten, `applySuggestionToDoc`), dann im
Text (`TiptapBodyEditor.applyTextEdit`, eine Transaktion). Über Blockgrenzen,
Quellenverweise oder Zeilenumbrüche hinweg wird nichts geändert («bitte von
Hand»). Einfügen bei einer Überschrift = eigener Absatz davor/danach. Es wird
nie automatisch gespeichert; der Vorschlag wird abgehakt (persistiert sofort).

**Vorschau-Tab** in der Reihenfolge der Beitragsseite: Rubrik, Titel, Abstract,
Autor-Zeile (Initiale statt Avatar, Anhören/Teilen nur angedeutet),
Beitragsbild mit Bildunterschrift und Quelle, Text, Tags.

**Bild-Guard beim Speichern.** `saveArticle` lehnt Bildblöcke und Cover mit
`blob:`/`data:`-Adresse ab (`src/lib/editor/localImageUrls.ts`), Meldung im
Editor-Banner.

**Werbung `period`.** `PeriodValue` in `src/lib/ads/types.ts` ist der eine Typ
für `ad_bookings.period` (gen types: `unknown`), gelesen wird nur über
`parsePeriod`. Generierte Typen nicht von Hand patchen.

**Farb-Token.** `--da-faint` ist ein Alias auf `--da-muted-soft` (beide #888).

### Newsletter: Du-Form, keine Verweise auf die Eingabe; News-Leiste zuruecksetzen (PR 205)

Befund am ersten echten Entwurf (13.11.2026, Haiku 5.5): die News-Auswahl war
gut (5 Themen, Huang nur einmal), aber die Einleitung siezte trotz «duzt» in der
Strategie, der Hype-Check verwies auf «die Kurzfassung», und die Einleitung
uebernahm eine Kehrseite. Jetzt:
- `ADDRESS_LINE` im Code (nicht ueberschreibbar, wie die Sprachzeile): duzen,
  keine Verweise auf Liste, Kurzfassung, Einordnung oder «die Meldung nennt».
- Strategie: keine Vorbehalte einzelner Meldungen in der Einleitung; der
  Hype-Check schreibt ueber die Sache, nicht ueber die Quelle der Liste.
- `usesFormalAddress` / `formalAddressFields` (newsletterPrompts.ts): «Sie»,
  «Ihnen», «Ihr…» gross mitten im Satz (das erste Wort eines Satzes zaehlt
  nicht, weil «Sie» dort oft Mehrzahl ist). Siezt die KI trotzdem, steht im
  Entwurf «Achtung: Die KI hat gesiezt (Einleitung, …)». Keine stille Korrektur.

**News-Seitenleiste** (Wunsch Ali 13.11.2026): «× Filter zuruecksetzen · n aktiv»
oben in der Leiste (setzt auch die Suche zurueck). Die Leiste laeuft auf dem
Desktop mit (sticky) und scrollt selbst, wenn sie hoeher als das Fenster ist.
Mobil steht das Zuruecksetzen ueber der Liste (je Ansicht nur einmal).
**`--aside-sticky-top`** (globals.css) rechnet jetzt den Ticker mit
(`--ticker-h` 40 px): Mitlaufende Seitenleisten (Prompts, Swiss AI,
KI-Plattformen, Kontakt, Formulare) lagen vorher mit den obersten 16 px unter dem
Ticker.

### News: Seitenleiste mit Suche (PR 204)

Rueckmeldung Ali 13.11.2026: Filter stehen sonst links (Rubriken, Prompts),
auf `/news` standen sie oben. Jetzt Seitenleiste wie `/ai-prompts` (220 px,
Mono-Label, Liste mit Trennlinien, aktiv fett mit gruener Zahl): Suche,
Zeitraum, Tragweite (Kaestchen, mehrere waehlbar, ab «mittel»), Relevanz,
Rubrik, jeweils mit Trefferzahl (`countWith`). Liste bis zur rechten Kante
(buendig mit der Navbar), Lesetext hoechstens 760 px. Unter 1024 px Suche ueber
der Liste, Filter hinter dem Knopf «Filter · n aktiv» (`activeFilterCount`),
aufgeklappt zwei Spalten, auf dem Handy eine.
- **Suche** clientseitig ueber Titel, Kurzfassung, Teaser, Quelle, «Warum
  wichtig» und Kehrseite (`matchesSearch`, alle Woerter muessen vorkommen,
  Gross/Klein, Akzente und Eszett egal per `foldSearch`), in der URL als
  `?q=`. Die Liste ist ohnehin komplett geladen (30 Tage, hoechstens 150).
- Die KI-Hinweiszeile steht ueber der Liste (`intro` von `NewsFeed`).
- Daten-Nachzug `20261113190000_ai_prompts_tested_with_nachzug.sql`: ein
  Prompt-Lauf mit vor dem Deploy geladener Admin-Seite trug wieder «claude» ein
  (Server Actions laufen auf der Version, mit der die Seite geladen wurde).
  Nach dem Merge pushen.

### Newsletter-Rubriken, Prompt-Job-Hinweise (PR 203)

**Rubriken** (Idee Ali 13.11.2026, sonst faellt der Newsletter mager aus):
nach den Artikeln «Die wichtigsten News der Woche» (bis 5), «Hype-Check» (eine
Meldung mit viel Echo und duenner Substanz, 2 bis 3 Saetze), «Prompt der Woche»
und «Podcast-Tipp». Leere Rubriken erscheinen nicht.
- **DB** (`20261113180000_newsletter_issue_sections.sql`, additiv):
  `newsletter_issues.sections` jsonb `{ news: [{newsId, title, why, source,
  anchor, einordnung}], hype: {newsId, title, text, source, anchor} | null,
  prompt | podcast: {id, slug, title, teaser, label, coverUrl} | null }`. Form
  und Pruefung nur in `sanitizeSections` (`src/lib/newsletter/issue.ts`);
  alte Ausgaben haben `{}`.
- **Quellen** (`src/lib/newsletter/sections.ts`, rein): Spaltenlisten,
  `rankNews` (Wichtigkeit, Summe der Stufen, neuer), `newsToSection` («Warum
  wichtig» aus der Einordnung, Marke per `newsAnchor`), `promptToPick`,
  `podcastToPick`, `defaultPrompt` (featured zuerst).
- **Entwurf** (`draftJob.ts`): News nach `generated_at` im Zeitraum (nur
  eingeordnete; `published_at` der Quellen kann in der Zukunft liegen), Prompts
  nach `published_at`, Podcasts nach `recommended_at`. Derselbe KI-Aufruf
  `newsletter_draft` waehlt News (Thema nur einmal), Hype-Check, Prompt und
  Podcast; kurze IDs `n1`/`p1`/`c1` im Prompt, `maxTokens` 2800, Timeout 90 s
  (Cron `maxDuration` 120). Die Regeln stehen in der editierbaren Strategie,
  das Ausgabeformat im Code. Ohne KI: News nach Rang, Prompt featured/neuester,
  Podcast neuester, kein Hype-Check. Der Cron erstellt auch ohne neue Artikel
  einen Entwurf, wenn mindestens drei eingeordnete News da sind.
- **Versand:** `validateForSend` verlangt einen Artikel oder eine News und Text
  in jedem Eintrag. News verlinken auf `/news#<marke>` mit UTM
  (`trackedNewsUrl`), Prompt auf `/ai-prompts/<slug>`, Podcast auf
  `/podcast/<slug>`.
- **Admin:** je Rubrik bearbeiten, entfernen, aus einer Liste waehlen (News der
  letzten 21 Tage nach Rang, Prompts, Podcasts); Verlauf zeigt «n Artikel · m
  News». Hinweis-Mail an die Redaktion nennt Artikel und News.

**Prompt-Job:** «Vorschlag bestand die Pruefung nicht (Laenge, Kategorie oder
Dublette)» nennt jetzt den Grund (`parseGenerated(..., rejected)`: Feld und
Laenge, Kategorie, vorhandener Titel). Die Prompts der KI-Redaktion bekommen
`tested_with = mehrere` statt `claude` (las sich wie «nur fuer Claude»); die
Detailseite sagt «fuer alle gaengigen KI-Assistenten geschrieben und mit Claude
getestet». Bestehende per Daten-Migration
`20261113181000_ai_prompts_tested_with_mehrere.sql` (nach dem Merge pushen).

### Filter auf /news, Zukunftsdaten, Prompt-Kategorie (PR 202)

**Filter** (Wunsch Ali 13.11.2026, Auswahl nach Claudes Empfehlung):
- **Optionen:**
  - Zeitraum (Alle, Heute, Gestern, Letzte 7 Tage);
  - Tragweite (Wirtschaft, Gesellschaft, Umwelt, Dringlichkeit, jeweils ab «mittel», oder-verknuepft, mit Trefferzahl);
  - Relevanz (Alle, Relevant = Wichtigkeit ab 2, Wichtig = 3);
  - Rubrik (nur vorhandene).
- **Logik:** rein in `src/lib/newsFilter.ts` (Test `src/lib/__tests__/newsFilter.manual.ts`).
- **URL:** Der Zustand steht in der URL (`?zeit=7&bereich=wirtschaft,gesellschaft&relevanz=wichtig&rubrik=ki-business`), per `history.replaceState`, und ist teilbar.
- **Liste:** `src/components/news/NewsFeed.tsx` ist dafuer eine Client-Komponente.
  - Der Server rendert die volle Liste (statisch, ohne JS lesbar); die Filter aus der URL greifen nach dem Hydrieren.
  - `nowIso` kommt vom Server, damit «Heute»/«Gestern» beim Hydrieren gleich bleiben.
- **Reine Helfer:** in `src/lib/newsFormat.ts` (`NewsItem`, `zurichDay`, `newsClock`, …). `newsApi.ts` bleibt server-only und reicht sie weiter.

**Zukunftsdaten:** Netzwoche datiert Meldungen aufs Ausgabedatum (z. B. 30.11. fuer eine Meldung vom 13.11.).
- `plausiblePublishedAt` nimmt dann `generated_at`.
- `getLatestNews` sortiert danach neu.
- Neue Eintraege kappt der Ticker beim Anlegen auf jetzt.

**Prompt-Job:**
- `parseGenerated` uebernimmt die angefragte Kategorie (`forceCategory`). Die KI schrieb sie teils als «Lernen», dann fiel der Prompt weg.
- Die Strategie verbietet Methoden, die schon in der Sammlung sind (zweimal Pre-Mortem).
- Die Kehrseite soll eine Sache der Sache selbst sein; die Formeln «Die Meldung nennt weder … noch …» und «Es bleibt abzuwarten» sind zu vermeiden.

### Kehrseite, Einordnung immer sichtbar, Prompt-Job repariert (PR 201)

**News (Wunsch Ali 13.11.2026):**
- **Kehrseite:** Die Einordnung hat ein weiteres Feld `kehrseite` (ein Satz:
  Risiko, Einwand, offene Frage oder was die Meldung nicht belegt; sachlich, ohne
  Polemik). Fuer neue KI-Einordnungen ist es Pflicht (`parseAssessment`, Option
  `requireKehrseite`). Gespeicherte aeltere und die der Redaktion duerfen ohne
  sein. Der Nachtrag (`backfillAssessments`) holt auch KI-Einordnungen ohne
  Kehrseite nach (PostgREST-Filter `assessment->>kehrseite.is.null` und
  `assessment->>by.eq.ai`); Einordnungen der Redaktion bleiben unangetastet.
- **Anzeige auf `/news`:** Unter der Kurzfassung steht ein Block «Warum
  wichtig» und «Kehrseite». Die Einordnung ist immer sichtbar, nicht mehr
  aufklappbar: Kopfzeile, vier Felder mit Balken und Stufe, Stufe 0 als
  «kein Bezug». Quelle und Rubrik stehen darunter.
- **Admin:** Ein Feld «Kehrseite» kommt beim Bearbeiten dazu.

**Prompt-Job repariert:** Der erste Handlauf (13.11.2026) endete zweimal mit
`max_tokens` und kaputtem JSON, weil drei Prompts samt ausgefuelltem Beispiel in
einer Antwort zu lang waren.
- **Neu, je Prompt ein Aufruf:** drei parallel, `maxTokens` 3000, Schwierigkeit
  gemischt. `prompt_text` hat 400 bis 1800 Zeichen. Die KI liefert
  `beispielwerte` als Objekt, den Beispiel-Prompt setzt der Code ein
  (`fillPlaceholders`).
- **Parser:** `parseGenerated` akzeptiert ein Objekt, `{prompt}` oder `{prompts}`.
- **Admin:** Die Leiste im Prompt-Admin zeigt die Fehler des letzten Laufs.

### Lesbare Sprungmarken auf /news (PR 200)

Meldungen auf `/news` haben als `id` den Titel-Slug (`newsAnchor` in
`src/lib/newsAnchor.ts`, gleiche
Transliteration wie Artikel-Slugs, `slugFromTitle`), z. B.
`/news#spacex-und-tesla-verhandeln-angeblich-ueber-fusion`; vorher
`#n-<uuid>`. Die Startseiten-Spalte verlinkt dieselbe Marke. Doppelte Titel auf
einer Seite bekommen die ersten 6 Zeichen der ID angehaengt (`newsAnchors`).
Alte Links springen weiter: ein unsichtbares `<span id="n-<uuid>">` oben im
Eintrag (`.nw-legacy`, Hervorhebung per `:has(:target)`).

### Einordnung der News (PR 199)

Entscheid Ali 13.11.2026 (Vorschlag angenommen): Die KI des Tickers schaetzt
jede Meldung grob ein. Nur News, keine Autoren-Beitraege.
- **DB** (`20261113090000_news_assessment.sql`, additiv): `news_items.assessment`
  jsonb `{ v: 1, wirtschaft, gesellschaft, umwelt, dringlichkeit (0 = nicht
  betroffen, 1 gering, 2 mittel, 3 hoch), warum (ein Satz, max 220), by: ai |
  editor }` und `news_items.importance` smallint 1-3 (3 = «Wichtig»). anon liest
  beide mit dem Tabellenrecht (RLS: nur approved).
- **Rubrik und Parser** rein in `src/lib/newsTicker/assessment.ts` (Test
  `__tests__/assessment.manual.ts`): Stufen statt Noten, «hoechstens jede fuenfte
  Meldung ist wichtig», Geruechte und Werbung tief. Unvollstaendige Einordnung =
  keine (null), lieber nichts zeigen als etwas Halbes.
- **Beim Anlegen:** `generator.ts` haengt `ASSESSMENT_FIELD_INSTRUCTION` im Code
  an den editierbaren Ticker-Prompt (Feld `einordnung` im selben JSON, gleiche
  Task, maxTokens 650). Fehlt sie, bleibt das Item gueltig.
- **Nachtrag:** `runRefresh` ordnet am Ende jedes Laufs (Cron und
  Knopf) bis zu 60 Meldungen der letzten 30 Tage ohne Einordnung nach
  (`assessExistingItem`, eigener kurzer Prompt, je 5 parallel). Seit PR 200
  laeuft der Nachtrag zusaetzlich stuendlich: Der Ticker-Cron ruft ausserhalb
  der eingestellten Stunde `runAssessmentBackfill` auf (ohne fehlende
  Einordnungen kein KI-Aufruf; respektiert Env-Schalter, Scheduler und Pause). Zaehler `items_assessed` /
  `assess_failed` im Lauf.
- **Admin** `/autor/news-ticker`, Abschnitt «Meldungen und Einordnung»
  (`ItemsSection`): letzte 40 Meldungen mit Einordnung; bearbeiten (gilt dann als
  «Redaktion»), «Neu einordnen lassen» (setzt null, naechster Lauf), aus- und
  einblenden (`status` rejected/approved). Actions in `newsTickerActions.ts`.
- **Anzeige:** `/news` (Darstellung jetzt in `src/components/news/NewsFeed.tsx`):
  «Wichtig» vor dem Titel, Satz «Warum wichtig» unter der Kurzfassung, darunter
  aufklappbar «Einordnung: Wirtschaft hoch · Dringlichkeit mittel» mit allen vier
  Feldern und dem Hinweis «Einschaetzung der KI» bzw. «Von der Redaktion
  eingeordnet». Startseiten-Spalte: nur «Wichtig» vor dem Titel.

### Design-Check Beitragsseite und Rubrik-Liste (PR 198)

Entscheid Ali 13.11.2026 nach Vergleich mit Wired, The Verge, TechCrunch, Ars
Technica und Heise (Visualisierung als Artifact): Artikelkopf Variante **A**,
dazu Lesetext, Artikelende und Liste wie vorgeschlagen.

**Beitragsseite** (`src/app/artikel/[slug]/page.tsx`, Stile in
`ArticleHeadStyles` und `ArticleBodyGrid`): ein Raster mit der Navbar (1200 inkl.
`--gutter`), alles beginnt buendig mit dem Logo. Kopf: Rubrik (Link auf die
Rubrikseite) / Unterrubrik in Mono, Titel ueber die ganze Breite, darunter links
das Beitragsbild, rechts (360 px) Abstract und Autorzeile, die unten buendig
steht; «Teilen»-Label dort ausgeblendet. Bild im natuerlichen Seitenverhaeltnis
(`height: auto`), nur sehr hohe Bilder werden ab `--ah-img-max` (480 / 640 /
420 px) mittig beschnitten; 16:9-Hero-Studio-Bilder und breite Grafiken bleiben
ganz (vorher schnitt `max-height: 520px` 16:9-Bilder oben und unten). Bis
1024 px untereinander (Abstract, Autorzeile zwischen Linien, Bild), auf dem Handy
das Bild direkt unter dem Titel. Lesetext 680 px links, Inhaltsverzeichnis rechts
an der Kante (`justify-content: space-between`), Zeilenhoehe 1.75. Tags und
Teilen in einer Zeile (`.art-endbar`). Podcast-Leiste in derselben Breite.
Verwandte-Artikel-Karten (`InternalArticleCard`): Abstract auf drei Zeilen,
Bild 16:9.

**Hervorhebungen** `{{g}}`/`{{o}}` (InlineText, BlockReader) sind global ein
Leuchtmarker unter heller Schrift (`mark.hl-green`/`mark.hl-orange` in
`globals.css`, mit `!important`, weil die Marken Inline-Styles setzen), statt
gruener/oranger Flaeche mit dunkler Schrift.

**Artikelliste** (`ArticleListRow`, Rubrikseiten und `/tag/<slug>`): Bild 16:9
(232 px, Handy 112 px rechts), Titel in der Display-Schrift, zwei Zeilen Abstract
(`excerpt` aus `articleToListRow`, Klartext ueber `plainExcerpt` in
`src/lib/excerpt.ts`), kein Farbbalken. `TopicListing`: Spotlight-Artikel
(`pinnedIds`) erscheinen in «Alle» ohne Autor-Filter nicht noch einmal
(«Neueste · n weitere Artikel»), Nachladen in 10er-Schritten, das wirkungslose
Auswahlfeld «Neueste zuerst / Meistgelesen» ist entfernt. Unterrubriken
gleicher Schreibweise bis auf Gross-/Kleinschreibung legt
`canonicalSubcategories` (`src/lib/subcategory.ts`) zusammen (haeufigste
Schreibweise gewinnt). Der Tag-Kopf steht jetzt buendig mit der Liste.

**News** (Feinschliff nach Alis Rueckmeldung 13.11.2026 «sieht zu sehr nach KI
aus»): Startseiten-Spalte (`NewsColumn`) und `/news` wie ein Newsticker bei
Heise/NZZ. Keine Karte, keine Kategorie-Punkte, keine Mono-Versalien. Links die
Uhrzeit (`newsClock`, gruen, tabellarische Ziffern), rechts Titel und Quelle;
Tageswechsel in der Spalte einmal als Zwischenzeile («Gestern»), auf `/news`
als Tageskopf «Heute · Freitag, 13. November» mit kraeftiger Linie
(`newsDayDate`). Quelle als dezenter Link «Heise KI ↗» mit Rubrik daneben,
statt einer gruenen Zeile «Bei … weiterlesen» unter jeder Meldung.
`newsTimeLabel` und `NEWS_CATEGORY_ACCENT` sind entfallen.

### Startseite neu, News-Rubrik, KI-Jobs fuer Plattformen und Prompts (PR 197)

**Startseite** (Design-Check, Entscheid Ali 12.11.2026: mit Slogan-Band).
Reihenfolge in `src/app/page.tsx`: `HomeDateline` (Slogan «KI & Future Tech
fuer die DACH-Region.» als H1, Datum, Hero-Bild schwach rechts), Aufmacher
`LeadStory` neben `NewsColumn` (7 neueste Ticker-Meldungen), `FocusRow`
(«Im Fokus», 3), Billboard, `RubricBlock` KI & Business, Swiss-AI-Streifen,
`RubricBlock` Future Tech, CTA. Komponenten in `src/components/home/`.
Auswahl in `src/lib/homeApi.ts`: Aufmacher = neuester `is_hero`, sonst
Featured, sonst neuester Artikel; Fokus = weitere Hero/Featured, aufgefuellt;
Rubriken je 4; jeder Artikel hoechstens einmal. Teaser ueber `plainExcerpt`
(LeadStory.tsx: entfernt `{{x}}`, `**`, `[^n]`, Links). `HeroBold` ist geloescht;
`SpotlightSection` lebt in den Rubrikseiten weiter.

**News** (`/news`, revalidate 300): freigegebene `news_items` der letzten 30
Tage (mindestens 10, hoechstens 150), nach Tag gruppiert (Europe/Zurich),
Anker `#n-<id>` fuer die Links aus der Startseiten-Spalte. Daten
`src/lib/newsApi.ts` (Public-Client). Navbar, Footer und Sitemap verlinken.

**KI-Plattformen aus der DB.** `ai_platforms` (Migration
`20261112170000_ai_platforms_and_jobs.sql`, Startbestand = die 14 Eintraege
aus dem Code, Texte auf Deutsch). `/ki-plattformen` liest ueber
`getPlatformDirectory` (`src/lib/platformsApi.ts`, anon sieht nur `active`,
revalidate 3600); `Platform.id` ist der Slug, `link` kann null sein («Auf
Anfrage»). Admin `/autor/admin/ki-plattformen`: bearbeiten, hinzufuegen,
archivieren, Top Pick, «Fuer KI gesperrt» (`locked`), Liste der KI-Aenderungen
mit «Rueckgaengig» (`revertPlatformChange`: Vorher-Werte bzw. archivieren/
aktivieren, setzt `reverted_at` und sperrt den Eintrag), «Jetzt pruefen».

**KI-Job Plattformen** (Wunsch Ali: woechentlich, ohne Moderation, er wird
informiert). Cron `/api/cron/platform-research` dienstags 05:15 UTC.
`runPlatformResearch` (`src/lib/platforms/job.ts`): Task `platform_research`
(Default Sonnet 5.5) mit Websuche (`LLMParams.webSearch`, Provider haengt
`web_search_20260209` an, bei Haiku `web_search_20250305`, `pause_turn`
wird bis zu dreimal fortgesetzt, `timeoutMs` 240 s). Prompt und Parser rein in
`research.ts` (Test `__tests__/research.manual.ts`): Aenderungen nur mit
https-Quelle, gesperrte/archivierte/unbekannte Eintraege fallen weg, hoechstens
6 Updates, 3 Neuaufnahmen (mit Link, Dubletten nach Name, Host, Slug), 2
Archivierungen. Jede Aenderung mit Vorher/Nachher, Grund und Quellen in
`ai_platform_changes`, `verified_at` fuer bestaetigte Eintraege. Mail
`AiJobReport` an `NEWSLETTER_REPLY_TO` bei Aenderungen oder (Cron) Fehlern.

**KI-Job Prompts** (Entscheid Ali: 3 pro Woche, gekennzeichnet). Cron
`/api/cron/prompt-generation` mittwochs 05:15 UTC. `runPromptGeneration`
(`src/lib/promptGen/job.ts`): ein Aufruf `prompt_generation` schreibt drei
Prompts fuer die am schwaechsten vertretenen Kategorien (`pickCategories`,
Gleichstand rotiert mit der Kalenderwoche), je ein zweiter Aufruf fuehrt das
ausgefuellte Beispiel aus (`example_output`, Kopfzeile «Beispiel mit …»).
Insert mit Service-Role: `published`, `ai_generated = true`, `author_id` null,
`submitter_name` «KI-Redaktion digital age», `tested_with` claude. Karte zeigt
im Fuss den Chip «KI-Redaktion», die Detailseite einen Hinweis mit Link auf
`/ki-transparenz`. Admin Prompts: Leiste mit letztem Lauf und «Jetzt
erstellen», Kennzeichen «KI» in der Liste; Zurueckziehen = Archivieren.
Reine Logik in `generate.ts` (Test `__tests__/generate.manual.ts`).

**Gemeinsam:** Laeufe in `ai_job_runs` (`src/lib/aiJobs/runs.ts`, ein Lauf
gilt 15 Minuten als aktiv, ein zweiter Start wird abgewiesen). Beide Tasks
sind `BACKGROUND_TASKS` (kein Stundenlimit), Strategien in der
Prompt-Verwaltung editierbar, Gruppe «Hintergrund-Jobs» in der
AI-Konfiguration. Kosten: beim Cron `AI_JOBS_AUTHOR_ID` (optional), sonst
aeltester Editor; beim Klick der Editor. Die Websuche kostet zusaetzlich zu
den Tokens (nicht im `ai_usage_log`). `ai_prompts.ai_generated` ist fuer anon
per Spaltenrecht freigegeben und steht in `PUBLIC_PROMPT_COLUMNS`.

### Einheitlicher Seitenrand, Newsletter-Logs (PR 196)

**Seitenrand `--gutter`** (`globals.css`): links/rechts auf allen oeffentlichen
Seiten. Desktop und Tablet `var(--sp-8)` (32 px, wie bisher), ab 720 px
abwaerts 24 px (gleich wie das Logo in der Navbar). Vorher hatte jeder
Abschnitt seinen eigenen mobilen Rand (16, 20, 24 oder 32 px). Navbar, Footer,
Startseiten-Abschnitte, Rubriken, Artikel, Suche, Detailseiten, Formulare und
Statusseiten nutzen den Token; die Navbar steht dadurch auf dem Desktop bei
152 px, buendig mit dem Inhalt (vorher 144). **Neue Seiten/Abschnitte:**
seitliches Padding immer `var(--gutter)`, keine eigenen mobilen Raender.
Innenabstaende von Karten, Knoepfen und Modals bleiben eigene Werte.

**Newsletter-Logs:** `src/lib/newsletter/mail.ts` schreibt keine Bestaetigungs-,
Abmelde- oder Einladungslinks (mit Token) mehr ins Server-Log.

### Newsletter-Versand, Suche erweitert, Kampagnenende, Rubrik-Kopf, Datenschutz Autoren/Prompts (PR 195)

**Newsletter-Ausgaben** (Entscheid Ali 12.11.2026: Entwurf + Freigabe). Admin
`/autor/admin/newsletter/ausgaben` (Link oben auf der Abonnenten-Seite).
- **DB** (`20261112150000_newsletter_issues.sql`): `newsletter_issues` (Status
  draft|sending|sent|discarded, hoechstens eine offene Ausgabe per partiellem
  Unique-Index, `items` jsonb in Versandreihenfolge, `edited_at`,
  `test_sent_at`, Zaehler) und `newsletter_deliveries` (ein Empfaenger pro
  Ausgabe, Momentaufnahme beim Start). Editoren lesen und pflegen Entwuerfe
  (RLS), Cron und Versand laufen mit der Service-Role.
- **Entwurf** (`src/lib/newsletter/draftJob.ts`): Artikel seit dem Ende der
  letzten gesendeten Ausgabe (sonst 7 Tage), hoechstens 8. KI-Task
  `newsletter_draft` (Strategie editierbar, Prompt/Parser in
  `src/lib/ai/newsletterPrompts.ts`) schreibt Betreff, Einleitung, Kurztexte;
  faellt sie aus, kommen die Texte aus den Abstracts und `ai_note` sagt es.
  Cron `/api/cron/newsletter-draft` montags 05:30 UTC: ohne neue Artikel
  nichts; ein unbearbeiteter offener Entwurf wird ersetzt, ein bearbeiteter
  bleibt (Mail «wartet»). Hinweis-Mail an `NEWSLETTER_REPLY_TO`. Von Hand
  («Entwurf jetzt erstellen») ohne neue Artikel: die neuesten vier als
  Startpunkt. Kosten: Editor (Knopf) bzw. `NEWSLETTER_AUTHOR_ID`/aeltester
  Editor (Cron).
- **Versand** (`src/lib/newsletter/sendIssue.ts`): nur nach «Freigeben und
  senden». Resend-Batch zu 100 mit Idempotency-Key, pro Empfaenger eigener
  Abmeldelink (HTML einmal gerendert, Platzhalter `UNSUBSCRIBE_PLACEHOLDER`)
  und `List-Unsubscribe` + One-Click-POST (`/api/newsletter/unsubscribe/<token>`,
  GET fuehrt nur auf die Bestaetigungsseite). Voruebergehende Fehler halten
  die Ausgabe auf «sending», «Versand fortsetzen» versucht sie erneut;
  seit dem Start Abgemeldete werden ausgelassen («skip: …»). Links mit UTM
  `newsletter / email / newsletter-JJJJ-MM-TT`.
- Mail `src/emails/NewsletterIssue.tsx` (Layout hat dafuer `footerExtra`),
  Hinweis `NewsletterDraftReady.tsx`. Reine Regeln in `src/lib/newsletter/issue.ts`,
  Test `src/lib/newsletter/__tests__/issue.manual.ts`.

**Suche erweitert** (`20261112140000_search_prompts_podcasts_startups.sql`):
RPCs `search_prompts`, `search_podcasts`, `search_startups` wie
`search_articles` (INVOKER, german, ⟦…⟧-Ausschnitt, max 50), ohne Index (kleine
Tabellen). `src/lib/search/more.ts` liest danach nur oeffentliche Spalten.
`/suche` zeigt Typ-Reiter mit Zahlen, alle Artikel und je Typ 5 Treffer mit
«Alle … anzeigen» (`?typ=prompts|podcasts|startups|artikel`).

**Kampagnenende** (Entscheid Ali: Mail mit Zahlen, Vorschau-Link 30 Tage
gueltig). Kampagnenende = spaetestes Ende der nicht archivierten Buchungen
(`src/lib/ads/campaignEnd.ts`, Test `__tests__/campaignEnd.manual.ts`).
`runEndReports` (`endReportJob.ts`) im Cron `/api/module/daily` nach der
Ablaufwarnung: gelaufene Kundenkampagne, Ende in den letzten 3 Tagen,
Buchungen ohne `end_report_sent_at` (Migration `20261112130000`) → Mail
`CampaignEndReport.tsx` an billing_email mit Kopie an die Redaktion.
Verlaengern/Reaktivieren setzt die Markierung zurueck. `/vorschau/<token>`
zeigt 30 Tage nach dem Ende `ExpiredPreview` statt der Zahlen; der Admin
zeigt Gueltigkeit und Versanddatum. Die Tagesreihe der Zahlen endet bei
beendeten Kampagnen am letzten Kampagnentag. Kundenmails teilen
`src/lib/ads/mail.ts`.

**Rubrik-Kopf** (`src/components/HubHero.tsx`): Entscheid Ali 12.11.2026 nach
Vergleich mit Wired, The Verge, TechCrunch, Ars Technica und NZZ, Variante B
«Kompaktzeile». Eine Zeile: Akzentbalken (Motiv der Abschnittsueberschriften),
Rubrikname als H1 (42 px, mobil 30 px), «// Claim» in einem Satz, rechts
optional eine Aktion. Keine Einleitung, keine Zahlen, kein Mosaik, keine
Breadcrumb; der erste Inhalt (Spotlight) steht direkt darunter. Aktionen als
Umriss-Knoepfe (`hh-btn`, `hh-btn--accent`): Sidebar-Knopf (TopicListing, unter
1024 px ausgeblendet), «+ Prompt einreichen», «+ Unternehmen eintragen»,
Hosting-Legende bei KI-Plattformen. Der erste Entwurf (Kopfzeile, grosser
Titel, Lead, Zahlenzeile) wurde abgelehnt: zu viel Text. Keine Hooks, rendert
in Server- und Client-Baeumen, immer ausserhalb von Suspense (SSR-H1);
TopicListing rendert ihn selbst, die Spotlight-Section kommt ueber `intro`.
Text fluchtet mit dem Inhalt (max-content + sp-8, mobil `mobileInset`).

**Datenschutz Autoren/Prompts:** anon konnte `authors.email` (alle Profile)
und `ai_prompts.submitter_email` publizierter Prompts ueber die REST-API
lesen. Oeffentliche Lesepfade nutzen `PUBLIC_AUTHOR_COLUMNS` (authorApi.ts,
auch in `RELATIONS_FULL`) und `PUBLIC_PROMPT_COLUMNS` (promptApi.ts);
Migration `20261112160000_public_columns_authors_prompts.sql` gibt anon nur
diese Spalten (nicht additiv, nach dem Deploy pushen). Neue oeffentliche
Spalte = in beiden Listen ergaenzen. `authors.user_id` bleibt lesbar
(Sitemap, Policies mit `auth.uid()`).

**Modell-Auswahl:** Fable 5.2 ersetzt Fable 5.1 in `KNOWN_MODELS` (8/40 USD,
Preis per Migration `20261112120000` im Katalog).

### Startup «Kontakt aufnehmen», Datenschutz Startups, Hausanzeigen-Band, AI 1b (PR 194)

**«Kontakt aufnehmen»** auf `/swiss-ai/<slug>` (Entscheid Ali 11.11.2026):
Anfragen gehen direkt ans Startup, aber nur mit dessen ausdrücklichem
Einverständnis; die Redaktion sieht nur Metadaten, nie den Inhalt.
- **DB** (`20261112090000_startup_contact.sql`): `startup_contacts` (Adresse,
  `consent_at`, `consent_source` submission|editor, `consent_note`,
  `optout_token`, `revoked_at`; nur Editoren/Service-Role, nie öffentlich),
  `startup_contact_requests` (nur startup_id, purpose, delivered, created_at),
  Rate-Limit-Aktion `startup_contact`.
- **Ablauf** (`src/lib/startupContact/`): Knopf nur, wenn ein aktiver Kontakt
  existiert (`startupAcceptsContact`, Service-Client; lokal ohne Key nie).
  `sendStartupContact`: validieren → Honeypot/Zeitcheck (still «Erfolg») →
  3/h und 10/Tag pro IP → max 20/Tag pro Startup → Mail ans Startup mit
  Reply-To = Absender und Link «Weiterleitung beenden» → nur Metadaten
  speichern. Keine Bestätigungsmail an Absender (sonst Spam an fremde
  Adressen möglich). Beenden: `/startup-kontakt/beenden/<token>` mit Knopf
  (Link-Scanner lösen nichts aus).
- **Einverständnis:** im Einreichformular (Schritt 3, optional, Häkchen
  Pflicht wenn Adresse) oder im Admin «Kontakt» (Häkchen «hat ausdrücklich
  zugestimmt», Notiz woher). Admin-Liste «Kontaktanfragen · ohne Inhalt».
- Test: `src/lib/startupContact/__tests__/validate.manual.ts`.

**Datenschutz Startups:** anon konnte `submitter_name/_email/_role`
publizierter Startups über die REST-API lesen (RLS filtert Zeilen, nicht
Spalten). Public-Reads in `startupApi.ts` nutzen jetzt `PUBLIC_STARTUP_COLUMNS`
(Typ `PublicStartupRow`); Migration `20261112100000_startup_public_columns.sql`
entzieht anon das Tabellen-SELECT und gibt es nur für diese Spalten zurück.
Nicht additiv: erst nach dem Deploy pushen. Neue öffentliche Spalte in
`ai_startups` = in beiden Listen ergänzen.

**Hausanzeigen im Artikel** (`ModuleCard`, `frame="band"`): House-Kreative
stehen jetzt auch im Band, Kopfzeile «In eigener Sache · Angebot von digital
age» (gleiche Höhe wie «Anzeige», BAND_EXTRA bleibt), kein Leerraum mehr.

**AI 1b:** `title_variants`, `tone_check`, `summary`, `closing_paragraph`
entfernt (keine Aufrufer seit PR 130). Alte Overrides in
`ai_config.task_model_overrides` werden ignoriert und fallen beim nächsten
Speichern der AI-Konfiguration weg.

**Related Podcasts** brauchte keinen Code: Der Artikel zeigt Podcasts mit
`related_article_slug` bereits unter dem Titelbild («Podcast zum Beitrag»).

### Volltextsuche (PR 193)

`/suche?q=…` (Server-Komponente, `noindex, follow`, nicht in der Sitemap),
Lupe in der Navbar (Desktop rechts, Mobile neben dem Hamburger).
- **DB** (`20261111230000_article_search.sql`): `article_search_document(title,
  subtitle, excerpt, tags, body_md)` (immutable, `german`, Gewichte A/B/C),
  GIN-Ausdrucksindex `articles_search_idx` nur für published, RPC
  `search_articles(p_query, p_limit)` (INVOKER, `websearch_to_tsquery`:
  "Phrase", `or`, `-wort`; max 50 Treffer; Ausschnitt per `ts_headline` mit
  Markierungen ⟦…⟧). Bewusst keine generierte Spalte: `articles` wird oft mit
  `select("*")` gelesen, ein tsvector würde jede Antwort aufblähen. Wer die
  Suche ändert, muss Index-Ausdruck und Abfrage gleich halten.
- **Seite:** `searchArticles` (`src/lib/search/articles.ts`) holt Rang und
  Ausschnitt per RPC, dann die Artikel per `RELATIONS_SHORT`.
  `snippetParts` (`src/lib/search/snippet.ts`, Test `__tests__/snippet.manual.ts`)
  entfernt Markdown-Reste und liefert Teile, die als Text bzw. `<mark>`
  gerendert werden, nie als HTML.
- Nur Artikel. Prompts, Podcasts und Startups wären je eine weitere RPC.
- **Navbar:** Unter 960 px Hamburger (vorher 768), bis 1180 px engere
  Abstände und ohne «DE / EN» (Knopf ohne Funktion), Links mit `nowrap`.
  Vorher brachen die Links zwischen 769 und 960 px zweizeilig um.

### Modell-Check (PR 192)

Seite `/autor/admin/ai-config/modell-check` (Link oben auf der
AI-Konfiguration), Cron `/api/cron/model-check` montags 05:00 UTC
(`vercel.json`, CRON_SECRET wie `/api/module/daily`).
- **Daten:** `ai_model_catalog` (Preise USD/MTok, Long-Prompt-Stufe, Status,
  Abschaltdatum, Erscheinungsdatum, Vision; Editoren lesen und pflegen Preise
  und Status), `ai_model_check_runs` (Läufe mit Punkten, Fehlern, gesehenen
  Modellen). Editoren dürfen jetzt `ai_usage_log` lesen (Policy).
- **Rechnung** (`src/lib/ai/modelCheck/report.ts`, rein, Test
  `__tests__/report.manual.ts`): pro Aufgabe die letzten 60 Tage, auf 30 Tage
  hochgerechnet. Fehlversuche (0/0) zählen nicht. Ab 3 Aufrufen mit dem
  aktuellen Modell gilt der Schnitt als gemessen, sonst «Prognose» aus allen
  Aufrufen. Andere Modelle: gleiche Tokens × deren Preis, darum immer «ca.».
- **Regeln:** Pflicht (Modell abgekündigt/abgeschaltet → Nachfolger),
  Gratis-Upgrade (neueres Modell derselben Klasse, nicht teurer), Qualität
  (`JUDGMENT_TASKS` auf Haiku → Sonnet), Sparen (Ø Output unter 100 Tokens
  auf Sonnet/Opus/Fable → Haiku; bei `VISION_TASKS` nur Vision-Modelle).
  Vorgeschlagen werden nur Modelle aus `KNOWN_MODELS` (models.ts).
- **Lauf** (`run.ts`, Service-Role): Models API (`client.models.list`,
  Datums-Suffix wird abgeschnitten) → Katalog abgleichen, neue Modelle mit
  leerem Preis anlegen, wählbare Modelle ohne API-Eintrag melden; Bericht;
  Mail an `NEWSLETTER_REPLY_TO` nur beim Cron und nur bei Neuem gegenüber dem
  letzten Lauf (Template `src/emails/ModelCheckReport.tsx`). Fehler stehen im
  Lauf, im Admin und machen den Cron zu 500.
- **Wechseln** (`switchTaskModel` in configActions.ts) schreibt nur den einen
  Schlüssel in `task_model_overrides`, wie `saveNewsTickerModel`. Kein
  Auto-Wechsel. «Jetzt prüfen» = gleicher Lauf ohne Mail.
- Lokal nicht lauffähig: `.env.local` hat weder Service-Role- noch
  Anthropic-Key. Teil 2 (Vergleich auf echten Inputs per Klick) ist offen.

### News-Ticker-Cron repariert, DB-Härtung (PR 191)

**Ticker-Cron lief nie.** `generateNewsItem` rief `callLLM` (client.ts), das
eine eingeloggte Session braucht. Der Cron hat keine, also endete jedes Item
mit «not authenticated» und zählte still als «übersprungen». Alle Einträge bis
PR 191 stammen aus zwei Handläufen im Admin (22.05. und 07.07.2026).
- Der Generator nutzt jetzt `callLLMForAuthor` (systemCall.ts). Kosten trägt
  beim Klick im Admin der Editor, beim Cron der System-Author:
  `NEWS_TICKER_AUTHOR_ID` (optional), sonst der älteste Editor
  (`resolveSystemAuthorId`, src/lib/ai/systemAuthor.ts, auch für den
  Podcast-Ingest).
- **Hintergrund-Tasks** (`BACKGROUND_TASKS` in types.ts, heute nur
  `news_item_generation`) zählen nicht ins Stundenlimit der Autoren und werden
  davon nicht gebremst. Sonst sperrt ein Ticker-Lauf (bis Quellen ×
  items_per_source Aufrufe) dem Editor eine Stunde lang die KI-Knöpfe.
- **Fehler sind sichtbar:** Der Generator liefert `item | skip | error`
  (`src/lib/newsTicker/parse.ts`). `items_skipped_generation` zählt nur noch
  Aussortiertes, Fehler zählen in `items_failed` und stehen zusammengefasst
  (`count`) in `errors`. Der Admin zeigt den letzten gespeicherten Lauf und
  das Datum des neuesten Eintrags (orange ab 3 Tagen). Der Cron antwortet mit
  500, wenn Items scheiterten und keines durchkam.
- `callLLM` loggt Fehlversuche jetzt mit dem aufgelösten Modell statt
  `ANTHROPIC_MODEL` (daher kam «seo_review auf Haiku 4.5 mit 0 Tokens»).
- Test: `src/lib/newsTicker/__tests__/ticker.manual.ts`.

**DB-Härtung** (`20261111210000_function_execute_hardening.sql`): EXECUTE auf
Funktionen im public-Schema eingegrenzt (Supabase-Advisor 0028/0029/0011).
Trigger-Funktionen und `ad_campaign_coverage_gap` für keine API-Rolle mehr,
Editor-RPCs, RLS-Helfer und SEO-Review-RPCs nur noch `authenticated`,
`get_top_tags` als SECURITY INVOKER, `search_path` gesetzt. Bewusst öffentlich
bleiben `get_invite_by_token`, `increment_prompt_uses`, `suggest_startup_slug`
(der Advisor meldet sie weiter, ebenso die RLS-Helfer und Editor-RPCs für
`authenticated`).

**Neue DB-Funktionen** (Regel seit PR 191): Postgres gibt EXECUTE an PUBLIC,
Supabase zusätzlich an anon und authenticated. Darum in derselben Migration
`revoke execute on function … from public, anon, authenticated;` und dann
gezielt `grant … to authenticated` (oder anon), nur wo der Code die Funktion
per `.rpc()` mit dieser Rolle aufruft. Trigger-Funktionen brauchen kein Grant
(Postgres prüft EXECUTE nur beim CREATE TRIGGER). Funktionen, die in Policies
für anon/public stehen, müssen für anon ausführbar bleiben.

### KI-Konfiguration aufgeräumt, Prompt-Slugs, Hero-Dateien (PR 190)

**Tasks an einer Stelle.** `AI_TASKS` / `isAiTask` in `src/lib/ai/types.ts`
(Record über alle `AiTask`-Werte, der Compiler meldet fehlende). Resolver und
`saveAiConfig` nutzen sie; die doppelten `KNOWN_TASKS`-Listen sind weg.

**Strategie-Overrides** liest `getPromptOverride(s)` in
`src/lib/ai/promptOverrides.ts` (server-only) für alle KI-Actions. Neu
editierbar: `abstract_generate` (Drei-Teiler: Sprache und Focus-Keyword-Block
im Code, Strategie `ABSTRACT_STRATEGY` sprachneutral, Ausgabeformat im Code).

**News-Ticker-Modell** wählt man unter `/autor/news-ticker` («Prompt &
Modell», speichert sofort über `saveNewsTickerModel`, ändert nur den Schlüssel
`news_item_generation` in `task_model_overrides`). Die AI-Konfiguration zeigt
die Task nicht mehr; `saveAiConfig` übernimmt deren Wert unverändert aus der DB
(`TASKS_WITH_OWN_MODEL_SETTING`). Der Seitenname «AI-Konfiguration» bleibt, weil
dort auch Content, Podcasts und Hero Studio stehen.

**Aufgeräumt:** `BentoGrid`/`BentoCard`, `PagePlaceholder`, `FeedbackBanner`,
die Tiptap-Vorlage `simple-editor` samt Hooks. `node-background-extension.ts`
bleibt, obwohl nichts sie importiert: Sie erweitert die Tiptap-Command-Typen,
die `use-color-highlight` braucht. `tsc` ist inkrementell; nach dem Löschen
von Dateien `npx tsc --noEmit --incremental false` laufen lassen.

### Invite-Flow (PR B)

**Pragma:** Editor generiert Token, kopiert URL und versendet sie manuell
(WhatsApp/Slack/eigene Mail). Resend/SMTP-Integration kommt in eigener Session.

Tabelle `invites` (Migration `20260512100000_invites_table.sql`):
- `intended_role` constraint `in ('author', 'editor')` — external läuft über
  Pitch-Flow, nicht über Invites
- `token text unique default encode(extensions.gen_random_bytes(24), 'hex')` —
  pgcrypto-Funktion ist im `extensions`-Schema, NICHT in `public`. Bei neuen
  Migrations mit `gen_random_bytes` immer `extensions.` voranstellen.
- `expires_at default now() + interval '14 days'`

**Status-Derivation** (View-Model in `editorAdminApi.getAllInvites`):
- `accepted_at != null` → `accepted`
- `revoked_at != null` → `revoked`
- `expires_at < now()` → `expired`
- sonst → `pending`

**Onboarding-Lookup (`/onboarding?token=...`):** Public-Page nutzt RPC
`public.get_invite_by_token(p_token text)` (SECURITY DEFINER + EXECUTE-Grant
für anon). Anon hat KEIN direktes SELECT auf invites — verhindert
Table-Enumeration mit dem public anon-Key. Drei Cases: invalid/accepted/valid.

**Auth-Trigger-Reihenfolge** (`handle_new_user`, Migration
`20260512100001_handle_new_user_with_invites.sql`):

1. Aktives Invite mit matching email suchen (intended_role merken)
2. Placeholder-Author (`user_id IS NULL`) mit matching email suchen
3. Falls Placeholder vorhanden → merge (`user_id` setzen), Role auf
   `intended_role` upgraden falls Invite vorhanden
4. Falls kein Placeholder → neuen Author anlegen mit `intended_role` oder
   Fallback `'external'`
5. Falls Invite vorhanden → `accepted_at = now()`, `created_author_id` setzen

**Wichtig:** Wenn ein Mock-Author-Placeholder mit falscher Email existiert
und der echte Login eine andere Email nutzt, wird Schritt 2 nichts finden und
ein neuer Author angelegt — der Placeholder bleibt verwaist. Cleanup wie in
PR #22-Notes dokumentiert (manuelles SQL).

### RLS: Authors (PR B Erweiterung)

Zu den bestehenden Self-Update-Policies (Session B) kommen drei
Editor-Admin-Policies (`20260512100002_authors_editor_admin_policies.sql`):

- `authors_editor_insert` — Editor kann Placeholders anlegen
- `authors_editor_update` — Editor kann Profil + Role auf ALLE Rows ändern
  (Application-Layer enforced zusätzlich)
- `authors_editor_delete` — Editor kann löschen; `articles.author_id` hat
  `on delete restrict`, daher blockt die DB bei Articles. Application-Layer
  zeigt freundliche Fehlermeldung.

### RLS: Invites

- `invites_editor_all` — Editor hat FULL access (select/insert/update/delete)
- KEIN public-read — Anon-Lookup geht über `get_invite_by_token` RPC

### AI Prompts (PR C-1)

Tabelle `ai_prompts` mit Submission-Workflow. Enums:
- `prompt_status`: `pending → published → featured → archived → rejected`
- `prompt_difficulty`: `beginner / intermediate / expert`

**Status-Workflow:**
- External Submission (`/ai-prompts/einreichen`, anon) → `status='pending'`,
  `author_id=null`, `submitter_name/email` gesetzt
- Author-CRUD (`/autor/prompts`) → `createPrompt` setzt `status='published'`
  + `published_at` direkt; Author kann zwischen published/archived togglen
- Editor-Approval (`/autor/admin/prompts`) → `approvePrompt` (optional mit
  `feature: true` setzt direkt featured), `rejectPrompt` mit Reason,
  `toggleFeatured`, `archivePromptAsEditor`, `restoreToPending`, `deletePrompt`

**Status-Transition-Trigger** (Migration `20260512200000_ai_prompts_table.sql`):
`check_prompt_status_transition()` validiert Status-Wechsel BEFORE UPDATE.
- Status unverändert → kein Check (Author kann featured-Row weiterhin editieren)
- Status geändert: Editor darf alles, Author nur `published` ↔ `archived`

Wichtig: die naivere "RLS WITH CHECK status in ('published','archived')"
hätte Authors blockiert, ihre eigenen featured-Prompts zu editieren (NEW.status
bleibt 'featured' bei unverändertem Status, fällt durch den Check). Trigger
prüft NUR Übergänge, nicht jeden UPDATE.

**RLS-Policies:**
- `ai_prompts_public_read` — anon liest `published` + `featured`
- `ai_prompts_author_read_own` — Author sieht eigene (jeder Status)
- `ai_prompts_author_insert_own` — author/editor inserten mit eigener author_id
- `ai_prompts_author_update_own` — author/editor updaten eigene (Trigger gatet Übergänge)
- `ai_prompts_author_delete_own` — author/editor löschen eigene
- `ai_prompts_editor_all` — Editor FULL access auf alle Rows
- `ai_prompts_anon_submit` — anon + authenticated dürfen mit `status='pending'`,
  `author_id=null`, `submitter_name/email` einreichen

**RPC `increment_prompt_uses(p_id uuid)`** — SECURITY DEFINER, anon+authenticated
EXECUTE. Bumped uses_count nur für status in (published, featured). PromptCard
ruft fire-and-forget beim Copy.

**Daten-Flow:**
- DB nutzt Lowercase-Codes (`business`, `chatgpt`, `beginner`)
- UI nutzt deutsche Labels (`Business`, `ChatGPT`, `Anfänger`)
- `mappers/promptMappers.ts` enthält die Konstanten-Listen mit `{code, label}`-Paaren

**Routes:**
- Public: `/ai-prompts` (Server Component + Client Filter-Browser),
  `/ai-prompts/[slug]` (Detail-Page mit vollem Kontext, Beispiel-Output,
  Author-Block; RLS-gated — nur published/featured, sonst 404 via `notFound()`,
  `generateMetadata` für SEO; alte UUID-Adressen leiten mit 308 um),
  `/ai-prompts/einreichen` (Client Form + Server-Action-Submit)
- Author-Suite: `/autor/prompts` — eigene CRUD via Drawer-Form
- Editor-Admin: `/autor/admin/prompts` — Tabs (Pending default) + Vorschau-Modal
  + Reject-Reason-Modal

**Slug (PR 190):** `ai_prompts.slug` (unique, Format wie Artikel-Slugs) setzt
der Trigger `ai_prompts_set_slug` aus dem Titel (`slugify_title`: ae/oe/ue/ss,
Wortgrenze bis 60 Zeichen; Konflikt → `-2`, `-3` über `unique_ai_prompt_slug`,
SECURITY DEFINER, damit auch anon beim Einreichen eindeutige Slugs bekommt).
Solange `published_at` null ist, folgt der Slug dem Titel, danach bleibt er.
Kein Feld im UI.

**Card-Navigation:** `PromptCard` ist ein `<Link>`-Wrapper auf `/ai-prompts/<slug>`.
Copy-Button bleibt funktional via `e.preventDefault()` + `e.stopPropagation()` —
sonst würde der Click auf Copy auch die Link-Navigation feuern.

### AI Startups (PR C-2)

Editor-kuratiertes Verzeichnis Schweizer KI-Unternehmen. Externe Submissions
landen als `pending`, Editor approved/rejected/featured/archived. **Kein
Author-Self-Service** (im Unterschied zu ai_prompts) — Startups sind
Editor-only, Founder reichen über Public-Page ein und Editor verwaltet
danach alles.

**Tabelle `ai_startups`** mit Enums:
- `startup_status`: `pending → published → featured → archived → rejected`
- `swiss_status`: `swiss_based / swiss_founded / active_in_ch`
- `employee_range`: `r_1_10 / r_11_50 / r_51_200 / r_201_500 / r_500_plus`
- `funding_stage`: `bootstrapped / pre_seed / seed / series_a / series_b_plus / public_company`

**Status-Workflow:**
- External Submission (`/swiss-ai/einreichen`, anon) → `status='pending'`,
  `submitter_name/email/role` gesetzt, `published_at=null`
- Editor-Approval (`/autor/admin/startups`) → `approveStartup` (optional mit
  `feature: true` setzt direkt featured), `rejectStartup` mit Reason,
  `toggleStartupFeatured`, `toggleInvestorReady`, `updateStartup` (inkl. Slug),
  `archiveStartup`, `restoreStartupToPending`, `restoreStartupToPublished`,
  `deleteStartup`

**Spotlight-Hard-Limit (max 3 featured):** Trigger
`check_startup_spotlight_limit()` BEFORE INSERT/UPDATE blockiert den
Übergang zu `featured` sobald 3 andere Rows bereits featured sind. Application
fängt den `check_violation`-Errcode in `startupActions.ts` und gibt eine
verständliche DE-Message zurück. Admin-UI zeigt zusätzlich Counter
("Spotlight: 2/3 belegt") und disabled Feature-Buttons präventiv wenn voll.
Kein FIFO-Auto-Unfeature — Editor entscheidet explizit, was rausfliegt.

**Status-Transition-Trigger** `check_startup_status_transition()`: Nur
Editor darf Status ändern. Inserts via anon sind durch separate RLS-Policy
auf `status='pending'` gegated. Wenn `NEW.status = OLD.status` → kein Check
(Editor kann nicht-Status-Felder editieren ohne Permission-Drama).

**Slug-System:**
- Generiert via RPC `suggest_startup_slug(p_name text)` (SECURITY DEFINER,
  EXECUTE für anon+authenticated). Lowercase, Umlaute-Translit (ä→a, ö→o,
  …, ß→s), Sonderzeichen → Bindestriche, dedupliziert via Counter-Suffix
  (`deepjudge`, `deepjudge-1`, `deepjudge-2`).
- DB-Constraint `slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'` + `unique`.
- Editor kann Slug im Edit-Drawer ändern; `updateStartup` fängt
  Unique-Constraint-Violation und zeigt "Slug ist bereits vergeben".

**RLS-Policies:**
- `ai_startups_public_read` — anon liest `published` + `featured`
- `ai_startups_editor_all` — Editor FULL access auf alle Rows
- `ai_startups_anon_submit` — anon + authenticated dürfen mit
  `status='pending'`, ohne `reviewed_*`/`published_at`, mit
  `submitter_name/email` einreichen

**API-Module:**
- `src/lib/startupApi.ts` — `getPublishedStartups`, `getFeaturedStartups`,
  `getStartupBySlug` (RLS-gated, nur published/featured), `getAllStartupsForAdmin`,
  `getPendingStartupCount`, `getFeaturedStartupCount`, `getStartupIndustries`,
  `getStartupCities`.
- `src/lib/startupActions.ts` — Editor-CRUD + `submitStartupExternal`
  (anon-callable). `requireEditor`-Helper.
- `src/lib/mappers/startupMappers.ts` — `startupToCardVM`, `SWISS_STATUSES`,
  `EMPLOYEE_RANGES`, `FUNDING_STAGES`, `INDUSTRIES` (DB-code ↔ DE-Label-Mapping).

**Daten-Flow:**
- DB hält Lowercase-Enum-Codes (`swiss_based`, `r_11_50`, `series_a`)
- UI nutzt deutsche/proper Labels via Mapper (`Swiss Based`, `11–50`, `Series A`)
- Founder/Submitter ist **niemals** ein Author — kein Author-Linking, nur
  `submitter_name/email/role` als opaque Text

**Routes:**
- Public: `/swiss-ai` (Server-Component + Client `StartupsBrowser` Filter),
  `/swiss-ai/[slug]` (Detail-Page mit Spotlight-Badge, Investor-Block bei
  `open_to_investment=true` oder Funding-Felder vorhanden, Founders-Block,
  Website-CTA; RLS-gated — nur published/featured, sonst 404 via `notFound()`,
  `generateMetadata` für SEO),
  `/swiss-ai/einreichen` (3-Step-Wizard mit Live-Vorschau + Server-Action-Submit)
- Editor-Admin: `/autor/admin/startups` — Tabs (Pending default) +
  Spotlight-Counter + Vorschau-Modal + Edit-Drawer + Reject-Reason-Modal.
  Kein Author-Suite-Tab.

**Founder-Pattern:** Anon-Submission, kein Founder-Self-Service, kein
Email-Bestätigung-Loop (Phase 8+). Investor-Felder (Funding Stage, Total
Funding, Last Round, Pitch Deck URL, Founder Names) sind alle optional;
Editor toggled `open_to_investment` explizit via Admin-UI — Submitter kann
das im Step-3-Form vorschlagen, Editor entscheidet final.

### Editor-Admin-API (`src/lib/editorAdminApi.ts`)

- `getAllAuthors` — alle Authors + `article_count` aggregation, sortiert
  (aktive zuerst, dann display_name)
- `getAuthorById`
- `getAllInvites` — mit `invited_by`-Join und derived status
- `getEditorPerformanceStats` — Aggregat für Dashboard-Editor-Block

**Server Actions:**
- `inviteActions.ts` — `createInvite`, `createAuthorWithInvite`,
  `createAuthorPlaceholder`, `revokeInvite`, `resendInvite`,
  `generateInviteForExistingPlaceholder`. Alle prüfen `role === 'editor'`.
- `authorAdminActions.ts` — `updateAuthorAsEditor`, `deleteAuthorAsEditor`.
  Delete macht Pre-Check auf `articles.author_id`-Count.

### Supabase-Client-Module (`src/lib/supabase/`)

- `client.ts` — Browser-Client für Client Components (`createBrowserClient`)
- `server.ts` — Server-Client für Server Components, Route Handlers, Server
  Actions (`createServerClient` + `cookies()` aus `next/headers`)
- `proxy.ts` — Session-Refresh-Helper für Next.js 16 Proxy. Nicht direkt in
  Components verwenden; wird nur von `src/proxy.ts` genutzt.

Auth-Gate für `/autor/*` läuft als Server-Component-Layout (`src/app/autor/layout.tsx`),
nicht als Proxy-Logik — Proxy refresht nur die Session.

### Daten-Layer (`src/lib/`)

**Read-only-Server-Queries (Server Components):**
- `articleApi.ts` — `getFeaturedArticles`, `getArticlesByCategory`, `getArticleBySlug`
- `authorApi.ts` — `getCurrentAuthor`, `getAuthorByHandle`, `getArticlesByAuthor`,
  `getMyArticles`, `getArticleById`, `getRevisions`, `getDashboardStats`, `signOut`
- `podcastApi.ts` — `getPublishedPodcasts`, `getMyPodcasts`, `getPodcastById`
- `editorAdminApi.ts` — `getAllAuthors`, `getAuthorById`, `getAllInvites`,
  `getEditorPerformanceStats`. Editor-only durch RLS gated.
- `promptApi.ts` — `getPublishedPrompts`, `getFeaturedPrompts`, `getPromptById`,
  `getMyPrompts`, `getAllPromptsForAdmin`, `getPromptCategories`,
  `getPendingPromptCount`.

**Server Actions / Mutationen (`"use server"`-Module, callable aus Client Components):**
- `authorActions.ts` — `createDraft`, `saveArticle`, `submitForReview`,
  `publishArticle`, `archiveArticle`, `deleteArticle`, `updateAuthorProfile`.
  Jede Action prüft Auth + revalidiert betroffene Paths.
- `podcastActions.ts` — `createPodcast`, `updatePodcast`, `deletePodcast`.
  `requireInternalAuthor` blockiert external-Authors.
- `inviteActions.ts` — `createInvite`, `createAuthorWithInvite`,
  `createAuthorPlaceholder`, `revokeInvite`, `resendInvite`,
  `generateInviteForExistingPlaceholder`. `requireEditor`-Helper.
- `authorAdminActions.ts` — `updateAuthorAsEditor`, `deleteAuthorAsEditor`.
  Delete macht Pre-Check auf Articles.
- `promptActions.ts` — `createPrompt`, `updatePrompt`, `deletePrompt`
  (Author-CRUD), `submitPromptExternal` (anon), `approvePrompt`, `rejectPrompt`,
  `toggleFeatured`, `archivePromptAsEditor`, `restoreToPending`,
  `incrementPromptUses`. `requireInternalAuthor` + `requireEditor`-Helpers.

**Helpers:**
- `markdownBlocks.ts` — Bidirektionaler Markdown ↔ Block[] Konverter.
  Editor toggelt zwischen Visual (BlockEditor) und Markdown-Editor; DB hält
  immer `body_md`.
- `mappers/articleMappers.ts` — DB-Row → Card-Component-Props
  (`articleToCard`, `articleToListRow`, `authorToProfileViewModel`).
- `mappers/podcastMappers.ts` — DB-Row → Card-VM (`podcastToCardVM`) plus
  `PODCAST_LANGUAGES`-Konstante.
- `mappers/promptMappers.ts` — `promptToCardVM` plus `PROMPT_CATEGORIES`,
  `PROMPT_TESTED_WITH`, `PROMPT_DIFFICULTIES`-Konstanten (DB-code ↔ DE-Label-Mapping).

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

### Author-Suite (Session E)

`(suite)/layout.tsx` rendert den Auth-Gate UND wrapt children in `AuthorShell`
(Server-Component). Damit können die einzelnen Suite-Pages "use client" sein
ohne direkt eine async Server-Component zu importieren. AuthorShell holt den
aktuellen Author via `authorApi.getCurrentAuthor` und reicht einen schlanken
`AuthorChip`-View-Model an Sidebar/TopNav weiter.

**Eine Inhalts-Instanz (PR 181):** AuthorShell rendert `{children}` genau
einmal in einem einzigen `<main class="a-shell__main">`. Nur die Navigation
wechselt rein per CSS (kein matchMedia, keine Hydration-Unterschiede):
unter 768px Sperrbildschirm `AuthorMobileBlock` (`mobile="block"`, `<main>`
per CSS ausgeblendet) bzw. `AuthorMobileBar` (`mobile="allow"`, z. B.
Freigaben), 768–1023px `AuthorTopNav` (sticky), ab 1024px `AuthorSidebar`
(fixed, `<main>` mit `margin-left: var(--sidebar-w)`). Breakpoints
einheitlich 768/1024 (AuthorSidebar blendet sich bei `max-width: 1023px`
aus, MobileEditorWarning greift bis 1023px). Frueher stand der Inhalt zwei-
bis dreimal im DOM (doppelte Tiptap-Editoren, Effects, DOM-IDs); feste IDs
in Suite-Komponenten sind seither unproblematisch, `useId()` bleibt dennoch
die Regel.

**Editor (`/autor/artikel/[id]`)** ist ein Server/Client-Split:
- `page.tsx` (server) fetcht Article + Revisions + Categories + Current Author
- `EditorClient.tsx` (client) trägt Form-State, ruft Server Actions auf
- Status-Workflow: draft → in_review (Author) → published / archived (Editor).
  RLS gating durchgehend.
- Revisions werden bei jedem Update mit title-/body-snapshot in der `revisions`-
  Tabelle festgehalten (DB-Trigger `articles_revision_on_update`).

**Block-Editor (Phase 8b/c)** — strukturierte Block-Persistenz statt
freiem Markdown:

- **Storage:** `articles.body_blocks jsonb` (nullable) hält ein
  `BlockDocument`-Objekt `{ version, blocks, sources }`. `body_md` wird beim
  Save server-seitig aus body_blocks via `renderBlockDocumentToMarkdown`
  regeneriert — bleibt simplifizierte/suchbare Repräsentation, kein
  Roundtrip-Ziel mehr.
- **Source-of-Truth:** Visual-Editor schreibt `body_blocks`, Server überschreibt
  `body_md` beim Patch. Markdown-Modus wird Read-Only sobald `body_blocks`
  Special-Blocks enthält (StatBox, Disclaimer, InternalArticleCard, oder
  irgendwelche Sources). Banner zeigt das im UI.
- **Legacy-Migration:** Wenn `body_blocks IS NULL` und `body_md` nicht leer,
  zeigt der Editor beim Markdown→Visual-Wechsel `LegacyMigrationModal`. Auf
  Bestätigung wird `markdownToBlocks(body_md)` einmalig in body_blocks
  geparst.

**Block-Typen** (`src/types/blocks.ts`):
- Basis: `heading` (H2/H3/H4), `paragraph`, `quote`, `list`, `code`, `image`,
  `divider` (full / short)
- Special (machen Markdown read-only): `statbox` (3 fixed items),
  `disclaimer` (mit optionalem akzent-Link), `internalArticleCard`
  (Cover + Title + Excerpt, Cache wird beim Verlinken gespeichert)

**Inline-Marker im `block.content`** (Markdown-Subset + Custom):
- `**bold**`, `_italic_`, `[text](url)`
- `[[slug]](Title)` — Internal-Link auf `/artikel/<slug>`
- `{{g}}…{{/g}}` / `{{o}}…{{/o}}` — Highlight Grün/Orange
- `{{lg}}…{{/lg}}` / `{{xl}}…{{/xl}}` — Font-Size Large/XL
- `[^N]` — Source-Reference auf `sources[N-1]`

Eingesetzt durch `FloatingToolbar` (zeigt bei Text-Selektion in Paragraph/
Quote-Content). Heading + List-Items: keine Toolbar in dieser PR.

**WICHTIG — Editor ist NICHT WYSIWYG für Inline-Formatierung.** Inline-
Marker erscheinen im Editor-Textarea als Roh-Text (`**bold**`,
`{{g}}…{{/g}}` etc.). Bewusste Trade-off-Entscheidung: ein echter WYSIWYG-
Editor (Tiptap o.ä.) wäre Phase-8b/c gesprengt; Tiptap-Migration kommt in
einer eigenen Phase. Authors sehen die gerenderte Markup in der
**Vorschau-Tab** im Editor. Hinweis-Banner im Visual-Tab macht das
transparent.

**Editor-Polish (Phase 8c-2):**
- **Block-Tools-Grid:** Move-Up/Down/Add/Delete als 2×2-Grid links neben
  jedem Block (statt horizontaler Reihe). Reihenfolge: oben ↑/↓, unten +/×.
- **Inline-Toggle-Stack:** `apply()` in `InlineToolbarTextarea` peelt
  bekannte Wrap-Pairs (`**`, `_`, `{{g}}`, `{{o}}`, `{{lg}}`, `{{xl}}`)
  sowohl INNERHALB der Selektion (User hat die Wrapper mit-markiert,
  z.B. nach vorherigem Bold-Klick) als auch AUSSERHALB. Beide Richtungen
  fliessen in einen Stack zusammen, dann wird das Toggle-Target
  addiert (als äusserster) oder entfernt. Damit funktionieren
  Kombinationen wie Bold+Italic+Highlight additiv ohne Doppelwraps.
  Mutex-Gruppen: Green ↔ Orange (Highlight) und Large ↔ XL (Font-Size)
  sind jeweils Alternativen — Setzen des einen entfernt das andere.
- **Selektion-nach-Wrap** umfasst den GESAMTEN emittierten Bereich inkl.
  aller Wrapper. Damit erkennt der nächste Toolbar-Klick die Wraps
  innerhalb der Selektion und kann additiv arbeiten oder togglen.
- **Format-Reset-Button** ganz rechts in der FloatingToolbar (Tx-Icon):
  baut mit leerem Stack neu auf → strippt ALLE bekannten Wraps um die
  Selektion in einem Durchgang, egal wie verschachtelt. Block-Alignment
  bleibt unberührt (lebt im Block-Objekt, nicht im Text).
- **Block-Tools-Hover-Bridge:** Das Tool-Set links neben jedem Block hat
  `paddingRight: 16` als unsichtbare Hit-Area, die die 16px-Lücke zur
  Block-Linkskante überbrückt. Sonst feuert beim Wechsel vom Block-
  Inhalt zum Tool-Set ein `mouseleave` und die Tools verschwinden bevor
  der User klicken kann.
- **Text-Alignment-Buttons** zwischen Italic und Link-Pfeil (Separator
  davor). Vier Optionen: Links / Zentriert / Rechts / Blocksatz. Wirkt
  auf den ganzen Block (paragraph/quote — heading/list haben keine
  FloatingToolbar). Persistiert via `Block.alignment?: TextAlignment`
  in body_blocks; body_md verliert das Feld beim Export (akzeptabel —
  body_blocks ist Source-of-Truth). BlockReader rendert
  `style={{textAlign}}` direkt im jeweiligen Element.
- **List-Spacing** in `.article-body ul/ol`: margin-top `-12px`
  (zieht Listen näher an vorherigen Block), margin-bottom `20px`,
  li.margin-bottom `6px`. Scope ist `.article-body` — andere Listen
  (Nav, Sidebars) bleiben unverändert.

**Source-System (SourceList):**
- Quellen in `BlockDocument.sources: Source[]`, jede mit stabiler ID.
- Inline-Marker `[^N]` ist 1-indexed und referenziert `sources[N-1]`.
- `BlockReader` (Public-Page) macht Auto-Renumbering on-the-fly: walks block-
  Content in Reihenfolge, baut Mapping `originalN → displayN`, rendert
  Marker als `displayN` und Source-Liste am Article-Ende in derselben
  Reihenfolge. Dangling References werden ausgeblendet.
- Source-Picker-Modal (`SourcePicker.tsx`) zeigt existierende Quellen
  + erlaubt neue anzulegen. Keine explizite Lösch-UI in v1 — verwaiste
  Sources bleiben in `sources[]` ohne Public-Render-Impact.

**Featured Image:** `FeaturedImageBox` in der Editor-Sidebar (oben über
Statistiken). Nutzt den `ImageUploader` aus Phase 8a, schreibt direkt
in `cover_image_url` (Listing-Cards + Detail-Page-Hero greifen drauf zu).

**Frontend-Renderer:** `BlockReader` rendert alle Typen + Inline-Marker
via Pattern-Matching (kein dangerouslySetInnerHTML — alles geht durch
React-Escaping).

**Article-Detail-Page (`/artikel/[slug]`):** lädt `body_blocks` aus der DB
direkt, fällt für Legacy-Artikel auf `markdownToBlocks(body_md)` zurück.
Übergibt komplettes `BlockDocument` an `BlockReader` (damit Sources auch
ohne body_blocks-Special-Blocks korrekt rendern).

**Statistiken** zeigt nur Zahlen aus der DB (Counts, total Wörter). Sparklines/
Heatmaps für Views/Reads wurden bewusst entfernt — kommen erst mit echter
Event-Tracking-Integration (Phase 8 mit Plausible/PostHog/Supabase-Events).

**Merge-on-first-login (Session E):** Der Auth-Trigger `handle_new_user`
prüft jetzt vor Insert ob ein authors-Row mit gleicher Email + `user_id IS NULL`
existiert (Placeholder aus Session-C-Seed). Falls ja, claimt er die Row durch
setzen von user_id. Sonst Insert wie vorher.

**Wichtig — Merge greift nur bei exaktem Email-Match.** Wenn ein Mock-Author
mit Platzhalter-Email gesseeded wurde (z.B. `placeholder@digital-age.ch`)
und der echte Login eine andere Email nutzt (`real-login@example.com`),
wird ein neuer `external`-Row angelegt — der Editor-Row bleibt unverlinkt.
Der Merge muss dann manuell via SQL erfolgen:

```sql
-- Vor Cleanup: prüfen ob der external-Row Artikel/Podcasts hat
SELECT COUNT(*) FROM public.articles WHERE author_id = '<external-id>';
SELECT COUNT(*) FROM public.podcasts WHERE recommended_by_id = '<external-id>';

-- Wenn beide 0: user_id auf den Editor-Row umhängen, external-Row löschen
UPDATE public.authors
SET user_id = '<auth-user-id>', email = '<real-login-email>'
WHERE id = '<editor-row-id>';

DELETE FROM public.authors WHERE id = '<external-row-id>';
```

Beispiel-Fix dokumentiert in PR #22 (Session E Folge-Fix). Künftige Seeds
sollten mit der echten Login-Email anlegen, sonst wiederholt sich das Problem.

### Author-Routing-Split (Session C Fix-Up)

`src/app/autor/` ist in zwei Route-Groups gesplittet:

- `(public)/[slug]/` — öffentliche Author-Profile, kein Auth-Gate
- `(suite)/` — Author-Suite (Dashboard, Profil, Artikel, Podcasts, etc.) hinter
  Auth-Gate (`(suite)/layout.tsx` redirected auf `/login` wenn keine Session)

Route Groups sind URL-transparent: `/autor/ali-soy` bleibt `/autor/ali-soy`,
`/autor/dashboard` bleibt `/autor/dashboard`.

**Pfad-Gates für Site-Chrome (PR D):** Navbar, NewsTicker, Rails, CMP-Banner,
GA4 und der Footer-Button „Cookie-Einstellungen“ entscheiden über
`src/lib/siteChrome.ts`, nicht über `startsWith("/autor/")`.

- **Neue Suite-Route** unter `src/app/autor/(suite)/` → Segment in
  `AUTHOR_SUITE_PREFIXES` ergänzen. Sonst bekommt sie Navbar, Ticker, Rails,
  CMP-Banner und GA4, und das gleichnamige Autoren-Handle bleibt frei
  (`RESERVED_AUTHOR_HANDLES` leitet sich aus der Liste ab und wird in
  `updateAuthorProfile` / `updateAuthorAsEditor` geprüft).
- **Neue Seite ohne Site-Chrome und ohne Tracking** (wie `/vorschau`) →
  `CHROMELESS_PREFIXES`.

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

### WordPress-Migration (Phase 8d)

Skript `migration/import-wp-articles.ts` importiert einen WordPress-XML-
Export als `draft`-Artikel. Lauf:

```bash
export SUPABASE_URL="https://<ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY=$(npx supabase projects api-keys --project-ref <ref> 2>/dev/null | awk '/service_role/ {print $3}')
npx tsx migration/import-wp-articles.ts migration/wordpress-export.xml --dry-run
# bei sauberem Dry-Run:
npx tsx migration/import-wp-articles.ts migration/wordpress-export.xml
```

- Service-Role-Key wird nur lokal in der Shell-Session gehalten — NIE
  committen, NIE in `.env.local` mit `NEXT_PUBLIC_`-Prefix.
- Idempotent: vor Insert wird per Slug geprüft, Re-Runs sind safe.
- Author-Matching per `wp:author_email` gegen `authors.email`
  (case-insensitive).
- Category-Mapping in `migration/lib/category-resolver.ts`.
- HTML → Markdown via Turndown, dann zu `BlockDocument` via
  `markdownToBlocks`.
- Cover-Image bleibt zunächst auf WP-Attachment-URL (extern); Bilder-
  Migration in Supabase-Storage kommt in Phase 8e.
- Logs in `migration/logs/` (gitignored).
- Der `migration/wordpress-export.xml` ist gitignored — der User stellt
  ihn lokal bereit.

**v2-Erweiterungen** (`migration/lib/html-to-blocks.ts`):
- DOM-Pre-Processing via `@mixmark-io/domino` (turndown's eigener DOM).
- **Source-URL-Mapping:** findet `<h2 id="sources">` + nachfolgende `<ol>`
  oder `<p>` mit `[N] <a>` + `<br>`. Source-Liste + vorangehender `<hr>`
  aus dem Body entfernt.
- **AI-Disclaimer-Block:** Detection via `wp:block {"ref":1915}` Marker
  (Reusable-Block-ID 1915 = "KI-Transparenz · Vorlage" in digital-age.ch).
  Sprache wird per Title-Heuristik DE/EN bestimmt, Default-Disclaimer-Block
  mit Link auf `/ki-transparenz` ans Ende der Blocks angehängt.
- **Divider-Normalisierung:** Post-Turndown Regex `* * *` / `***` /
  `- - -` → `---` (wird zu `divider`-Block in `markdownToBlocks`).

**v3-Erweiterungen** (Korrektur des Source-Formats + Highlight-Bugfix):
- **Source-Refs als `[^N]`-Marker** (statt externer Markdown-Links): Inline-
  Refs `[\[N\]\[M\]](#sources)` werden zu `[^N][^M]…`. Der `BlockReader`
  rendert daraus hochgestellte Source-Links wie für manuell erstellte
  Artikel.
- **`BlockDocument.sources[]` befüllt:** ID `src-${N}`, `text` aus dem
  `<li>`-Anchor (oder Domain-Fallback `Order.co` etc.), `url` aus erstem
  `<a href>` im `<li>`.
- **Highlights — Rule-Ordering-Bug gefixt:** Turndown evaluiert Rules in
  umgekehrter Registrierungsreihenfolge. Generic-Mark-Fallback wird jetzt
  zuerst registriert (damit zuletzt geprüft), spezifische grün/orange
  Rules danach.
- **Highlight-Detection nutzt `background-color`-Wert** statt nur Class-
  Namen: WP/Astra benutzt `has-ast-global-color-2-color` Class auch für
  reine Foreground-Farbe (`background-color: rgba(0,0,0,0)`). Solche Marks
  sind KEINE Highlights und werden nicht umgewandelt.
- **Highlight-Format `{{g}}**bold**{{/g}}`** (Bold INNEN, Marker AUSSEN):
  Für WP-Pattern `<strong><mark>X</mark></strong>` zieht die Mark-Rule
  das `**` selbst rein, und eine zusätzliche Strong-Rule erkennt diesen
  Fall und gibt nur den content zurück (keine doppelten `**`).
- **Excerpt komplett `null`:** Skript schreibt keinen Excerpt mehr. User
  pflegt manuell via "Zusammenfassung erstellen"-Button im Editor.
- **Excerpt-Strip-Logik** (PR #37) bleibt im Code aber wird nicht mehr
  aufgerufen (Vergleichs-Excerpt ist immer leer).

Stopp-Kriterien im Skript:
- Wenn mehr als 5 Posts ohne match-baren Author → Abbruch mit Exit-Code 2.
- Unbekannte WP-Categories → Warning + Fallback auf `future-tech`.
- Im echten Run (nicht Dry-Run): bei vorhandenen Drafts in der DB
  interaktiver Prompt mit Anleitung zum manuellen Cleanup.

### WP-Bilder-Migration (Phase 8e)

Skript `migration/migrate-wp-images.ts` migriert alle Bilder, die auf
`https://digital-age.ch/wp-content/uploads/...` zeigen, ins Supabase-
Storage-Bucket `articles` unter Pfad-Schema `{article_id}/{slugified-name}`.

```bash
export SUPABASE_URL="https://<ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY=$(npx supabase projects api-keys --project-ref <ref> 2>/dev/null | awk '/service_role/ {print $3}')
npx tsx migration/migrate-wp-images.ts --dry-run
# bei sauberem Dry-Run:
npx tsx migration/migrate-wp-images.ts   # interaktive JA-Bestätigung
```

- Wird auf alle `articles` mit `status='published'` angewendet
- Aktualisiert `cover_image_url` plus `image`- und `internalArticleCard`-
  Block-URLs im `body_blocks`-JSONB
- Idempotent via Storage-File-Listing pro Article-Folder
- Original-WP-URL bleibt erhalten falls Download/Upload fehlschlägt
- Filename-Slugifier strippt WP-Grössen-Suffixe (`-1024x576` etc.) und
  Umlaute
- Bucket-Whitelist nur JPEG/PNG/WebP/GIF — AVIF wird übersprungen mit
  Warning

Erste Live-Migration: 91 Bilder migriert, 7 skip-existing, 1 failed
(AVIF, Original-URL bleibt). 42 von 51 Artikeln aktualisiert.

### Editor: Lektionen aus PRs 103, 104 und dem Roundtrip-Guard

- **Tiptap-Paste frisst Zeilenumbrüche (PR 103).** Features mit rohem Markdown
  oder Klartext dürfen nie über den Tiptap-Paste-Pfad laufen: ProseMirror nimmt
  den HTML-Zweig und kollabiert `\n` zu Whitespace. Lösung ist immer ein
  natives `<textarea>` als Eingabequelle, danach Konvertierung über
  `markdownToBlocks`/`blocksToTiptap`.
- **Body-Text für AI-Input über `stripAllMarkup` (PR 104).** Bevor Text an die
  AI geht, müssen `[^N]`, `{{g}}`-Marker und ähnliche Tokens raus
  (`stripAllMarkup` in `src/lib/`), sonst landen sie im Output. Gilt für alle
  AI-Tasks, auch Hero Studio (Klartext des Body aus dem Editor-State).
- **Guard-Grenze.** Der Self-Fixpoint-Guard (`roundtripGuard.ts`) prüft nur,
  ob Blocks → Tiptap → Blocks wieder dasselbe ergibt. Einen Verlust, der schon
  auf dem Weg Editor → `getJSON()` passiert (idempotente Verluste), kann er
  nicht sehen. Unbekannte Inline-Nodes werden also nicht gemeldet, sondern
  verschwinden still.
- **Globaler `.tiptap-popover`-Selektor.** Liegt app-weit in
  `src/components/author/tiptap/tiptap-editor.css` (nicht unter
  `.da-tiptap-editor` gescoped), weil Popover in ein Portal rendern.
- **Zeilenumbruch.** `hardBreak` ↔ `\n` ist in `blocksToTiptap` symmetrisch,
  Shift-Enter und der Toolbar-Knopf «Zeilenumbruch» (`LineBreakButton`, für
  das iPad) überleben Speichern und Neuladen. Caret-Farbe der Editor-Zonen:
  `--tt-cursor-color` in `tiptap-editor.css` (grün statt Vendor-Violett).

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
