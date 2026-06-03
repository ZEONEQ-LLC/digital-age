-- Hero-Cover Bild-Metadaten — ALT, Caption, Bildquelle.
--
-- Bislang wurde im Public-Rendering durchgängig article.title als ALT für
-- das Hero-Bild und für og:image.alt / twitter:image.alt verwendet. Eigene
-- Spalten fehlten. Diese Migration legt sie an; Editor-UI und Public-
-- Rendering folgen im selben PR.
--
-- Drei neue Spalten auf public.articles, alle text + NULLABLE:
--   - cover_image_alt:     Alternativtext für Screenreader und Bild-SEO.
--   - cover_image_caption: Sichtbare Bildunterschrift unter dem Hero-Bild.
--   - cover_image_source:  Bildquelle/Credit, z.B. "© Fotograf / Agentur".
--
-- ALT wird in einem späteren PR als Pre-Publish-Pflichtfeld gegated;
-- jetzt bleibt das Feld nullable, damit Bestandsartikel ohne Migration
-- weiterhin publishbar bleiben.

alter table public.articles
  add column cover_image_alt text,
  add column cover_image_caption text,
  add column cover_image_source text;

comment on column public.articles.cover_image_alt is
  'Alternativtext fuer das Hero-Cover-Bild (a11y + Bild-SEO). Kurz, beschreibend, kein Titel-Duplikat. Wird im spaeteren PR als Pre-Publish-Pflichtfeld gegated.';
comment on column public.articles.cover_image_caption is
  'Optionale Bildunterschrift, sichtbar unter dem Hero-Bild auf der Artikelseite.';
comment on column public.articles.cover_image_source is
  'Optionale Bildquelle/Credit (z.B. "© Fotograf / Agentur"), klein unter der Bildunterschrift gerendert.';

-- ROLLBACK (auskommentiert, nur als Doku):
-- alter table public.articles drop column if exists cover_image_source;
-- alter table public.articles drop column if exists cover_image_caption;
-- alter table public.articles drop column if exists cover_image_alt;
