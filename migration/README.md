# WordPress → digital-age Migration

Standalone-Skript, das einen WordPress-XML-Export (Tools → Export → Beiträge)
ins Supabase-`articles`-Schema importiert. Importierte Artikel landen alle
als `status='draft'` — User publisht manuell in der Author-Suite.

**Bilder werden in dieser Phase noch nicht migriert.** Der Cover-Image-URL
wird wenn möglich auf den WP-Attachment-URL gesetzt (extern erreichbar), wird
in Phase 8e durch Supabase-Storage-URLs ersetzt.

## Voraussetzungen

- XML-Export liegt in `migration/wordpress-export.xml` (oder beliebiger Pfad
  als Argument übergeben).
- Authors-Tabelle in Cloud-DB enthält Einträge mit den Email-Adressen, die
  im WP-Export referenziert werden.
- Categories-Tabelle enthält mindestens die Slugs aus dem `WP_CATEGORY_MAP`
  (siehe `lib/category-resolver.ts`).
- `SUPABASE_URL` (oder `NEXT_PUBLIC_SUPABASE_URL`) + `SUPABASE_SERVICE_ROLE_KEY`
  in der Env. **NIEMALS** in den Repo committen — beide nur lokal in
  `.env.local` oder als Shell-Export.

## Service-Role-Key holen

Im OrbStack-Container, einmalig pro Session:

```bash
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="$(npx supabase projects api-keys --project-ref <project-ref> 2>/dev/null | awk '/service_role/ {print $3}')"
```

Verifikation:

```bash
echo "URL set: $([ -n "$SUPABASE_URL" ] && echo ja || echo NEIN)"
echo "Key set: $([ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && echo ja || echo NEIN)"
```

## Ausführung

**Erst Dry-Run** — parsed alles, schreibt nichts:

```bash
npx tsx migration/import-wp-articles.ts migration/wordpress-export.xml --dry-run
```

Output prüfen:
- Ist die Post-Anzahl plausibel?
- Werden Authors gematched?
- Werden Categories gemappt?
- Gibt es Conversion-Warnings (Shortcodes, etc.)?
- Stichproben in `migration/logs/sample-bodies-*.md` prüfen

**Echter Run** (writes in Cloud-DB):

```bash
npx tsx migration/import-wp-articles.ts migration/wordpress-export.xml
```

## Idempotenz

Vor jedem Insert wird per Slug geprüft, ob der Artikel schon existiert. Falls
ja: `[SKIP]`. Re-Runs sind ungefährlich.

Wenn du komplett neu importieren willst, manuell:

```sql
delete from articles where slug in (
  -- konkrete Slugs aus dem letzten Log-File
);
```

Oder breiter (Vorsicht — löscht ALLE drafts):

```sql
delete from articles where status = 'draft';
```

## Mapping-Regeln

### Author

`<wp:author><wp:author_email>` matched 1:1 gegen `authors.email`
(case-insensitive). Bei mehr als 5 Posts ohne Match bricht das Skript ab —
heisst: Email-Setup in der Authors-Tabelle nochmal prüfen.

### Category

WP-Posts haben oft mehrere Categories. Mapping-Regel:

1. `Featured` wird ignoriert (User featured manuell via UI).
2. Erste verbleibende Category aus `WP_CATEGORY_MAP` nehmen.
3. Falls keine matched: Default `future-tech`.

Mapping in `lib/category-resolver.ts`. Bei unbekannten Categories gibt's eine
Warning im Log, der Default greift.

### Tags

Alle `<category domain="post_tag">`-Einträge landen in `articles.tags` als
String-Array. `articles.subcategory` bleibt `null`.

### Excerpt

1. `<excerpt:encoded>` falls vorhanden und nicht leer
2. Sonst: ersten Paragraph aus dem Markdown, auf 200 Zeichen an Wortgrenze
3. Sonst: `null`

### Body

HTML → Markdown via Turndown, dann via `markdownToBlocks` zu Block-Doc.
- `<figure><img><figcaption>` wird zu `![alt](src)\n*caption*`
- WP-Block-Marker-Kommentare (`<!-- wp:paragraph -->`) werden gestrippt
- `<iframe>` (Embeds) werden zu Link-Markdown
- Tabellen, `[shortcode]`s: fallen auf Plain-Text durch, Shortcodes werden
  in Warnings geloggt

### Status

Immer `draft`, egal was in WP steht.

### Datum

`<wp:post_date_gmt>` → `articles.published_at` als ISO-UTC.

## Logs

Pro Lauf landet ein voller Log in `migration/logs/migration-<ISO-ts>.log`,
plus bei Dry-Run zusätzlich `sample-bodies-<ts>.md` mit den ersten 3
konvertierten Bodies. `migration/logs/` ist gitignored.

## Exit-Codes

- `0`: alles ok
- `1`: Args / Env-Setup-Fehler
- `2`: Pre-Check abgebrochen (z.B. mehr als 5 Authors fehlen)
- `3`: Mindestens 1 Post failed
- `99`: Unerwarteter Crash (Stack in stderr)
