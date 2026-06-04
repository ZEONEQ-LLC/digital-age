-- System-Batch-Author: synthetische authors-Row fuer Service-Role-Batch-
-- Jobs, die ai_usage_log-Eintraege schreiben muessen (ai_usage_log.author_id
-- ist NOT NULL FK auf authors.id, daher braucht jeder Insert eine reale
-- author-Row). Wird z.B. vom Excerpt-Backfill-Skript verwendet
-- (migration/backfill-excerpts.ts), spaeter ggf. weitere Batch-Jobs.
--
-- Designentscheidung: getrennte Row statt eines echten Editor-Accounts
-- nutzen, damit Batch-Kosten/-Calls im Hauptbuch sauber von Editor-
-- Klicks trennbar bleiben. role='external' + user_id=null sorgt dafuer,
-- dass die Row in keiner Author-Suite-/Public-Liste auftaucht.
--
-- Idempotent via ON CONFLICT auf der eindeutigen Email.

insert into public.authors (slug, display_name, email, role, user_id)
values (
  'system-batch',
  'System Batch',
  'system-batch@digital-age.ch',
  'external',
  null
)
on conflict (email) do nothing;

-- ROLLBACK (auskommentiert — nur ausfuehren wenn keine ai_usage_log-Rows
-- mehr auf diese author_id verweisen, sonst greift on delete restrict):
-- delete from public.authors where email = 'system-batch@digital-age.ch';
