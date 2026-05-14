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
- Bucket-Limit: max 5 MB, JPEG/PNG/WebP/GIF
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
- Auth-Settings im Dashboard: Site URL + Redirect URLs müssen sowohl Vercel
  (`https://digital-age-v2-eight.vercel.app/**`) als auch Container
  (`http://claude-box.orb.local:3000/**`) und localhost abdecken
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
  `/ai-prompts/[id]` (Detail-Page mit vollem Kontext, Beispiel-Output,
  Author-Block; RLS-gated — nur published/featured, sonst 404 via `notFound()`,
  `generateMetadata` für SEO),
  `/ai-prompts/einreichen` (Client Form + Server-Action-Submit)
- Author-Suite: `/autor/prompts` — eigene CRUD via Drawer-Form
- Editor-Admin: `/autor/admin/prompts` — Tabs (Pending default) + Vorschau-Modal
  + Reject-Reason-Modal

**Card-Navigation:** `PromptCard` ist ein `<Link>`-Wrapper auf `/ai-prompts/[id]`.
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
