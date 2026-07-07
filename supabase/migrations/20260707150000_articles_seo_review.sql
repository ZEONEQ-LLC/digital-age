-- SEO-Review persistent (PR): Analyse-Ergebnis überlebt Reload.
--
-- Zwei neue Spalten auf articles + eine RPC zum Speichern. Kein Verlauf
-- (nur der letzte Stand). Fehlgeschlagene/leere Analysen überschreiben
-- den letzten Stand NICHT (die App ruft die RPC nur nach erfolgreichem
-- Parse).

alter table public.articles
  add column seo_review jsonb,
  add column seo_review_at timestamptz;

-- Speichert das Review + Zeitstempel in EINER Transaktion. Wichtig:
-- seo_review_at = now() ist DERSELBE Transaktions-Zeitpunkt, den auch der
-- bestehende BEFORE-UPDATE-Trigger trg_articles_updated_at fuer updated_at
-- verwendet (now() = transaction_timestamp(), stabil innerhalb der Txn).
-- Damit gilt nach dem Speichern seo_review_at == updated_at exakt, und die
-- Staleness-Pruefung `updated_at > seo_review_at` ist erst nach einer
-- SPAETEREN Artikel-Aenderung wahr. Ein App-seitig gesetzter Zeitstempel
-- waere dagegen systematisch kleiner als updated_at (Netzwerk-Latenz) und
-- wuerde sofort false-stale zeigen.
--
-- SECURITY INVOKER (Default): die UPDATE laeuft mit den Rechten des
-- Aufrufers → die bestehenden articles-RLS-Policies greifen (Autor nur
-- eigene draft/in_review, Editor alle). Kein neues Policy-Design. Bei
-- RLS-Block oder unbekannter id werden 0 Zeilen aktualisiert und die
-- Funktion gibt null zurueck (App behandelt das graceful: Review wird
-- angezeigt, nur nicht persistiert).
--
-- Der Revision-Trigger create_article_revision feuert hier NICHT, weil
-- weder title noch body_md geaendert werden.
create or replace function public.save_seo_review(
  p_article_id uuid,
  p_review jsonb
)
returns timestamptz
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ts timestamptz;
begin
  update public.articles
     set seo_review = p_review,
         seo_review_at = now()
   where id = p_article_id
   returning seo_review_at into v_ts;
  return v_ts;
end;
$$;

grant execute on function public.save_seo_review(uuid, jsonb) to authenticated;

-- ROLLBACK (auskommentiert, nur als Doku):
-- drop function if exists public.save_seo_review(uuid, jsonb);
-- alter table public.articles drop column if exists seo_review_at;
-- alter table public.articles drop column if exists seo_review;
