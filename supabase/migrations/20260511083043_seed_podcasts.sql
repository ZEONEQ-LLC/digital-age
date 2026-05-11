-- Phase 7 Session D — Seed Podcasts
--
-- 4 echte Empfehlungen aus der alten Plattform (digital-age.ch/podcasts),
-- alle empfohlen von Ali Soy. Beschreibungen aus den Mock-Daten übernommen
-- und auf 1-2 Sätze für Listing-Tauglichkeit gekürzt.
--
-- TODO post-Session-D: Cover-Bilder via Supabase Storage hochladen und URLs
-- in der Tabelle aktualisieren (aktuell picsum-Placeholder).

insert into public.podcasts (
  title, description, cover_image_url, language, podcast_category,
  spotify_url, apple_podcasts_url, recommended_by_id, recommended_at
)
select
  v.title, v.description, v.cover_image_url, v.language, v.podcast_category,
  v.spotify_url, v.apple_podcasts_url,
  (select id from public.authors where slug = 'ali-soy'),
  v.recommended_at::timestamptz
from (values
  (
    'Der ARD KI-Podcast',
    'Der wöchentliche KI-Podcast von ARD und BR24. Forschung, Anwendungen und Risiken — auf Deutsch verständlich aufbereitet.',
    'https://picsum.photos/seed/podcast-ki/600',
    'de',
    'Tech & Society',
    'https://open.spotify.com/show/0WIWmpfdimHmhVXJpc56sC',
    'https://podcasts.apple.com/de/podcast/ki-verstehen/id1701430245',
    '2026-05-02T08:00:00Z'
  ),
  (
    'heise KI-Update',
    'Das tägliche Briefing zur KI-Welt von heise online. Kompakt, kuratiert, ohne Hype-Zyklen.',
    'https://picsum.photos/seed/podcast-heise/600',
    'de',
    'News & Updates',
    'https://open.spotify.com/show/3KZTI0VeXCJtGvDVHhsTdz',
    'https://podcasts.apple.com/de/podcast/ki-update/id1641029931',
    '2026-04-25T08:00:00Z'
  ),
  (
    'The TED AI Show',
    'Bilawal Sidhu im Gespräch mit Forschenden, Founders und Kritikern über das, was KI gerade real verändert.',
    'https://picsum.photos/seed/podcast-tedai/600',
    'en',
    'KI & Forschung',
    'https://open.spotify.com/show/7ipYIkF1RLqujGVXjWS3w8',
    'https://podcasts.apple.com/us/podcast/the-ted-ai-show/id1742887382',
    '2026-04-18T08:00:00Z'
  ),
  (
    'Tim Ferriss & Eric Schmidt',
    'Long-Form-Gespräch zwischen Tim Ferriss und Eric Schmidt über AI, Future of Warfare und das, was Schmidt für die nächsten zehn Jahre wirklich erwartet.',
    'https://picsum.photos/seed/podcast-ferriss/600',
    'en',
    'Tech & Society',
    'https://open.spotify.com/show/5qSUyCrk9KR69lEiXbjwXM',
    'https://podcasts.apple.com/us/podcast/the-tim-ferriss-show/id863897795',
    '2026-03-28T08:00:00Z'
  )
) as v(title, description, cover_image_url, language, podcast_category, spotify_url, apple_podcasts_url, recommended_at);
