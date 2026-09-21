-- Werbe-/Platzierungssystem — Fundament (PR 1)
-- Direktverkauf, First-Party. Sechs Tabellen ad_*, RLS ausschliesslich
-- ueber is_editor() (keine anon-Policies — oeffentliche Auslieferung laeuft
-- ueber einen Service-Role-Route-Handler). Ueberbuchungs-Schutz per Trigger
-- (Vorlage: check_startup_spotlight_limit). Seed: Stammdaten-Katalog der
-- sechs Platzierungen + zwei House-Kampagnen, damit das Preview nie leer ist.
--
-- Rollback (manuell, falls noetig):
--   drop table if exists public.ad_creatives, public.ad_bookings,
--     public.ad_campaigns, public.ad_placements, public.ad_contacts,
--     public.ad_advertisers cascade;

-- btree_gist erlaubt den GiST-Index ueber (placement_id uuid, period tstzrange)
create extension if not exists btree_gist;

-- =========================================================================
-- ad_advertisers — Kunden
-- =========================================================================
create table public.ad_advertisers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  uid text,
  billing_address text,
  billing_email text,
  is_agency boolean not null default false,
  commission_pct numeric(5,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_ad_advertisers_updated_at before update on public.ad_advertisers
  for each row execute function public.set_updated_at();

-- =========================================================================
-- ad_contacts — Ansprechpartner pro Kunde
-- =========================================================================
create table public.ad_contacts (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references public.ad_advertisers(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role text,
  created_at timestamptz not null default now()
);

create index idx_ad_contacts_advertiser on public.ad_contacts(advertiser_id);

-- =========================================================================
-- ad_placements — Stammdaten-Katalog (per Seed befuellt, Admin nur lesbar)
-- =========================================================================
create table public.ad_placements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  max_concurrent smallint not null default 1,
  desktop_size text,
  mobile_size text,
  desktop_height smallint not null,
  mobile_height smallint not null,
  min_viewport integer,            -- null = keine Mindestbreite
  insert_after_block smallint,     -- nur article_inline
  is_sellable boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

insert into public.ad_placements
  (code, label, max_concurrent, desktop_size, mobile_size, desktop_height, mobile_height, min_viewport, insert_after_block, is_sellable, sort_order)
values
  ('home_billboard',   'Startseite Billboard', 2, '970x250', '320x100', 250, 100, null, null, true,  10),
  ('hub_sidebar',      'Ressort-Hub Sidebar',  2, '300x600', '300x250', 600, 250, null, null, true,  20),
  ('swiss_ai_sidebar', 'Swiss AI Sidebar',     1, '300x250', '300x250', 250, 250, null, null, true,  30),
  ('article_inline',   'Artikel Inline',       1, '728x90',  '300x250',  90, 250, null, 3,    true,  40),
  ('rail_left',        'Rail links',           1, '160x600', null,       600,   0, 1680, null, false, 50),
  ('rail_right',       'Rail rechts',          1, '160x600', null,       600,   0, 1680, null, false, 60);

-- =========================================================================
-- ad_campaigns — Kampagnen (Kunden- oder House-Kampagne)
-- =========================================================================
create table public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid references public.ad_advertisers(id) on delete restrict,
  name text not null,
  status text not null default 'draft'
    check (status in ('draft','offer','confirmed','live','paused','ended','cancelled')),
  is_house boolean not null default false,
  price_chf numeric(10,2),
  weight smallint not null default 1 check (weight between 1 and 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_campaigns_house_shape check (
    (is_house = true  and advertiser_id is null and price_chf is null) or
    (is_house = false and advertiser_id is not null)
  )
);

create index idx_ad_campaigns_status on public.ad_campaigns(status);

create trigger trg_ad_campaigns_updated_at before update on public.ad_campaigns
  for each row execute function public.set_updated_at();

-- =========================================================================
-- ad_bookings — Buchung: Kampagne x Platzierung x Scope x Zeitraum
-- =========================================================================
create table public.ad_bookings (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  placement_id uuid not null references public.ad_placements(id) on delete restrict,
  scope text not null check (scope in ('global','ressort','article')),
  scope_ref text,                 -- Ressort- bzw. Artikel-Slug; null nur bei global
  period tstzrange not null,      -- obere Grenze offen erlaubt (House: unbegrenzt)
  created_at timestamptz not null default now(),
  constraint ad_bookings_scope_ref_shape check (
    (scope = 'global' and scope_ref is null) or
    (scope <> 'global' and scope_ref is not null)
  )
);

create index idx_ad_bookings_campaign on public.ad_bookings(campaign_id);
create index gist_ad_bookings_placement_period
  on public.ad_bookings using gist (placement_id, period);

-- =========================================================================
-- ad_creatives — Kreative pro Kampagne (internal jetzt, image ab PR 2)
-- =========================================================================
create table public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  kind text not null check (kind in ('image','internal')),
  variant text not null default 'desktop' check (variant in ('desktop','mobile')),
  headline text,
  body text,
  cta_label text,
  image_path text,
  width smallint,
  height smallint,
  alt_text text,
  target_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint ad_creatives_kind_shape check (
    (kind = 'internal' and headline is not null) or
    (kind = 'image' and image_path is not null and alt_text is not null)
  )
);

create index idx_ad_creatives_campaign on public.ad_creatives(campaign_id);

-- =========================================================================
-- Ueberbuchungs-Schutz — zwei Trigger
-- Vorlage: check_startup_spotlight_limit (security definer, check_violation).
-- House-Kampagnen zaehlen NIE mit und werden NIE geprueft.
-- =========================================================================

-- Trigger A: pro Buchung pruefen, dass die Platzierung im ueberlappenden
-- Zeitraum nicht mehr aktive Nicht-House-Buchungen als max_concurrent traegt.
create or replace function public.check_ad_booking_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_house boolean;
  v_max smallint;
  v_count integer;
begin
  select is_house into v_is_house from public.ad_campaigns where id = new.campaign_id;
  if v_is_house then
    return new;   -- House-Buchungen nie pruefen
  end if;

  select max_concurrent into v_max from public.ad_placements where id = new.placement_id;

  select count(*) into v_count
  from public.ad_bookings b
  join public.ad_campaigns c on c.id = b.campaign_id
  where b.placement_id = new.placement_id
    and b.id <> new.id
    and b.period && new.period
    and c.is_house = false
    and c.status in ('confirmed','live');

  if v_count >= v_max then
    raise exception 'Ueberbuchung: Platzierung hat im gewaehlten Zeitraum keine freie Kapazitaet mehr (max %).', v_max
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger enforce_ad_booking_overlap
  before insert or update on public.ad_bookings
  for each row execute function public.check_ad_booking_overlap();

-- Trigger B: bei Statuswechsel einer Kampagne nach confirmed/live jede ihrer
-- Buchungen wie in Trigger A pruefen — sonst liesse sich ueber den Status am
-- Schutz vorbei ueberbuchen.
create or replace function public.check_ad_campaign_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_max smallint;
  v_count integer;
begin
  if new.is_house then
    return new;
  end if;

  if new.status in ('confirmed','live')
     and old.status is distinct from new.status
     and old.status not in ('confirmed','live') then
    for r in select * from public.ad_bookings where campaign_id = new.id loop
      select max_concurrent into v_max from public.ad_placements where id = r.placement_id;

      select count(*) into v_count
      from public.ad_bookings b
      join public.ad_campaigns c on c.id = b.campaign_id
      where b.placement_id = r.placement_id
        and b.id <> r.id
        and b.period && r.period
        and c.is_house = false
        and c.status in ('confirmed','live');

      if v_count >= v_max then
        raise exception 'Ueberbuchung: Aktivierung ueberschreitet die Kapazitaet einer belegten Platzierung im gewaehlten Zeitraum.'
          using errcode = 'check_violation';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

create trigger enforce_ad_campaign_activation
  before update on public.ad_campaigns
  for each row execute function public.check_ad_campaign_activation();

-- =========================================================================
-- RLS — alle sechs Tabellen: nur Editor (is_editor()), keine anon-Policy
-- =========================================================================
alter table public.ad_advertisers enable row level security;
alter table public.ad_contacts    enable row level security;
alter table public.ad_placements  enable row level security;
alter table public.ad_campaigns   enable row level security;
alter table public.ad_bookings    enable row level security;
alter table public.ad_creatives   enable row level security;

create policy "ad_advertisers_editor_all" on public.ad_advertisers
  for all to authenticated using (is_editor()) with check (is_editor());
create policy "ad_contacts_editor_all" on public.ad_contacts
  for all to authenticated using (is_editor()) with check (is_editor());
create policy "ad_placements_editor_all" on public.ad_placements
  for all to authenticated using (is_editor()) with check (is_editor());
create policy "ad_campaigns_editor_all" on public.ad_campaigns
  for all to authenticated using (is_editor()) with check (is_editor());
create policy "ad_bookings_editor_all" on public.ad_bookings
  for all to authenticated using (is_editor()) with check (is_editor());
create policy "ad_creatives_editor_all" on public.ad_creatives
  for all to authenticated using (is_editor()) with check (is_editor());

-- =========================================================================
-- Seed House Ads — damit das Preview nie leer ist
-- Zwei House-Kampagnen (is_house, live, weight 1), je ein internal-Kreativ
-- pro Variante, je eine globale Buchung pro Platzierung.
-- =========================================================================
do $$
declare
  c_newsletter uuid;
  c_directory  uuid;
  p record;
begin
  insert into public.ad_campaigns (name, status, is_house, weight)
    values ('House: Newsletter', 'live', true, 1)
    returning id into c_newsletter;
  insert into public.ad_campaigns (name, status, is_house, weight)
    values ('House: Swiss AI Verzeichnis', 'live', true, 1)
    returning id into c_directory;

  -- Kreative: je desktop + mobile
  insert into public.ad_creatives (campaign_id, kind, variant, headline, body, cta_label, target_url) values
    (c_newsletter, 'internal', 'desktop',
      'Nichts verpassen', 'Der digital-age Newsletter — KI & Future Tech, kompakt.', 'Jetzt abonnieren', '/newsletter'),
    (c_newsletter, 'internal', 'mobile',
      'Nichts verpassen', 'KI & Future Tech, kompakt im Newsletter.', 'Abonnieren', '/newsletter'),
    (c_directory, 'internal', 'desktop',
      'Swiss AI entdecken', 'Das Verzeichnis der Schweizer KI-Unternehmen.', 'Zum Verzeichnis', '/swiss-ai'),
    (c_directory, 'internal', 'mobile',
      'Swiss AI entdecken', 'Schweizer KI-Unternehmen im Verzeichnis.', 'Entdecken', '/swiss-ai');

  -- Buchungen: pro Platzierung je eine globale, unbefristete Buchung pro
  -- House-Kampagne (obere Grenze offen).
  for p in select id from public.ad_placements loop
    insert into public.ad_bookings (campaign_id, placement_id, scope, scope_ref, period)
      values (c_newsletter, p.id, 'global', null, tstzrange(now(), null));
    insert into public.ad_bookings (campaign_id, placement_id, scope, scope_ref, period)
      values (c_directory, p.id, 'global', null, tstzrange(now(), null));
  end loop;
end $$;
