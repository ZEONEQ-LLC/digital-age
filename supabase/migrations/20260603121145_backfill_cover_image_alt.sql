-- WP-Cover-ALT-Backfill: 14 manuell reviewte Slugs.
--
-- Quelle: migration/wordpress-export.xml (Phase-A-Vorschau-Skript
-- migration/wp_alt_vorschlaege.txt). 14 von 36 maschinell extrahierten
-- Vorschlaegen wurden von der Redaktion freigegeben; der Rest war Titel-
-- Echo oder generische "Hero Image"-Platzhalter und wird nicht
-- gebackfillt — die betroffenen Artikel bleiben NULL und werden spaeter
-- redaktionell gepflegt.
--
-- Schutz: jedes UPDATE traegt die Bedingung cover_image_alt IS NULL.
-- Ein bereits manuell gesetzter ALT (insbesondere portable-trust, der
-- nicht in dieser Liste ist) wird unter keinen Umstaenden ueberschrieben.
--
-- Eine einzige Transaktion — alle 14 oder keine.

begin;

update public.articles
  set cover_image_alt = 'Redesign Banking Process - Team of banking professionals redesigning workflows using AI and employee feedback'
  where slug = '4-insights-redesign-banking-ai' and cover_image_alt is null;

update public.articles
  set cover_image_alt = '700 Millionen Bilder und OpenAI KI-Datenkolonialismus: Wie OpenAI uns mit KI-Zückerchen lockt'
  where slug = '700-millionen-bilder-und-ki-datenkolonialismus' and cover_image_alt is null;

update public.articles
  set cover_image_alt = 'Man‑Machine Collaboration'
  where slug = 'agentic-ai-in-banking' and cover_image_alt is null;

update public.articles
  set cover_image_alt = 'AI in investing – visual representation of a data-driven investor.'
  where slug = 'ai-in-investing-behavioral-biases' and cover_image_alt is null;

update public.articles
  set cover_image_alt = 'KI-Job-Ranking: CEOs vs. Maskottchen'
  where slug = 'ceo-vs-mascot' and cover_image_alt is null;

update public.articles
  set cover_image_alt = 'EU AI Act Mensch und Roboter'
  where slug = 'eu-ai-act-und-schweizer-unternehmen' and cover_image_alt is null;

update public.articles
  set cover_image_alt = 'KI-Benchmark neu gedacht: Cyberpunk-Katze als Pizza-DJ im Weltall'
  where slug = 'ki-benchmark' and cover_image_alt is null;

update public.articles
  set cover_image_alt = 'Matrix mit vier Modellen: Netarchical Capitalism, Global Commons, Distributed Capitalism, Resilient Communities – im Kontext von KI-Demokratie'
  where slug = 'ki-demokratie-jetzt' and cover_image_alt is null;

update public.articles
  set cover_image_alt = 'KI für Unternehmen: Digitales grünes Vorhängeschloss auf einem Schild – Symbol für Cybersecurity und Datenschutz'
  where slug = 'ki-fuer-unternehmen-risiken' and cover_image_alt is null;

update public.articles
  set cover_image_alt = 'KI-Influencer Mia Zelu'
  where slug = 'ki-influencer' and cover_image_alt is null;

update public.articles
  set cover_image_alt = 'Frustrated young man'
  where slug = 'ki-kompetenz-fuer-unternehmen' and cover_image_alt is null;

update public.articles
  set cover_image_alt = 'Gescannter Lehrplan'
  where slug = 'texterkennung-mit-kunstlicher-intelligenz' and cover_image_alt is null;

update public.articles
  set cover_image_alt = 'Agentic AI Architecture - Shared Business Brain'
  where slug = 'agentic-ai-architecture' and cover_image_alt is null;

update public.articles
  set cover_image_alt = 'Skills for AI Agents'
  where slug = 'reusable-ai-skills' and cover_image_alt is null;

commit;

-- ROLLBACK (auskommentiert, nur als Doku — setzt NUR die hier gesetzten
-- 14 Slugs zurueck auf null; spaeter manuell gesetzte ALTs auf denselben
-- Slugs koennen damit verloren gehen, daher nicht blind ausfuehren):
-- begin;
-- update public.articles set cover_image_alt = null where slug in (
--   '4-insights-redesign-banking-ai',
--   '700-millionen-bilder-und-ki-datenkolonialismus',
--   'agentic-ai-in-banking',
--   'ai-in-investing-behavioral-biases',
--   'ceo-vs-mascot',
--   'eu-ai-act-und-schweizer-unternehmen',
--   'ki-benchmark',
--   'ki-demokratie-jetzt',
--   'ki-fuer-unternehmen-risiken',
--   'ki-influencer',
--   'ki-kompetenz-fuer-unternehmen',
--   'texterkennung-mit-kunstlicher-intelligenz',
--   'agentic-ai-architecture',
--   'reusable-ai-skills'
-- );
-- commit;
