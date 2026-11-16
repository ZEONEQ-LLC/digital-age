-- Datenschutzerklaerung: Absatz zum Showcase-Fragebogen (S3a). Daten-Migration:
-- erst nach dem Merge pushen, damit der Text nicht vor der Funktion live steht.
--
-- Der Absatz kommt in Ziffer 7, direkt nach «Kontaktaufnahme mit Unternehmen
-- im Swiss-AI-Verzeichnis» (PR 211). Nur wenn die Stelle noch so dasteht und
-- der Absatz fehlt.

update public.pages p
   set body_blocks = jsonb_set(p.body_blocks, '{blocks}', (
         select jsonb_agg(x.b order by x.ord, x.sub)
           from (
             select t.b, t.ord, 0 as sub
               from jsonb_array_elements(p.body_blocks -> 'blocks') with ordinality as t(b, ord)
             union all
             select $j${"id": "bl-showcase-fragebogen-2026-11", "type": "paragraph", "content": "**Showcase-Fragebogen für Unternehmen:** Unternehmen, die wir zum Showcase einladen, erhalten einen persönlichen Link zu einem Fragebogen. Wir verarbeiten die dort gemachten Angaben (Name, Funktion und E-Mail-Adresse der Kontaktperson, Antworten und Texte, Links, Logo und Bild, Profildaten des Unternehmens sowie die erteilten Einverständnisse), um daraus einen Beitragsentwurf zu erstellen, ihn dem Unternehmen zur Freigabe vorzulegen und das Verzeichnisprofil zu aktualisieren. Ohne Freigabe des Unternehmens erscheint kein Beitrag. Der Zwischenstand des Fragebogens liegt bis zum Absenden nur im Browser der ausfüllenden Person (localStorage) und wird uns nicht übermittelt. Stimmt das Unternehmen der Weiterleitung von Kontaktanfragen zu, gilt dafür der vorstehende Absatz. Zum Schutz vor Missbrauch verarbeiten wir einen nicht umkehrbaren Prüfwert (Hash) der IP-Adresse, der in der Regel nach 24 Stunden gelöscht wird."}$j$::jsonb, t.ord, 1
               from jsonb_array_elements(p.body_blocks -> 'blocks') with ordinality as t(b, ord)
              where t.b->>'id' = 'bl-pr211-startup-kontakt'
           ) x))
 where p.slug = 'datenschutzerklaerung'
   and p.body_blocks::text not like '%bl-showcase-fragebogen-2026-11%'
   and p.body_blocks::text like '%bl-pr211-startup-kontakt%';
