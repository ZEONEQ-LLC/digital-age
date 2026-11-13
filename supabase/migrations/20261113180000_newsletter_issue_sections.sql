-- Newsletter-Rubriken (Wunsch Ali 13.11.2026): neben den Artikeln die
-- wichtigsten News der Woche, ein Hype-Check, ein Prompt und ein Podcast.
-- Additiv: eine jsonb-Spalte, Form und Pruefung im Code
-- (src/lib/newsletter/issue.ts, sanitizeSections). Bestehende Ausgaben
-- bekommen '{}' (= keine Rubriken). RLS und Rechte gelten fuer die Tabelle,
-- die neue Spalte braucht nichts Eigenes.

alter table public.newsletter_issues
  add column if not exists sections jsonb not null default '{}'::jsonb;

comment on column public.newsletter_issues.sections is
  'Rubriken der Ausgabe: { news: [...], hype, prompt, podcast }. Form siehe sanitizeSections in src/lib/newsletter/issue.ts.';

-- Rollback:
-- alter table public.newsletter_issues drop column if exists sections;
