# cleanup-orphan-drafts

Edge Function, die "echte" Orphan-Drafts aus der `articles`-Tabelle entfernt
inkl. zugehöriger Files im `articles`-Storage-Bucket.

## Kriterien für "echter Orphan"

Ein Article gilt als Orphan und wird gelöscht, wenn ALLE folgenden Bedingungen
zutreffen:

- `status = 'draft'`
- `title = 'Unbenannter Artikel'` (= unveränderter `createDraft`-Default)
- `body_md = ''` (= leer, nie editiert)
- `updated_at < now() - interval '7 days'`

Sobald der Author einmal Titel oder Body geändert hat, ist der Draft kein
Orphan mehr und bleibt erhalten — auch wenn er ein Jahr nicht angefasst wurde.

## Deploy

```bash
cd /projekt/digital-age
npx supabase functions deploy cleanup-orphan-drafts
```

Die Function nutzt automatisch die Env-Vars `SUPABASE_URL` und
`SUPABASE_SERVICE_ROLE_KEY`, die Supabase-Edge-Runtime injiziert.

Optional: ein Cron-Shared-Secret setzen, damit nur der Cron die Function
anstossen darf:

```bash
npx supabase secrets set CRON_SECRET=<random-string>
```

Wenn `CRON_SECRET` gesetzt ist, muss jeder Aufruf den Header
`x-cron-secret: <random-string>` mitsenden. Ohne Header (oder mit falschem
Wert) wird mit 401 abgelehnt.

## Schedule via Supabase Dashboard

Empfohlene Variante — flexibler und ohne Migration:

1. Dashboard → Edge Functions → `cleanup-orphan-drafts`
2. Tab "Cron schedules" → "Add cron schedule"
3. Schedule: `0 3 * * *` (täglich 03:00 UTC) oder `0 3 * * 0` (wöchentlich
   Sonntag 03:00 UTC) — Wahl liegt beim Operator
4. Falls `CRON_SECRET` gesetzt: HTTP Headers konfigurieren mit
   `x-cron-secret: <wert>`

## Schedule via pg_cron (Alternative, versioniert)

Falls der Schedule Teil der Migrations-History werden soll:

```sql
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'cleanup-orphan-drafts-weekly',
  '0 3 * * 0',
  $$
    select net.http_post(
      url := 'https://<project-ref>.functions.supabase.co/cleanup-orphan-drafts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', current_setting('app.cron_secret', true)
      )
    );
  $$
);
```

Achtung: `<project-ref>` müsste hardcoded in der Migration stehen oder via
GUC injiziert werden. Aus Repo-Hygiene-Gründen aktuell nicht der bevorzugte
Weg — Dashboard-Schedule ist sauberer.

## Manuelles Testing

```bash
# Lokal (mit supabase functions serve):
curl -X POST http://localhost:54321/functions/v1/cleanup-orphan-drafts \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"

# Production:
curl -X POST https://<project-ref>.functions.supabase.co/cleanup-orphan-drafts \
  -H "x-cron-secret: <wert>"
```

Antwort-Format:

```json
{
  "scanned": 3,
  "deleted": ["uuid-1", "uuid-2"],
  "errors": [{ "article_id": "uuid-3", "reason": "..." }]
}
```
