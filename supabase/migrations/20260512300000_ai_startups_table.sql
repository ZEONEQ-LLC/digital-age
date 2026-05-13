-- Phase 7 PR C-2 — AI Startups mit Submission-Workflow
--
-- Editor-kuratiertes Verzeichnis Schweizer KI-Unternehmen. Externe Submissions
-- landen als pending, Editor approved/rejected/featured/archived. Kein Author-
-- Self-Service (im Unterschied zu ai_prompts).
--
-- Status-Workflow:
--   pending     → externe Submission, wartet auf Editor-Approval
--   published   → öffentlich auf /swiss-ai
--   featured    → Spotlight-Section (HARD LIMIT max 3)
--   rejected    → nicht sichtbar, Submission-Spur
--   archived    → war mal published, jetzt versteckt
--
-- Status-Übergänge: Nur Editor darf Status ändern. Inserts via anon sind
-- auf pending beschränkt (RLS).
--
-- Spotlight-Limit: max 3 gleichzeitig featured. Trigger blockiert den 4.
-- Featured-Toggle; UI muss vorher entfeaturen.

create type startup_status as enum (
  'pending',
  'published',
  'featured',
  'rejected',
  'archived'
);

create type swiss_status as enum (
  'swiss_based',
  'swiss_founded',
  'active_in_ch'
);

create type employee_range as enum (
  'r_1_10',
  'r_11_50',
  'r_51_200',
  'r_201_500',
  'r_500_plus'
);

create type funding_stage as enum (
  'bootstrapped',
  'pre_seed',
  'seed',
  'series_a',
  'series_b_plus',
  'public_company'
);

create table public.ai_startups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  -- Step 1: Unternehmen
  name text not null check (char_length(name) > 0 and char_length(name) <= 80),
  tagline text not null check (char_length(tagline) > 0 and char_length(tagline) <= 100),
  description text not null check (char_length(description) > 0),
  website text not null,
  logo_url text,

  -- Step 2: Klassifizierung
  swiss_status swiss_status not null,
  industry text not null,
  city text not null,
  employee_range employee_range not null,
  founded_year integer not null check (founded_year between 1990 and 2030),

  -- Investor-Lite (alle optional, Editor toggled open_to_investment)
  funding_stage funding_stage,
  total_funding_range text,
  last_round_at date,
  open_to_investment boolean not null default false,
  pitch_deck_url text,
  founder_names text[],

  -- Submitter (intern, nicht öffentlich)
  submitter_name text,
  submitter_email text,
  submitter_role text,

  -- Editorial-Workflow
  status startup_status not null default 'pending',
  reviewed_by_id uuid references public.authors(id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_startups_status_idx on public.ai_startups(status, published_at desc);
create index ai_startups_swiss_status_idx on public.ai_startups(swiss_status) where status in ('published', 'featured');
create index ai_startups_industry_idx on public.ai_startups(industry) where status in ('published', 'featured');

create trigger ai_startups_set_updated_at
  before update on public.ai_startups
  for each row execute function public.set_updated_at();

-- =========================================================================
-- Hard Limit: max 3 featured
--
-- Greift nur bei Übergang nach featured. Trigger feuert vor INSERT/UPDATE,
-- vergleicht NEW.status mit OLD.status und prüft den Counter.
-- =========================================================================
create or replace function public.check_startup_spotlight_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  featured_count integer;
begin
  if new.status = 'featured' and (old.status is null or old.status <> 'featured') then
    select count(*) into featured_count
    from public.ai_startups
    where status = 'featured' and id <> new.id;

    if featured_count >= 3 then
      raise exception 'Spotlight limit reached: maximum 3 featured startups allowed. Unfeature one first.'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_startup_spotlight_limit
  before insert or update on public.ai_startups
  for each row execute function public.check_startup_spotlight_limit();

-- =========================================================================
-- Status-Transition-Trigger
--
-- Startups sind Editor-only: bei Status-Wechsel muss der aufrufende User
-- die editor-Rolle haben. Wenn status unverändert bleibt, ist alles ok.
-- =========================================================================
create or replace function public.check_startup_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if exists (
    select 1 from public.authors
    where user_id = auth.uid() and role = 'editor'
  ) then
    return new;
  end if;

  raise exception 'Only editors can change startup status.'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger enforce_startup_status_transition
  before update on public.ai_startups
  for each row execute function public.check_startup_status_transition();

alter table public.ai_startups enable row level security;

-- =========================================================================
-- RLS-Policies
-- =========================================================================

-- Public: read published + featured
create policy "ai_startups_public_read"
  on public.ai_startups for select
  using (status in ('published', 'featured'));

-- Editor: full access (gilt für SELECT auf alle Rows inkl. pending/rejected/archived)
create policy "ai_startups_editor_all"
  on public.ai_startups for all
  to authenticated
  using (
    exists (
      select 1 from public.authors
      where user_id = auth.uid() and role = 'editor'
    )
  )
  with check (
    exists (
      select 1 from public.authors
      where user_id = auth.uid() and role = 'editor'
    )
  );

-- Anon + authenticated Submission: insert mit status=pending, kein reviewed_*
-- oder published_at. submitter_email und name sind required (DB-level guard
-- gegen leere Submissions).
create policy "ai_startups_anon_submit"
  on public.ai_startups for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and reviewed_by_id is null
    and reviewed_at is null
    and published_at is null
    and submitter_email is not null
    and submitter_name is not null
  );

-- =========================================================================
-- Slug-Generator: Lowercase, Umlaute, Sonderzeichen → bindestriche,
-- dedupliziert durch Counter-Suffix.
-- =========================================================================
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
  base_slug := lower(regexp_replace(
    translate(p_name, 'äöüÄÖÜß', 'aouAOUs'),
    '[^a-z0-9]+', '-', 'g'
  ));
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

revoke all on function public.suggest_startup_slug(text) from public;
grant execute on function public.suggest_startup_slug(text) to anon, authenticated;

-- =========================================================================
-- Grants
-- =========================================================================

grant select on public.ai_startups to anon, authenticated;
grant insert on public.ai_startups to anon, authenticated;
grant update, delete on public.ai_startups to authenticated;
