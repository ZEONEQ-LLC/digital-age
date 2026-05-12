-- Phase 7 PR C-1 — AI Prompts mit Submission-Workflow
--
-- Eine Tabelle deckt sowohl externe Submissions (pending) als auch
-- Author-CRUD (published direkt) ab. Editor approved/rejected/featured
-- via Status-Wechsel.
--
-- Status-Workflow:
--   pending     → externe Submission, wartet auf Editor-Approval
--   published   → öffentlich auf /ai-prompts
--   featured    → public + im "Top Prompts"-Block
--   rejected    → nicht sichtbar, Submission-Spur
--   archived    → war mal published, jetzt versteckt
--
-- Status-Übergänge:
--   Author (own row):
--     - kann eigenen Prompt zwischen published/archived togglen
--     - kann NICHT featured/rejected/pending setzen
--   Editor (any row):
--     - kann jeden Übergang machen
--   Anon:
--     - kann nur insert mit status=pending, author_id=null

create type prompt_status as enum (
  'pending',
  'published',
  'featured',
  'rejected',
  'archived'
);

create type prompt_difficulty as enum ('beginner', 'intermediate', 'expert');

create table public.ai_prompts (
  id uuid primary key default gen_random_uuid(),

  -- Step 1: Der Prompt
  title text not null check (char_length(title) <= 80 and char_length(title) > 0),
  prompt_text text not null check (char_length(prompt_text) <= 4000 and char_length(prompt_text) >= 20),
  context text not null check (char_length(context) > 0),
  example_output text,

  -- Step 2: Klassifizierung
  category text not null,
  tested_with text not null,
  difficulty prompt_difficulty not null,

  -- Author-Attribution
  -- author_id != null → Author-Submission (publishes direct)
  -- author_id == null → External Submission (needs approval)
  author_id uuid references public.authors(id) on delete set null,

  submitter_name text,
  submitter_email text,
  submitter_url text,

  -- Editorial-Workflow
  status prompt_status not null default 'pending',
  reviewed_by_id uuid references public.authors(id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  rejection_reason text,

  -- Public Engagement
  uses_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_prompts_status_idx on public.ai_prompts(status, published_at desc);
create index ai_prompts_category_idx on public.ai_prompts(category) where status in ('published', 'featured');
create index ai_prompts_author_idx on public.ai_prompts(author_id) where author_id is not null;

create trigger ai_prompts_set_updated_at
  before update on public.ai_prompts
  for each row execute function public.set_updated_at();

-- =========================================================================
-- Status-Transition-Trigger (statt naiver RLS WITH CHECK)
--
-- Naiver RLS-Ansatz "with check (status in ('published','archived'))" auf
-- author_update_own ist falsch: wenn ein Editor einen Prompt featured, kann
-- der Author dann nicht mal mehr den Titel korrigieren — weil das (unverändert
-- bleibende) status='featured' die WITH CHECK fängt.
--
-- Korrekt: nur den ÜBERGANG validieren. Wenn status sich nicht ändert, ist
-- alles ok. Wenn sich's ändert, darf Author nur published/archived setzen.
-- Editor bypasst.
-- =========================================================================

create or replace function public.check_prompt_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Status hat sich nicht geändert → unkritisch
  if new.status = old.status then
    return new;
  end if;

  -- Editor darf jeden Übergang
  if exists (
    select 1 from public.authors
    where user_id = auth.uid() and role = 'editor'
  ) then
    return new;
  end if;

  -- Non-Editor: nur published ↔ archived erlaubt
  if new.status not in ('published', 'archived') then
    raise exception 'Nur Editor:innen dürfen status auf % setzen.', new.status;
  end if;

  return new;
end;
$$;

create trigger ai_prompts_status_transition_check
  before update on public.ai_prompts
  for each row execute function public.check_prompt_status_transition();

alter table public.ai_prompts enable row level security;

-- =========================================================================
-- RLS-Policies
-- =========================================================================

-- Public: read published + featured
create policy "ai_prompts_public_read"
  on public.ai_prompts for select
  using (status in ('published', 'featured'));

-- Authors: read own (any status — sehen ihre rejected/archived auch)
create policy "ai_prompts_author_read_own"
  on public.ai_prompts for select
  to authenticated
  using (
    author_id in (
      select id from public.authors where user_id = auth.uid()
    )
  );

-- Authors (author/editor-role): insert own (status frei wählbar bei insert —
-- application-layer setzt 'published'). External-role nicht erlaubt — analog
-- Podcasts-Pattern.
create policy "ai_prompts_author_insert_own"
  on public.ai_prompts for insert
  to authenticated
  with check (
    author_id is not null
    and author_id in (
      select id from public.authors
      where user_id = auth.uid()
        and role in ('author', 'editor')
    )
  );

-- Authors: update own — Status-Transition wird vom Trigger oben enforced
create policy "ai_prompts_author_update_own"
  on public.ai_prompts for update
  to authenticated
  using (
    author_id in (
      select id from public.authors
      where user_id = auth.uid()
        and role in ('author', 'editor')
    )
  )
  with check (
    author_id in (
      select id from public.authors
      where user_id = auth.uid()
        and role in ('author', 'editor')
    )
  );

-- Authors: delete own
create policy "ai_prompts_author_delete_own"
  on public.ai_prompts for delete
  to authenticated
  using (
    author_id in (
      select id from public.authors
      where user_id = auth.uid()
        and role in ('author', 'editor')
    )
  );

-- Editors: full access (gilt für alle Rows, inkl. fremde + author_id=null)
create policy "ai_prompts_editor_all"
  on public.ai_prompts for all
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

-- External Submissions: anon und authenticated dürfen mit status=pending +
-- author_id=null + submitter_name/email einreichen. authenticated wird hier
-- erlaubt damit eingeloggte externe (Pre-Phase-7-Reste) auch submitten können
-- und der Server-Action-Pfad nicht von Cookie-Kontext abhängt.
create policy "ai_prompts_anon_submit"
  on public.ai_prompts for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and author_id is null
    and submitter_name is not null
    and submitter_email is not null
  );

-- =========================================================================
-- RPC für uses_count-Increment
-- Verhindert dass Public-User direkten UPDATE braucht (RLS-update auf
-- published rows wäre kompliziert — RPC ist sauberer).
-- =========================================================================

create or replace function public.increment_prompt_uses(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_prompts
  set uses_count = uses_count + 1
  where id = p_id
    and status in ('published', 'featured');
end;
$$;

revoke all on function public.increment_prompt_uses(uuid) from public;
grant execute on function public.increment_prompt_uses(uuid) to anon, authenticated;

-- =========================================================================
-- Grants
-- =========================================================================

grant select on public.ai_prompts to anon, authenticated;
grant insert on public.ai_prompts to anon, authenticated;
grant update, delete on public.ai_prompts to authenticated;
