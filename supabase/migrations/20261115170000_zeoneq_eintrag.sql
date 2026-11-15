-- Verzeichniseintrag «ZEONEQ GmbH» ueberarbeiten (Auftrag Ali 15.11.2026).
-- Der Eintrag war ein Testeintrag mit Platzhaltertext. Quellen: Handelsregister
-- (Zefix: ZEONEQ GmbH, Cham, Zweck: ICT-Leistungen, Entwicklung und Betrieb
-- digitaler Plattformen und Produkte, Unternehmensberatung) und die eigene
-- Seite /redaktion (Dachgesellschaft mehrerer digitaler Marken, darunter
-- digital age).
--
-- Daten-Migration: wird nach dem Merge gepusht. Der Waechter auf dem alten
-- Platzhaltertext macht sie wiederholbar und laesst einen inzwischen von Hand
-- gepflegten Eintrag unberuehrt.

update public.ai_startups
   set tagline = 'Entwickelt und betreibt digitale Plattformen, darunter digital age',
       description = 'Die ZEONEQ GmbH mit Sitz in Cham entwickelt und betreibt digitale Plattformen und Produkte und berät Unternehmen. Sie ist die Dachgesellschaft mehrerer digitaler Marken. Dazu gehört digital age, das Magazin für KI und Future Tech, das dieses Verzeichnis führt.',
       industry = 'Andere',
       founder_names = array['Ali Soy'],
       open_to_investment = false
 where slug = 'zeoneq-gmbh'
   and description = 'sdfsafsdfasdfdasfasdfsadf';

-- Rueckbau: Werte von Hand im Admin unter /autor/admin/startups setzen.
