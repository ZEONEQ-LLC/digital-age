-- Bug-Fix: suggest_startup_slug verlor Großbuchstaben.
--
-- Alte Reihenfolge: translate() umlaut→ascii, regexp_replace([^a-z0-9]→-), lower()
-- Problem: regexp_replace lief VOR lower(), also matchten Großbuchstaben
-- (A-Z) nicht [a-z0-9] und wurden durch '-' ersetzt → "Connect AI Group GmbH"
-- → "onnect-roup-mb" statt "connect-ai-group-gmbh".
--
-- Neue Reihenfolge: lower() zuerst, dann translate() (für Umlaute), dann regexp_replace.

create or replace function public.suggest_startup_slug(p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text;
  candidate text;
  counter integer := 0;
begin
  base_slug := lower(translate(p_name, 'äöüÄÖÜß', 'aouaous'));
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then
    base_slug := 'startup';
  end if;

  candidate := base_slug;
  while exists (select 1 from public.ai_startups where slug = candidate) loop
    counter := counter + 1;
    candidate := base_slug || '-' || counter;
  end loop;
  return candidate;
end;
$$;
