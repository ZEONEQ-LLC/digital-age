-- SEO-Review Iteration 2: Abhaken (done) persistieren, ohne Staleness zu
-- verfaelschen.
--
-- Problem: der generische set_updated_at-Trigger bumpt articles.updated_at
-- bei JEDEM Update. Ein reines seo_review-Update (Done-Toggle, oder die
-- Analyse-Speicherung) wuerde damit updated_at > seo_review_at machen und
-- die "Artikel wurde seit der Analyse geaendert"-Anzeige faelschlich
-- ausloesen.
--
-- Loesung: articles bekommt einen EIGENEN updated_at-Trigger, der updated_at
-- NICHT bumpt, wenn AUSSCHLIESSLICH seo_review / seo_review_at geaendert
-- wurden. Alle anderen Aenderungen bumpen wie bisher. Minimal-invasiv — der
-- generische set_updated_at bleibt fuer alle anderen Tabellen unveraendert.

create or replace function public.articles_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_probe public.articles;
begin
  -- Probe = NEW, aber mit den seo_review-Feldern auf den OLD-Stand
  -- zurueckgesetzt. Ist die Probe dann gleich OLD, haben sich NUR
  -- seo_review / seo_review_at geaendert → kein updated_at-Bump.
  v_probe := new;
  v_probe.seo_review := old.seo_review;
  v_probe.seo_review_at := old.seo_review_at;
  if v_probe is distinct from old then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_articles_updated_at on public.articles;
create trigger trg_articles_updated_at
  before update on public.articles
  for each row execute function public.articles_set_updated_at();

-- RPC zum Speichern der Done-Flags (Review-jsonb) OHNE seo_review_at zu
-- aendern. SECURITY INVOKER → bestehende articles-RLS greift. Updated nur,
-- wenn bereits ein Review existiert (kein Neuanlegen ueber diesen Pfad —
-- der Analyse-Pfad save_seo_review setzt seo_review_at). Returnt true bei
-- Treffer, sonst false (RLS-Block, kein Review, unbekannte id).
create or replace function public.update_seo_review_done(
  p_article_id uuid,
  p_review jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_found boolean;
begin
  update public.articles
     set seo_review = p_review
   where id = p_article_id
     and seo_review is not null
  returning true into v_found;
  return coalesce(v_found, false);
end;
$$;

grant execute on function public.update_seo_review_done(uuid, jsonb) to authenticated;

-- ROLLBACK (auskommentiert, nur als Doku):
-- drop function if exists public.update_seo_review_done(uuid, jsonb);
-- drop trigger if exists trg_articles_updated_at on public.articles;
-- create trigger trg_articles_updated_at before update on public.articles
--   for each row execute function public.set_updated_at();
-- drop function if exists public.articles_set_updated_at();
