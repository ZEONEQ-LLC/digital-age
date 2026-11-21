-- Datenschutzerklaerung, Absatz «Lesestatistik» (bl-lesestatistik-2026-11):
-- Showcase S4 zaehlt bei Unternehmensbeitraegen Klicks auf Links zur Website
-- des Unternehmens und schickt dem Unternehmen die Summen. Daten-Migration,
-- nach dem Merge pushen. Ersetzt nur, wenn die Stellen noch so dastehen.

update public.pages p
   set body_blocks = jsonb_set(
         p.body_blocks,
         '{blocks}',
         (select jsonb_agg(
                   case when b->>'id' = 'bl-lesestatistik-2026-11'
                        then jsonb_set(b, '{content}', to_jsonb(
                               replace(
                                 replace(b->>'content',
                                   'damit Redaktion sowie Autorinnen und Autoren sehen, welche Inhalte ankommen.',
                                   'damit Redaktion sowie Autorinnen und Autoren sehen, welche Inhalte ankommen. Unternehmen mit einem Beitrag im Showcase erhalten die Summen zu ihrem Beitrag.'),
                                 'Klicks auf «Teilen» und «Anhören» sowie',
                                 'Klicks auf «Teilen» und «Anhören», bei Unternehmensbeiträgen im Showcase zusätzlich Klicks auf Links zur Website des Unternehmens, sowie')))
                        else b end
                   order by ord)
            from jsonb_array_elements(p.body_blocks->'blocks') with ordinality t(b, ord)))
 where p.slug = 'datenschutzerklaerung'
   and exists (
     select 1 from jsonb_array_elements(p.body_blocks->'blocks') b
      where b->>'id' = 'bl-lesestatistik-2026-11'
        and b->>'content' like '%Klicks auf «Teilen» und «Anhören» sowie%'
        and b->>'content' like '%welche Inhalte ankommen.%'
        and b->>'content' not like '%Website des Unternehmens%');
