-- Datenschutzerklaerung: Absatz zur Lesestatistik (eigene Messung ohne
-- Cookies, siehe 20261115190000_lesestatistik.sql). Daten-Migration: erst
-- nach dem Merge pushen, damit der Text nicht vor der Funktion live steht.
--
-- Der Absatz kommt in Ziffer 4 «Eingesetzte Dienste», direkt nach Google
-- Analytics. Nur wenn die Stelle noch so dasteht und der Absatz fehlt.

update public.pages p
   set body_blocks = jsonb_set(p.body_blocks, '{blocks}', (
         select jsonb_agg(x.b order by x.ord, x.sub)
           from (
             select t.b, t.ord, 0 as sub
               from jsonb_array_elements(p.body_blocks -> 'blocks') with ordinality as t(b, ord)
             union all
             select $j${"id": "bl-lesestatistik-2026-11", "type": "paragraph", "content": "**Lesestatistik (eigene Messung, ohne Cookies):** Wir zählen, wie oft Beiträge geöffnet und gelesen werden, damit Redaktion sowie Autorinnen und Autoren sehen, welche Inhalte ankommen. Erfasst werden pro Beitrag und Tag ausschliesslich Summen: Aufrufe, aktive Lesezeit, Lesetiefe (wie weit gescrollt wurde), Klicks auf «Teilen» und «Anhören» sowie die Art der Herkunft (zum Beispiel Suchmaschine, soziales Netzwerk oder direkter Aufruf). Die Messung setzt keine Cookies, legt nichts in Ihrem Browser ab und vergibt keine Kennung. In der Statistik werden weder Ihre IP-Adresse noch die Adresse der verweisenden Seite gespeichert, ein Rückschluss auf einzelne Personen ist nicht möglich. Die Messung läuft deshalb unabhängig vom Consent-Banner. Zum Schutz vor Missbrauch verarbeiten wir beim Zählen einen nicht umkehrbaren Prüfwert (Hash) Ihrer IP-Adresse, ohne Bezug zum gelesenen Beitrag. Er wird in der Regel nach 24 Stunden gelöscht."}$j$::jsonb, t.ord, 1
               from jsonb_array_elements(p.body_blocks -> 'blocks') with ordinality as t(b, ord)
              where t.b->>'id' = 'bl-1780342725963-3g'
           ) x))
 where p.slug = 'datenschutzerklaerung'
   and p.body_blocks::text not like '%bl-lesestatistik-2026-11%'
   and p.body_blocks::text like '%bl-1780342725963-3g%';
