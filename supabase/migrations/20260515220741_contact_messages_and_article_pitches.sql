-- Kontakt-Form + Artikel-Pitch produktiv.
--
-- 1) `contact_messages` für /kontakt-Submissions (Editor-Notification per Mail,
--    Status-Workflow im Admin).
-- 2) `article_pitches` für /artikel-pitchen-Submissions mit reicherem
--    Schema, das den bestehenden 3-Step-Form widerspiegelt (Titel, Abstract,
--    Volltext, Author-Block).
-- 3) Rate-Limit-Tabelle `newsletter_signup_attempts` bekommt zwei neue
--    Action-Werte (`contact`, `pitch`). Damit teilen alle Public-Forms
--    denselben IP-Hash-Pool ohne sich gegenseitig zu blockieren.

-- ---------------------------------------------------------------------------
-- contact_messages
-- ---------------------------------------------------------------------------

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text not null,
  organization text,
  message text not null,
  ip_hash text,
  status text not null default 'new'
    check (status in ('new', 'replied', 'archived')),
  created_at timestamptz not null default now(),
  replied_at timestamptz,
  notes text
);

create index contact_messages_status_created_idx
  on public.contact_messages (status, created_at desc);

alter table public.contact_messages enable row level security;

create policy "contact_messages_editor_select"
  on public.contact_messages
  for select to authenticated
  using (public.is_editor());

create policy "contact_messages_editor_update"
  on public.contact_messages
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- Keine SELECT-/UPDATE-/DELETE-Policy für anon — Inserts laufen via Service-
-- Role aus der Server Action.

-- ---------------------------------------------------------------------------
-- article_pitches
-- ---------------------------------------------------------------------------
--
-- Schema spiegelt den bestehenden 3-Step-Form auf /artikel-pitchen:
--   Step 1: title, excerpt, category, body_md
--   Step 2: author_name, author_email, author_role (opt), author_bio,
--           author_website (opt)
--   Step 3: original + editorial sind reine Acceptance-Gates (Form blockiert
--           Submit bis beide gecheckt) — nicht persistiert.

create table public.article_pitches (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text not null,
  category text,
  body_md text not null,
  author_name text not null,
  author_email text not null,
  author_role text,
  author_bio text not null,
  author_website text,
  ip_hash text,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  editor_notes text
);

create index article_pitches_status_created_idx
  on public.article_pitches (status, created_at desc);

alter table public.article_pitches enable row level security;

create policy "article_pitches_editor_select"
  on public.article_pitches
  for select to authenticated
  using (public.is_editor());

create policy "article_pitches_editor_update"
  on public.article_pitches
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- ---------------------------------------------------------------------------
-- Rate-Limit-Pool erweitern: contact + pitch zusätzlich erlaubt.
-- ---------------------------------------------------------------------------

alter table public.newsletter_signup_attempts
  drop constraint if exists newsletter_signup_attempts_action_check;

alter table public.newsletter_signup_attempts
  add constraint newsletter_signup_attempts_action_check
  check (action in ('subscribe', 'unsubscribe', 'contact', 'pitch'));
