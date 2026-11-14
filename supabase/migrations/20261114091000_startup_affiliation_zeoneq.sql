-- Offenlegung ZEONEQ GmbH genauer (S1): Laut Impressum und /redaktion ist die
-- ZEONEQ GmbH die Herausgeberin von digital age, Ali Soy ihr CEO. Der Text aus
-- 20261114090000 («ist mit … verbunden») war unnötig vage. Nur Daten.

update public.ai_startups
   set affiliation_note = 'Die ZEONEQ GmbH ist die Herausgeberin von digital age; Ali Soy ist ihr CEO.'
 where slug = 'zeoneq-gmbh'
   and affiliation_note = 'Die ZEONEQ GmbH ist mit Ali Soy, dem Herausgeber von digital age, verbunden.';
