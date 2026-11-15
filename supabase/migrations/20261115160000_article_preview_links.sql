-- Vorschau-Link fuer Beitraege: Die Redaktion erstellt zu einem Beitrag einen
-- Link mit Token (/vorschau/artikel/<token>, ohne Login). Wer den Link hat,
-- sieht den Beitrag so, wie er erscheinen wird, und kann ihn freigeben oder
-- Aenderungen wuenschen. Die Rueckmeldung steht in derselben Zeile; eine neue
-- Rueckmeldung ersetzt die alte (der Verlauf steht in den Mails an die
-- Redaktion). Veroeffentlicht wird weiterhin nur durch die Redaktion.
--
-- Additiv: neue Tabelle, eine weitere Rate-Limit-Aktion.

create table public.article_preview_links (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  created_by uuid references public.authors(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  revoked_at timestamptz,

  -- Rueckmeldung ueber den Link
  decision text,
  decided_at timestamptz,
  decided_by text,
  decision_note text,
  -- Pruefsumme des Inhalts zum Zeitpunkt der Rueckmeldung: zeigt, ob der
  -- Beitrag seither geaendert wurde (src/lib/articles/preview.ts).
  decided_fingerprint text,

  constraint article_preview_links_token_format check (token ~ '^[0-9a-f]{48}$'),
  constraint article_preview_links_decision_check
    check (decision is null or decision in ('approved', 'changes')),
  constraint article_preview_links_decision_shape check (
    (decision is null and decided_at is null and decided_by is null
      and decision_note is null and decided_fingerprint is null)
    or (decision is not null and decided_at is not null
      and char_length(decided_by) between 2 and 120
      and decided_fingerprint is not null
      and (decision_note is null or char_length(decision_note) between 1 and 2000)
      and (decision = 'approved' or decision_note is not null))
  )
);

comment on table public.article_preview_links is
  'Vorschau-Links fuer Beitraege mit Rueckmeldung (Freigabe oder Aenderungswunsch). Nur Editor:innen (RLS); Lesen und Antworten ueber den Link laufen ueber Server-Code mit Token.';

-- Pro Beitrag hoechstens ein gueltiger Link: ein neuer Link sperrt den alten.
create unique index article_preview_links_one_active
  on public.article_preview_links (article_id) where revoked_at is null;

alter table public.article_preview_links enable row level security;

create policy "article_preview_links_editor_all" on public.article_preview_links
  for all to authenticated using (is_editor()) with check (is_editor());

-- Kein Zugriff ohne Login: Die Vorschau laeuft ueber die Service-Role.
revoke all on table public.article_preview_links from anon;

-- Rate-Limit-Aktion fuer Rueckmeldungen ueber den Link.
alter table public.newsletter_signup_attempts
  drop constraint newsletter_signup_attempts_action_check;
alter table public.newsletter_signup_attempts
  add constraint newsletter_signup_attempts_action_check
  check (action in ('subscribe', 'unsubscribe', 'contact', 'pitch', 'podcast_ingest', 'module_event', 'startup_contact', 'showcase_submit', 'showcase_upload', 'preview_response'));

-- Rueckbau:
-- drop table if exists public.article_preview_links;
-- CHECK von newsletter_signup_attempts auf den Stand aus
-- 20261115140000_showcase_submissions.sql zuruecksetzen.
