-- Werbung: Buchungen einzeln und gesammelt verwalten (Backlog 26.10.2026).
--
--   a) ad_bookings.paused_at   timestamptz null  (null = nicht pausiert)
--      ad_bookings.archived_at timestamptz null  (null = aktiv)
--      Additiv, kein Backfill. Abgeleiteter Status pro Zeile im Code:
--      Geplant / Live / Pausiert / Abgelaufen / Archiviert.
--   b) Doppelbuchungs-Constraint ignoriert archivierte Zeilen: eine
--      archivierte Buchung blockiert keine neue gleiche Buchung mehr.
--   c) Kapazitaetsgates zaehlen archivierte Buchungen nicht mehr mit.
--      Pausierte Buchungen belegen ihren Platz weiterhin (der Zeitraum
--      laeuft weiter, der Kunde kann jederzeit fortsetzen).
--      Archivieren selbst braucht keine Kapazitaet (Early Return).
--
-- Auslieferung (api/module/[code]), Slot-Reservierung, Anteilsrechnung,
-- Vorschau, Statistik-Laufzeit und Ablaufwarnung filtern im Code.
--
-- Rollback (Doku):
--   alter table public.ad_bookings drop constraint if exists ad_bookings_no_duplicate;
--   alter table public.ad_bookings add constraint ad_bookings_no_duplicate
--     exclude using gist (campaign_id with =, placement_id with =, scope with =,
--       (coalesce(scope_ref, '')) with =, period with &&);
--   alter table public.ad_bookings drop column if exists paused_at, drop column if exists archived_at;
--   Trigger-Funktionen: Stand 20260924120000_ad_rail_partner_capacity.sql.

-- =========================================================================
-- a) Spalten
-- =========================================================================
alter table public.ad_bookings
  add column paused_at timestamptz null,
  add column archived_at timestamptz null;

-- =========================================================================
-- b) Doppelbuchung nur unter aktiven Buchungen (Muster 20260922200000)
-- =========================================================================
alter table public.ad_bookings drop constraint if exists ad_bookings_no_duplicate;
alter table public.ad_bookings
  add constraint ad_bookings_no_duplicate
  exclude using gist (
    campaign_id with =,
    placement_id with =,
    scope with =,
    (coalesce(scope_ref, '')) with =,
    period with &&
  ) where (archived_at is null);

-- =========================================================================
-- c1) Kapazitaet je Buchung (Stand 20260924120000, plus Archiv-Filter)
-- =========================================================================
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
  if new.archived_at is not null then
    return new;   -- Archivieren belegt nichts
  end if;

  select is_house into v_is_house from public.ad_campaigns where id = new.campaign_id;
  if v_is_house then
    return new;   -- House-Buchungen nie pruefen
  end if;

  select max_concurrent into v_max from public.ad_placements where id = new.placement_id;

  -- Kapazitaet = Anzahl anderer Kunden-Kampagnen mit ueberlappender, nicht
  -- archivierter Buchung.
  select count(distinct b.campaign_id) into v_count
  from public.ad_bookings b
  join public.ad_campaigns c on c.id = b.campaign_id
  where b.placement_id = new.placement_id
    and b.id <> new.id
    and b.campaign_id <> new.campaign_id
    and b.archived_at is null
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

-- =========================================================================
-- c2) Aktivierungs-Gate (Stand 20260924120000, plus Archiv-Filter)
-- =========================================================================
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
  v_activating boolean;
begin
  if new.is_house then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    v_activating := new.status in ('confirmed','live');
  else
    v_activating := new.status in ('confirmed','live')
      and old.status is distinct from new.status
      and old.status not in ('confirmed','live');
  end if;

  if v_activating then
    for r in select * from public.ad_bookings where campaign_id = new.id and archived_at is null loop
      select max_concurrent into v_max from public.ad_placements where id = r.placement_id;

      select count(distinct b.campaign_id) into v_count
      from public.ad_bookings b
      join public.ad_campaigns c on c.id = b.campaign_id
      where b.placement_id = r.placement_id
        and b.campaign_id <> new.id
        and b.archived_at is null
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
