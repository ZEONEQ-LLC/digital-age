-- AI-Prompts: lesbarer Slug fuer /ai-prompts/<slug> statt der UUID (PR 190).
-- Additiv: neue Spalte, zwei Funktionen, ein Trigger, Backfill, Constraints.
--
-- Regel: Der Slug entsteht aus dem Titel (gleiche Transliteration wie
-- src/lib/articleSlug.ts: ae/oe/ue/ss, Akzente weg, a-z0-9 und Bindestriche,
-- Wortgrenze bis 60 Zeichen), bei Konflikt mit -2, -3 ... Solange ein Prompt
-- nie publiziert war (published_at null), folgt der Slug dem Titel. Danach
-- bleibt er, damit die URL stabil ist. Alte UUID-URLs leitet die Seite um.
--
-- Rollback:
--   drop trigger if exists ai_prompts_set_slug on public.ai_prompts;
--   drop function if exists public.set_ai_prompt_slug();
--   drop function if exists public.unique_ai_prompt_slug(text, uuid);
--   drop function if exists public.slugify_title(text, integer);
--   alter table public.ai_prompts drop column if exists slug;

alter table public.ai_prompts add column slug text not null default '';

create or replace function public.slugify_title(p_title text, p_max integer default 60)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  s text;
begin
  s := lower(normalize(coalesce(p_title, ''), nfc));
  s := replace(replace(replace(replace(s, 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss');
  s := translate(
    s,
    'àáâãåāăąçćčďèéêëēėęěìíîïīįłñńňòóôõøōőŕřśšşťùúûūůűýÿžźżđ',
    'aaaaaaaacccdeeeeeeeeiiiiiilnnnooooooorrssstuuuuuuyyzzzd'
  );
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := trim(both '-' from s);
  if length(s) > p_max then
    s := substring(s from 1 for p_max + 1);
    if position('-' in s) > 1 then
      s := regexp_replace(s, '-[^-]*$', '');
    else
      s := substring(s from 1 for p_max);
    end if;
    s := trim(both '-' from s);
  end if;
  return s;
end;
$$;

-- Eindeutiger Slug fuer einen Prompt (eigene Row ausgenommen). SECURITY
-- DEFINER, weil anon beim Einreichen keine fremden Rows lesen darf; nur der
-- Trigger ruft sie auf, kein EXECUTE fuer Clients.
create or replace function public.unique_ai_prompt_slug(p_title text, p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  n integer := 1;
begin
  base := public.slugify_title(p_title, 60);
  if base = '' then
    base := 'prompt';
  end if;
  candidate := base;
  while exists (
    select 1 from public.ai_prompts where slug = candidate and id is distinct from p_id
  ) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end;
$$;

revoke execute on function public.unique_ai_prompt_slug(text, uuid) from public, anon, authenticated;

create or replace function public.set_ai_prompt_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := public.unique_ai_prompt_slug(new.title, new.id);
  elsif tg_op = 'UPDATE'
    and new.title is distinct from old.title
    and old.published_at is null
    and new.slug = old.slug then
    new.slug := public.unique_ai_prompt_slug(new.title, new.id);
  end if;
  return new;
end;
$$;

revoke execute on function public.set_ai_prompt_slug() from public, anon, authenticated;

create trigger ai_prompts_set_slug
  before insert or update on public.ai_prompts
  for each row execute function public.set_ai_prompt_slug();

-- Backfill: oeffentliche Prompts zuerst, damit sie bei gleichem Titel den
-- Slug ohne Suffix bekommen; sonst in Anlage-Reihenfolge.
do $$
declare
  r record;
begin
  for r in
    select id, title from public.ai_prompts
    where slug = ''
    order by (status in ('published', 'featured')) desc, created_at, id
  loop
    update public.ai_prompts
      set slug = public.unique_ai_prompt_slug(r.title, r.id)
      where id = r.id;
  end loop;
end;
$$;

alter table public.ai_prompts add constraint ai_prompts_slug_key unique (slug);
alter table public.ai_prompts
  add constraint ai_prompts_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
