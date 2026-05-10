-- Phase 7 Session C — Article Subcategory Label (DEVIATION vom Spec)
--
-- Begründung: Die Listing-Pages (/ki-im-business, /future-tech) zeigen pro Card
-- ein feineres Subcategory-Label wie "AI in Banking", "EU AI Act", "GenAI",
-- "Quantencomputing" usw. Das categories-Table modelliert nur die Hauptkategorien
-- (ki-business, future-tech, swiss-ai, tools). Ohne ein separates
-- Subcategory-Feld auf articles würden:
--   - die Card-Labels in den Listings nur die Hauptkategorie zeigen
--   - die Subcategory-Filter-Chips in TopicListing nicht funktionieren
-- Eine eigene `subcategories`-Tabelle wäre Overkill, weil die Werte loose
-- Labels sind, keine normalisierten Entitäten. Daher text column auf articles.
--
-- TODO Session E: ggf. tags-Array ergänzen für Multi-Tag-Filterung.

alter table articles
  add column subcategory text;

create index idx_articles_subcategory on articles(subcategory);

comment on column articles.subcategory is 'Anzeige-Subcategory-Label, z.B. "AI in Banking", "EU AI Act", "GenAI". Loose Label, separat vom normalisierten category_id';
