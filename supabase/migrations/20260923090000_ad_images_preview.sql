-- PR A — Kundenmotiv bis Livegang: Bild-Kreative, Vorschau-Link, Freigabe.
-- Additiv. Entscheide G1-G5 aus dem Briefing.
--
--   a) Storage-Bucket "modules" (neutraler Name): public-read, Schreiben nur is_editor().
--   b) ad_creatives.placement_id: Bild-Kreative sind platzierungsgebunden (G1).
--   c) ad_campaigns: preview_token (48 hex), approved_at/by/note (G5).
--   d) check_ad_campaign_ready(): Kreativ-Abdeckung je gebuchter Platzierung.
--   e) RPC regenerate_ad_preview_token(): neues Token, nur Editor.

-- =========================================================================
-- a) Bucket "modules" — Muster 20260513211900 (articles). Dateinamen sind
--    zufaellig (<campaign_id>/<24 hex>.<ext>), Pfad-Check daher unnoetig.
-- =========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'modules',
  'modules',
  true,
  2097152, -- 2 MiB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "modules_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'modules');

create policy "modules_insert_editor"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'modules' and public.is_editor());

create policy "modules_update_editor"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'modules' and public.is_editor());

create policy "modules_delete_editor"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'modules' and public.is_editor());

-- =========================================================================
-- b) ad_creatives.placement_id (G1): null = alle Platzierungen (nur internal).
--    kind='image' verlangt eine Platzierung. Bestehender Shape-Check
--    (image => image_path + alt_text) bleibt.
-- =========================================================================
alter table public.ad_creatives
  add column placement_id uuid references public.ad_placements(id) on delete restrict,
  add constraint ad_creatives_image_needs_placement
    check (kind <> 'image' or placement_id is not null);

create index idx_ad_creatives_placement on public.ad_creatives(placement_id);

-- =========================================================================
-- c) ad_campaigns: Vorschau-Token + Freigabe (G5). Bestand bekommt per
--    Default je Zeile ein eigenes Token (volatiler Default => Zeilenweise).
--    gen_random_bytes liegt im Schema extensions (Muster invites_table).
-- =========================================================================
alter table public.ad_campaigns
  add column preview_token text not null unique
    default encode(extensions.gen_random_bytes(24), 'hex'),
  add column approved_at timestamptz,
  add column approved_by text,
  add column approved_note text,
  add constraint ad_campaigns_approved_by_len
    check (approved_by is null or char_length(approved_by) <= 120),
  add constraint ad_campaigns_approved_note_len
    check (approved_note is null or char_length(approved_note) <= 1000);

comment on column public.ad_campaigns.preview_token is
  'Oeffentlicher Vorschau-Link /vorschau/<token>. Permanent bis "Link erneuern" (RPC regenerate_ad_preview_token).';
comment on column public.ad_campaigns.approved_at is
  'Freigabe durch den Kunden ueber den Vorschau-Link. Information, kein Gate fuer live (G5).';

-- =========================================================================
-- d) Aktivierungs-Gate: Kreativ-Abdeckung je gebuchter Platzierung.
--    Fuer jede gebuchte Platzierung muss ein aktives Desktop-Kreativ
--    existieren, dessen placement_id gleich der Platzierung oder null ist.
--    Mobile analog, nur wenn die Platzierung mobile_size hat. Kundenteil
--    unveraendert (20260921130000 / 20260922150000).
-- =========================================================================
create or replace function public.check_ad_campaign_ready()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adv record;
  v_b record;
begin
  if new.status in ('confirmed', 'live')
     and old.status is distinct from new.status
     and old.status not in ('confirmed', 'live') then

    -- Nicht-House: Kunde muss abrechenbar sein.
    if new.is_house = false then
      select * into v_adv from public.ad_advertisers where id = new.advertiser_id;
      if v_adv.id is null then
        raise exception 'Kampagne kann nicht aktiviert werden: kein Kunde zugewiesen.'
          using errcode = 'check_violation';
      end if;
      if coalesce(v_adv.billing_email, '') = '' then
        raise exception 'Kampagne kann nicht aktiviert werden: dem Kunden fehlt eine Rechnungs-E-Mail.'
          using errcode = 'check_violation';
      end if;
      if not (
        (v_adv.street is not null and v_adv.house_number is not null
          and v_adv.postal_code is not null and v_adv.city is not null)
        or (v_adv.post_office_box is not null and v_adv.postal_code is not null and v_adv.city is not null)
      ) then
        raise exception 'Kampagne kann nicht aktiviert werden: dem Kunden fehlt eine vollstaendige Rechnungsadresse.'
          using errcode = 'check_violation';
      end if;
    end if;

    -- Kreativ-Abdeckung je gebuchter Platzierung.
    for v_b in
      select distinct p.id, p.label, p.mobile_size
      from public.ad_bookings b
      join public.ad_placements p on p.id = b.placement_id
      where b.campaign_id = new.id
    loop
      if not exists (
        select 1 from public.ad_creatives c
        where c.campaign_id = new.id and c.is_active and c.variant = 'desktop'
          and (c.placement_id is null or c.placement_id = v_b.id)
      ) then
        raise exception 'Kampagne kann nicht aktiviert werden: es fehlt ein aktives Desktop-Kreativ fuer %.', v_b.label
          using errcode = 'check_violation';
      end if;
      if v_b.mobile_size is not null and not exists (
        select 1 from public.ad_creatives c
        where c.campaign_id = new.id and c.is_active and c.variant = 'mobile'
          and (c.placement_id is null or c.placement_id = v_b.id)
      ) then
        raise exception 'Kampagne kann nicht aktiviert werden: es fehlt ein aktives Mobile-Kreativ fuer % (liefert mobil aus).', v_b.label
          using errcode = 'check_violation';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

-- =========================================================================
-- e) Vorschau-Link erneuern: neues Token aus der DB, nur fuer Editor.
-- =========================================================================
create or replace function public.regenerate_ad_preview_token(p_campaign_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if not public.is_editor() then
    raise exception 'Nur Editor:innen.' using errcode = 'insufficient_privilege';
  end if;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  update public.ad_campaigns set preview_token = v_token where id = p_campaign_id;
  if not found then
    raise exception 'Kampagne nicht gefunden.' using errcode = 'no_data_found';
  end if;
  return v_token;
end;
$$;

revoke all on function public.regenerate_ad_preview_token(uuid) from public;
grant execute on function public.regenerate_ad_preview_token(uuid) to authenticated;

-- Rollback (auskommentiert, nur als Doku):
-- drop function if exists public.regenerate_ad_preview_token(uuid);
-- (check_ad_campaign_ready: Definition aus 20260922150000_ad_round3.sql wiederherstellen)
-- alter table public.ad_campaigns
--   drop constraint if exists ad_campaigns_approved_note_len,
--   drop constraint if exists ad_campaigns_approved_by_len,
--   drop column if exists approved_note, drop column if exists approved_by,
--   drop column if exists approved_at, drop column if exists preview_token;
-- drop index if exists public.idx_ad_creatives_placement;
-- alter table public.ad_creatives
--   drop constraint if exists ad_creatives_image_needs_placement,
--   drop column if exists placement_id;
-- drop policy if exists "modules_delete_editor" on storage.objects;
-- drop policy if exists "modules_update_editor" on storage.objects;
-- drop policy if exists "modules_insert_editor" on storage.objects;
-- drop policy if exists "modules_public_read" on storage.objects;
-- delete from storage.buckets where id = 'modules';
