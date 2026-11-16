-- Anzeigen im Newsletter (20261116110000_newsletter_anzeigen.sql), Daten.
-- Daten-Migration: erst nach dem Merge pushen, damit Haekchen und Text nicht
-- vor der Funktion live stehen.
--
-- 1. Die zwei laufenden Kundenkampagnen (handyabo.com, topinserate.ch) werden
--    fuer den Newsletter vorgeschlagen (Wunsch Ali 16.11.2026: Werbung der
--    Werbepartner im Newsletter). Ob eine Anzeige in einer Ausgabe steht,
--    entscheidet weiterhin die Redaktion im Entwurf.
-- 2. Datenschutzerklaerung: Absatz zu Links und Anzeigen im Newsletter, in
--    Ziffer 4 direkt nach dem E-Mail-Versand (Resend). Nur wenn die Stelle
--    noch so dasteht und der Absatz fehlt.

update public.ad_campaigns
   set in_newsletter = true
 where id in ('86869a0e-5c14-47eb-a6d7-8e64d4c34244', '236b4e8e-9701-49dc-843c-c25144969b98')
   and is_house = false
   and status = 'live'
   and in_newsletter = false;

update public.pages p
   set body_blocks = jsonb_set(p.body_blocks, '{blocks}', (
         select jsonb_agg(x.b order by x.ord, x.sub)
           from (
             select t.b, t.ord, 0 as sub
               from jsonb_array_elements(p.body_blocks -> 'blocks') with ordinality as t(b, ord)
             union all
             select $j${"id": "bl-newsletter-anzeigen-2026-11", "type": "paragraph", "content": "**Links und Anzeigen im Newsletter:** Links im Newsletter auf unsere Inhalte tragen eine Kennung, an der wir erkennen, dass ein Aufruf aus dem Newsletter kommt, nicht aber von wem. Anzeigen im Newsletter sind als «Anzeige» gekennzeichnet. Ihre Links führen über eine Weiterleitung auf digital-age.ch: Wir zählen pro Ausgabe und Anzeige die Anzahl der Klicks, ohne Bezug zu Ihrer Person oder Ihrer E-Mail-Adresse. Zum Schutz vor Missbrauch verarbeiten wir dabei einen nicht umkehrbaren Prüfwert (Hash) Ihrer IP-Adresse, der in der Regel nach 24 Stunden gelöscht wird."}$j$::jsonb, t.ord, 1
               from jsonb_array_elements(p.body_blocks -> 'blocks') with ordinality as t(b, ord)
              where t.b->>'id' = 'bl-1780342725963-3e'
           ) x))
 where p.slug = 'datenschutzerklaerung'
   and p.body_blocks::text not like '%bl-newsletter-anzeigen-2026-11%'
   and p.body_blocks::text like '%bl-1780342725963-3e%';
