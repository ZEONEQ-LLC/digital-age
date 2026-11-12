-- Newsletter-Versand (Entscheid Ali 12.11.2026: Entwurf + Freigabe).
-- Montags erstellt ein Cron aus den neuen Artikeln einen Entwurf (KI schreibt
-- Betreff, Einleitung und Kurztexte), die Redaktion prueft ihn im Admin,
-- schickt einen Test an sich und gibt ihn per Klick frei. Versand ueber
-- Resend an alle bestaetigten Abonnenten, mit Abmeldelink pro Empfaenger.
--
-- newsletter_issues: eine Zeile pro Ausgabe. Hoechstens eine offene Ausgabe
--   (draft oder sending) gleichzeitig. items = [{ articleId, slug, title,
--   teaser, category, coverUrl }] in der Versandreihenfolge.
-- newsletter_deliveries: ein Empfaenger pro Ausgabe (Momentaufnahme der
--   bestaetigten Abonnenten beim Start). Macht den Versand wiederaufnehmbar:
--   Wer schon sent_at hat, bekommt nichts mehr.
--
-- RLS: Editoren lesen beides und pflegen Entwuerfe ueber den Session-Client.
-- Cron und Versand laufen mit der Service-Role. Additiv: nur neue Tabellen.

create table public.newsletter_issues (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft'
    check (status in ('draft', 'sending', 'sent', 'discarded')),
  subject text not null check (char_length(subject) between 1 and 200),
  intro text not null default '' check (char_length(intro) <= 2000),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  period_from timestamptz not null,
  period_to timestamptz not null,
  source text not null default 'cron' check (source in ('cron', 'manual')),
  ai_note text,
  created_by uuid references public.authors(id) on delete set null,
  edited_at timestamptz,
  test_sent_at timestamptz,
  send_started_at timestamptz,
  sent_at timestamptz,
  sent_by uuid references public.authors(id) on delete set null,
  recipients_count integer,
  delivered_count integer not null default 0,
  failed_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.newsletter_issues is
  'Newsletter-Ausgaben: Entwurf (Cron montags oder manuell), Freigabe und Versand im Admin. Hoechstens eine offene Ausgabe.';

create unique index newsletter_issues_one_open
  on public.newsletter_issues ((true))
  where status in ('draft', 'sending');

create index newsletter_issues_created_at_idx
  on public.newsletter_issues (created_at desc);

create trigger newsletter_issues_set_updated_at
  before update on public.newsletter_issues
  for each row execute function public.set_updated_at();

create table public.newsletter_deliveries (
  issue_id uuid not null references public.newsletter_issues(id) on delete cascade,
  subscriber_id uuid not null references public.newsletter_subscribers(id) on delete cascade,
  sent_at timestamptz,
  error text,
  provider_id text,
  created_at timestamptz not null default now(),
  primary key (issue_id, subscriber_id)
);

comment on table public.newsletter_deliveries is
  'Empfaenger je Newsletter-Ausgabe (Momentaufnahme beim Versandstart). sent_at gesetzt = zugestellt an Resend; error = fehlgeschlagen, wird beim Fortsetzen erneut versucht.';

create index newsletter_deliveries_pending_idx
  on public.newsletter_deliveries (issue_id)
  where sent_at is null;

alter table public.newsletter_issues enable row level security;
alter table public.newsletter_deliveries enable row level security;

create policy "newsletter_issues_editor_select" on public.newsletter_issues
  for select to authenticated using (public.is_editor());
create policy "newsletter_issues_editor_insert" on public.newsletter_issues
  for insert to authenticated with check (public.is_editor());
create policy "newsletter_issues_editor_update" on public.newsletter_issues
  for update to authenticated using (public.is_editor()) with check (public.is_editor());

create policy "newsletter_deliveries_editor_select" on public.newsletter_deliveries
  for select to authenticated using (public.is_editor());

-- Keine Rechte fuer anon. authenticated nur, was die Policies erlauben.
revoke all on public.newsletter_issues from anon;
revoke all on public.newsletter_deliveries from anon;

-- Rollback (auskommentiert, nur als Doku):
-- drop table if exists public.newsletter_deliveries;
-- drop table if exists public.newsletter_issues;
