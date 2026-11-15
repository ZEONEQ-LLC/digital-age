-- Showcase S3a: Einladung und Fragebogen.
--
-- Die Redaktion laedt ein Unternehmen aus dem Verzeichnis ein. Es bekommt
-- einen Link mit Token (/showcase/mitmachen/<token>, ohne Login), beantwortet
-- den Fragebogen, laedt Logo und optional ein Bild hoch, bestaetigt seine
-- Profildaten und gibt seine Einwilligungen.
--
--   * showcase_submissions: eine Zeile pro Einladung. Nur Editor:innen lesen
--     und schreiben (RLS). Das Unternehmen greift ausschliesslich ueber Server
--     Actions mit dem Token zu (Service-Role); anon hat kein Recht auf die
--     Tabelle.
--   * Hoechstens eine offene Einladung pro Unternehmen.
--   * Bucket startup-media: Logo und Bild. Oeffentlich lesbar, geschrieben
--     wird nur mit der Service-Role (keine Policies fuer anon/authenticated).
--     Nur PNG und WebP, kein SVG (kann Skripte enthalten).
--   * startup_contacts.consent_source kennt neu 'showcase' (Einverstaendnis
--     zur Kontaktweiterleitung im Fragebogen).
--   * Rate-Limit-Aktionen 'showcase_submit' und 'showcase_upload'.
--
-- Additiv: neue Tabelle, neuer Bucket, zwei CHECKs um Werte erweitert.

create table public.showcase_submissions (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.ai_startups(id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  status text not null default 'invited' check (status in ('invited', 'submitted', 'withdrawn')),

  -- Einladung (Redaktion)
  invitee_name text check (invitee_name is null or length(invitee_name) <= 120),
  invitee_email text check (
    invitee_email is null
    or (invitee_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(invitee_email) <= 255)
  ),
  reply_by date,
  invited_by uuid references public.authors(id) on delete set null,
  invited_at timestamptz not null default now(),
  invite_sent_at timestamptz,
  reminded_at timestamptz,
  expires_at timestamptz not null default now() + interval '60 days',

  -- Antworten (Unternehmen)
  submitted_at timestamptz,
  contact_name text check (contact_name is null or length(contact_name) <= 120),
  contact_role text check (contact_role is null or length(contact_role) <= 120),
  contact_email text check (
    contact_email is null
    or (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(contact_email) <= 255)
  ),
  -- { problem, solution, usecase, learnings, trust, outlook, quote, quote_by }
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  -- Alternative zu den Fragen: eigener Text.
  own_text text check (own_text is null or length(own_text) <= 20000),
  -- Bis zu zwei http(s)-Adressen.
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 2),
  logo_path text check (logo_path is null or length(logo_path) <= 300),
  image_path text check (image_path is null or length(image_path) <= 300),
  -- Vorschlaege zum Profil: { feld: neuer Wert }. Die Redaktion uebernimmt.
  profile_changes jsonb not null default '{}'::jsonb check (jsonb_typeof(profile_changes) = 'object'),
  consent_data_confirmed boolean not null default false,
  consent_labelling boolean not null default false,
  consent_media_rights boolean not null default false,
  consent_contact_email text check (
    consent_contact_email is null
    or (consent_contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(consent_contact_email) <= 255)
  ),

  -- Redaktion
  profile_applied_at timestamptz,
  logo_applied_at timestamptz,
  article_id uuid references public.articles(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint showcase_submissions_submitted_shape check (
    status <> 'submitted'
    or (submitted_at is not null and contact_name is not null and contact_email is not null
        and consent_data_confirmed and consent_labelling)
  )
);

comment on table public.showcase_submissions is
  'Showcase S3a: Einladungen und Fragebogen-Antworten. Nur Editor:innen (RLS); Unternehmen nur ueber Server Actions mit Token.';

create index showcase_submissions_startup_idx on public.showcase_submissions (startup_id);
create unique index showcase_submissions_one_open_invite
  on public.showcase_submissions (startup_id) where status = 'invited';

create trigger showcase_submissions_set_updated_at
  before update on public.showcase_submissions
  for each row execute function public.set_updated_at();

alter table public.showcase_submissions enable row level security;

create policy "showcase_submissions_editor_all" on public.showcase_submissions
  for all to authenticated using (is_editor()) with check (is_editor());

-- Kein Zugriff ohne Login: Der Fragebogen laeuft ueber die Service-Role.
revoke all on table public.showcase_submissions from anon;

-- Einverstaendnis zur Kontaktweiterleitung aus dem Fragebogen.
alter table public.startup_contacts drop constraint startup_contacts_consent_source_check;
alter table public.startup_contacts add constraint startup_contacts_consent_source_check
  check (consent_source in ('submission', 'editor', 'showcase'));

-- Rate-Limit-Aktionen fuer Fragebogen und Uploads.
alter table public.newsletter_signup_attempts
  drop constraint newsletter_signup_attempts_action_check;
alter table public.newsletter_signup_attempts
  add constraint newsletter_signup_attempts_action_check
  check (action in ('subscribe', 'unsubscribe', 'contact', 'pitch', 'podcast_ingest', 'module_event', 'startup_contact', 'showcase_submit', 'showcase_upload'));

-- Bucket fuer Logo und Bild. Ohne Policies: nur die Service-Role schreibt.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('startup-media', 'startup-media', true, 1048576, array['image/png', 'image/webp'])
on conflict (id) do nothing;

-- Rueckbau:
-- drop table if exists public.showcase_submissions;
-- delete from storage.buckets where id = 'startup-media';  (vorher Dateien loeschen)
-- CHECKs von startup_contacts und newsletter_signup_attempts auf den Stand
-- aus 20261112090000_startup_contact.sql zuruecksetzen.
