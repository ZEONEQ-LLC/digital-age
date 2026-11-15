-- Showcase S2b, Daten (nach dem Merge pushen):
--
--   1. Interessenbindung in sieben redaktionellen Artikeln, in denen die
--      Connect AI Group GmbH oder ihre Produkte vorkommen (Entscheid Ali
--      15.11.2026: Hinweis ueber ein Feld). Der Sachverhalt ist derselbe wie
--      in der Offenlegung im Verzeichnis (20261114091000). Die Texte lassen
--      sich im Editor aendern (Details → Interessenbindung).
--   2. Logo der Connect AI Group GmbH: dieselbe Datei, aber vom eigenen Server
--      statt als Fremdbild von Trustpilot (jeder Seitenaufruf lud sie dort).
--
-- Jede Aenderung greift nur, wenn der Datensatz noch dem Stand vom 15.11.2026
-- entspricht (kein Hinweis gesetzt bzw. noch die alte Logo-Adresse).
-- Die zwei Kooperationsartikel (european-ai-act-unternehmen,
-- ki-fuer-unternehmen-risiken) bekommen keinen Hinweis: Sie wechseln in den
-- Showcase und tragen dort die Kennzeichnung des Unternehmens.

update public.articles
   set disclosure_note = 'Ali Soy, Autor dieses Artikels und Herausgeber von digital age, ist CGO der Connect AI Group GmbH. Das Unternehmen ist einer der verglichenen Anbieter.'
 where slug = 'ki-im-kundendienst'
   and disclosure_note is null
   and content_type = 'editorial';

update public.articles
   set disclosure_note = 'Ali Soy, Autor dieses Artikels und Herausgeber von digital age, ist CGO der Connect AI Group GmbH. Das Unternehmen oder seine Produkte kommen im Text vor.'
 where slug in (
         'ceo-vs-mascot',
         '4-ki-gesetzte-die-wir-brauchen',
         'ki-kompetenz-fuer-unternehmen',
         'schweizer-ki-souveraenitaet',
         'ki-demokratie-jetzt'
       )
   and disclosure_note is null
   and content_type = 'editorial';

update public.articles
   set disclosure_note = 'Ali Soy, Herausgeber von digital age, ist CGO der Connect AI Group GmbH. Ein Produkt des Unternehmens kommt im Text als Beispiel vor.'
 where slug = 'enterprise-gpt'
   and disclosure_note is null
   and content_type = 'editorial';

update public.ai_startups
   set logo_url = '/images/startups/connect-ai-group-gmbh.png'
 where slug = 'connect-ai-group-gmbh'
   and logo_url = 'https://consumersiteimages.trustpilot.net/business-units/68777fb5cb702704dacb0a8c-198x149-2x.avif';

-- Rueckbau:
-- update public.articles set disclosure_note = null where slug in ('ki-im-kundendienst', 'ceo-vs-mascot', '4-ki-gesetzte-die-wir-brauchen', 'ki-kompetenz-fuer-unternehmen', 'schweizer-ki-souveraenitaet', 'ki-demokratie-jetzt', 'enterprise-gpt');
-- update public.ai_startups set logo_url = 'https://consumersiteimages.trustpilot.net/business-units/68777fb5cb702704dacb0a8c-198x149-2x.avif' where slug = 'connect-ai-group-gmbh';
