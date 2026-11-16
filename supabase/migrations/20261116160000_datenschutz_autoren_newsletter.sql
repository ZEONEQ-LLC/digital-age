-- Newsletter fuer Autorinnen und Autoren (20261116130000_newsletter_autoren.sql):
-- Absatz in der Datenschutzerklaerung. Daten-Migration: erst nach dem Merge
-- pushen, damit der Text nicht vor der Funktion live steht.
--
-- Der Absatz kommt in Ziffer 4, direkt nach dem E-Mail-Versand (Resend). Nur
-- wenn die Stelle noch so dasteht und der Absatz fehlt.

update public.pages p
   set body_blocks = jsonb_set(p.body_blocks, '{blocks}', (
         select jsonb_agg(x.b order by x.ord, x.sub)
           from (
             select t.b, t.ord, 0 as sub
               from jsonb_array_elements(p.body_blocks -> 'blocks') with ordinality as t(b, ord)
             union all
             select $j${"id": "bl-newsletter-autoren-2026-11", "type": "paragraph", "content": "**Newsletter für Autorinnen und Autoren:** Wer für digital age schreibt und ein Konto in unserer Autoren-Suite hat, erhält den Newsletter automatisch an die im Profil hinterlegte E-Mail-Adresse. Die Abmeldung ist jederzeit über den Link in jeder Ausgabe möglich. Wer sich abgemeldet hat, wird nicht erneut eingetragen."}$j$::jsonb, t.ord, 1
               from jsonb_array_elements(p.body_blocks -> 'blocks') with ordinality as t(b, ord)
              where t.b->>'id' = 'bl-1780342725963-3e'
           ) x))
 where p.slug = 'datenschutzerklaerung'
   and p.body_blocks::text not like '%bl-newsletter-autoren-2026-11%'
   and p.body_blocks::text like '%bl-1780342725963-3e%';
