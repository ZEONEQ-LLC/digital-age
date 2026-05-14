-- Phase 8f — Featured/Hero-Spotlight-System.
--
-- `articles.is_featured` existiert bereits seit dem Initial-Schema. Hier
-- kommt `is_hero` dazu, plus zwei strukturelle Garantien:
--   1. Hero impliziert Featured (CHECK-Constraint).
--   2. Maximal 1 Hero pro Kategorie (Partial Unique Index).
--
-- Die Max-3-Featured-pro-Kategorie-Regel wird in der App-Logic enforced
-- (Server-Action), NICHT in der DB. Begründung: eine variable Count-Regel
-- ist mit Constraints klobig (würde Trigger oder generated-column brauchen)
-- und für unsere Use-Case ist App-seitige Enforcement transparent genug.

alter table public.articles
  add column is_hero boolean not null default false;

alter table public.articles
  add constraint hero_must_be_featured
  check (is_hero = false or is_featured = true);

create unique index one_hero_per_category
  on public.articles (category_id)
  where is_hero = true;
