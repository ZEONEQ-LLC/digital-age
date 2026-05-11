-- Phase 7 Session C — Article Featured + Reading Stats
-- is_featured steuert die Homepage-Bento-Section.
-- word_count und reading_minutes werden via Trigger automatisch berechnet
-- beim Insert/Update von body_md (200 Wörter/Minute, min 1 wenn Body vorhanden).

alter table articles
  add column is_featured boolean not null default false,
  add column word_count integer,
  add column reading_minutes integer;

create index idx_articles_is_featured on articles(is_featured) where is_featured = true;

create or replace function compute_article_reading_stats()
returns trigger as $$
declare
  body_text text;
  words integer;
begin
  body_text := coalesce(new.body_md, '');
  if trim(body_text) = '' then
    words := 0;
  else
    words := array_length(regexp_split_to_array(trim(body_text), '\s+'), 1);
    if words is null then
      words := 0;
    end if;
  end if;
  new.word_count := words;
  if words = 0 then
    new.reading_minutes := 0;
  else
    new.reading_minutes := greatest(1, round(words / 200.0));
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_articles_reading_stats
  before insert or update of body_md on articles
  for each row execute function compute_article_reading_stats();
