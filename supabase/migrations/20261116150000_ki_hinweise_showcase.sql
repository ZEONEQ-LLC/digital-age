-- Showcase S3b: Die KI erstellt aus dem Fragebogen eines Unternehmens einen
-- Entwurf. Zwei oeffentliche Texte sagen bisher etwas anderes und werden
-- angepasst. Daten-Migration: erst nach dem Merge pushen.
--
-- 1. Datenschutzerklaerung, Absatz zu Anthropic: nennt neu auch die uebrigen
--    redaktionellen Hilfen und die Antworten aus dem Showcase-Fragebogen.
--    Nur wenn der Absatz noch den bisherigen Schlusssatz traegt.
-- 2. Seite «KI-Transparenz»: neuer Punkt «Showcase» am Ende der Liste der
--    Einsatzbereiche. Nur wenn er fehlt.

update public.pages p
   set body_blocks = jsonb_set(p.body_blocks, '{blocks}', (
         select jsonb_agg(
                  case when t.b->>'id' = 'bl-1780342725963-3f'
                       then jsonb_set(t.b, '{content}', to_jsonb($t$**KI-gestützte redaktionelle Hilfe (Anthropic, PBC, USA):** Für redaktionelle Hilfen nutzen wir die API von Anthropic (Claude), zum Beispiel für SEO-Vorschläge, Zusammenfassungen, Bildbeschreibungen, den Entwurf des Newsletters und die Aufbereitung von News-Ticker-Einträgen. An Anthropic werden dafür Artikel-Texte, Bilder aus Artikeln und News-Inhalte übermittelt. Für Unternehmensbeiträge im Showcase übermitteln wir zusätzlich die Antworten oder den Text aus dem Fragebogen des Unternehmens, einschliesslich eines allfälligen Zitats mit Name und Funktion, um daraus einen Entwurf zu erstellen. Name und E-Mail-Adresse der Kontaktperson gehen nicht an Anthropic. Daten von Besucherinnen und Besuchern der Website werden nicht übermittelt.$t$::text))
                       else t.b
                  end
                  order by t.ord)
           from jsonb_array_elements(p.body_blocks -> 'blocks') with ordinality as t(b, ord)))
 where p.slug = 'datenschutzerklaerung'
   and p.body_blocks::text like '%bl-1780342725963-3f%'
   and p.body_blocks::text like '%nicht aber Daten von Besucherinnen und Besuchern der Website.%'
   and p.body_blocks::text not like '%Für Unternehmensbeiträge im Showcase übermitteln wir%';

update public.pages p
   set body_blocks = jsonb_set(p.body_blocks, '{blocks}', (
         select jsonb_agg(
                  case when t.b->>'id' = 'bl-1780342784105-5o' and jsonb_typeof(t.b->'items') = 'array'
                       then jsonb_set(t.b, '{items}', (t.b->'items') || to_jsonb($t$**{{g}}Showcase:{{/g}}** Unternehmensbeiträge im Showcase entstehen auf Wunsch aus einem Fragebogen: Claude schreibt aus den Antworten des Unternehmens einen Entwurf. Die Redaktion prüft ihn, das Unternehmen gibt ihn frei. Ohne Freigabe erscheint nichts.$t$::text))
                       else t.b
                  end
                  order by t.ord)
           from jsonb_array_elements(p.body_blocks -> 'blocks') with ordinality as t(b, ord)))
 where p.slug = 'ki-transparenz'
   and p.body_blocks::text like '%bl-1780342784105-5o%'
   and p.body_blocks::text not like '%{{g}}Showcase:{{/g}}%';
