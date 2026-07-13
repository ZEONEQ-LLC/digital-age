-- Self-hosted Podcasts: zweiter Quellentyp neben den kuratierten externen
-- Empfehlungen. Self-hosted = eigenes Audio-File in Supabase Storage.
--
-- Neue Spalten:
--   source_type       'external' | 'self_hosted'  (required, default external
--                     -> Bestand bleibt gueltig)
--   audio_url         Storage-URL des MP3 (nur self_hosted)
--   duration_seconds  fuer Player-Anzeige
--   file_size_bytes   optional, RSS-enclosure length (spaeter)
--   slug              stabile URL fuer /podcast/[slug] + Share-Link
--
-- Cover bleibt cover_image_url (kein Rename -> kein Churn quer durch
-- Mapper/Card/Form). Upload UND externe URL schreiben in dieses Feld.

alter table public.podcasts
  add column source_type text not null default 'external'
    check (source_type in ('external', 'self_hosted')),
  add column audio_url text,
  add column duration_seconds integer,
  add column file_size_bytes integer;

-- Self-hosted erfordert audio_url. Externe Rows (auch der komplette Bestand)
-- erfuellen die Bedingung trivially, da source_type <> 'self_hosted'.
-- "external erfordert externe URL" wird bewusst NICHT DB-seitig erzwungen:
-- die Plattform-Links sind alle einzeln optional und Legacy-Rows koennten
-- keinen Link haben -> weiche Validierung im Formular.
alter table public.podcasts
  add constraint podcasts_self_hosted_needs_audio
  check (source_type <> 'self_hosted' or audio_url is not null);

-- Slug: erst nullable hinzufuegen, aus dem Titel backfillen, dann NOT NULL +
-- UNIQUE. Slugify-Logik identisch zu src/lib/podcastSlug.ts (lowercase,
-- Umlaut-Translit ae/oe/ue/ss, & -> und, Rest -> '-', Raender trimmen).
alter table public.podcasts add column slug text;

with slugged as (
  select
    id,
    trim(both '-' from regexp_replace(
      replace(replace(replace(replace(replace(
        lower(title),
        'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'), '&', 'und'),
      '[^a-z0-9]+', '-', 'g'
    )) as base
  from public.podcasts
),
numbered as (
  select
    id,
    case when base = '' then 'podcast' else base end as base2,
    row_number() over (
      partition by (case when base = '' then 'podcast' else base end)
      order by id
    ) as rn
  from slugged
)
update public.podcasts p
set slug = case when n.rn = 1 then n.base2 else n.base2 || '-' || n.rn end
from numbered n
where p.id = n.id;

alter table public.podcasts alter column slug set not null;
alter table public.podcasts add constraint podcasts_slug_key unique (slug);

create index podcasts_source_type_idx on public.podcasts(source_type);

-- Rollback:
-- alter table public.podcasts drop constraint podcasts_slug_key;
-- drop index if exists public.podcasts_source_type_idx;
-- alter table public.podcasts drop constraint podcasts_self_hosted_needs_audio;
-- alter table public.podcasts
--   drop column slug, drop column source_type, drop column audio_url,
--   drop column duration_seconds, drop column file_size_bytes;
