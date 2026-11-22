-- Drei weitere News-Quellen (Ja von Ali, 22.11.2026). Bisher nur 4 aktive
-- Quellen, am Wochenende kam deshalb kaum etwas: Heise-Top und Netzwoche
-- ruhen samstags/sonntags weitgehend.
--
--   Inside IT    CH, IT fuer Entscheider, RSS 2.0  -> ki-business
--   The Decoder  DE, reines KI-Magazin, publiziert auch sonntags -> ki-business
--   Futurezone   AT, Tech und Science, publiziert auch sonntags  -> future-tech
--
-- Feeds am 22.11.2026 mit dem User-Agent des Tickers geprueft (HTTP 200,
-- RSS 2.0 mit title/link/pubDate/description, vom Fetcher unterstuetzt).
-- Daten-Migration: nach dem Merge pushen. Idempotent ueber die URL.

insert into public.news_sources (name, url, source_type, language, country, default_category, is_active)
select v.name, v.url, 'rss', v.language, v.country, v.default_category, true
from (
  values
    ('Inside IT', 'https://www.inside-it.ch/rss.xml', 'de', 'CH', 'ki-business'),
    ('The Decoder', 'https://the-decoder.de/feed/', 'de', 'DE', 'ki-business'),
    ('Futurezone', 'https://futurezone.at/xml/rss', 'de', 'AT', 'future-tech')
) as v(name, url, language, country, default_category)
where not exists (
  select 1 from public.news_sources s where s.url = v.url
);
