-- Phase 7 Session C — Seed existing articles
--
-- 23 Articles aus drei Mock-Quellen konsolidiert:
--   - 6 Articles aus mockAuthorApi.ts (mit echtem body via sampleBlocks)
--   - 8 zusätzliche Articles aus /ki-im-business Listing (Placeholder-Body)
--   - 9 zusätzliche Articles aus /future-tech Listing (Placeholder-Body)
--
-- is_featured = true für die 4 BentoGrid-Articles auf der Homepage.
-- word_count und reading_minutes setzt der Trigger automatisch.
-- TODO Session F: echte Body-Inhalte für die Listing-Only-Articles.

do $$
declare
  v_sample_body text := $body$## Die Banken haben einen Joker — sie nutzen ihn nur leise

Wer Schweizer Banken in den letzten zwei Jahren über KI sprechen hörte, bekam meist eine vorsichtige Antwort. Hinter den Kulissen ist die Realität deutlich konkreter — und überraschend pragmatisch.

In den letzten Monaten habe ich mit AI-Verantwortlichen aus drei der grössten Schweizer Banken gesprochen. Was sie schildern, passt nicht zur PR-Erzählung der Branche.

> Wir nutzen kein OpenAI — und das ist eine bewusste Entscheidung, keine Verzögerung.
> — AI-Lead, Schweizer Grossbank

### Drei Use Cases, die bereits live sind

- Onboarding-Dokumentation: 60% Zeitersparnis im Compliance-Check
- KYC-Validierung mit On-Premise-LLM
- Reporting-Drafts für Risk Management

Diese drei Use Cases haben eines gemeinsam: Alle laufen auf gehosteten Modellen mit klar definierten Datenflüssen. Keine SaaS-API. Kein Vendor Lock-In.$body$;

  v_placeholder_body text := $body$## Body-Content folgt

TODO Session F — der echte Inhalt dieses Artikels wird mit der Editorial-Migration übertragen. Dies ist ein Platzhalter, damit Listing-Pages und Detail-Renderer korrekt funktionieren.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.$body$;
begin

-- =========================================================================
-- 6 articles aus mockAuthorApi.ts (mit echtem body)
-- =========================================================================
insert into articles (
  slug, title, subtitle, category_id, subcategory, status, author_id,
  cover_image_url, excerpt, body_md, published_at, is_featured
) values
  (
    'schweizer-kmu-edge-ai',
    $title$Wie Schweizer KMU bei Edge-AI vorne dabei sind$title$,
    null,
    (select id from categories where slug = 'ki-business'),
    'KI im Business',
    'published',
    (select id from authors where slug = 'ali-soy'),
    'https://picsum.photos/seed/article1/1200/700',
    $excerpt$Drei Use Cases aus dem KMU-Sektor zeigen, warum Edge-AI gerade in der Schweiz funktioniert — leiser, aber wirkungsvoller.$excerpt$,
    v_sample_body,
    '2026-04-28T00:00:00Z',
    true
  ),
  (
    'eu-ai-act-schweiz-leitfaden',
    $title$EU AI Act: Was Schweizer Unternehmen jetzt tun müssen$title$,
    null,
    (select id from categories where slug = 'ki-business'),
    'EU AI Act',
    'published',
    (select id from authors where slug = 'andreas-kamm'),
    'https://picsum.photos/seed/article2/1200/700',
    $excerpt$Der EU AI Act betrifft auch Schweizer Firmen mit EU-Kundschaft. Ein Leitfaden für die nächsten 12 Monate.$excerpt$,
    v_sample_body,
    '2026-05-01T00:00:00Z',
    false
  ),
  (
    'swiss-hosted-gpt-realitaet',
    $title$Swiss Hosted GPT — Die Realität hinter dem Versprechen$title$,
    null,
    (select id from categories where slug = 'swiss-ai'),
    'Swiss Hosted GPT',
    'published',
    (select id from authors where slug = 'andreas-kamm'),
    'https://picsum.photos/seed/article3/1200/700',
    $excerpt$Swiss Hosted GPT klingt nach Datensouveränität. Wir haben drei Anbieter unter die Lupe genommen.$excerpt$,
    v_sample_body,
    '2026-04-15T00:00:00Z',
    false
  ),
  (
    'zukunft-arbeit-augmentation',
    $title$Die Zukunft der Arbeit: Augmentation statt Automation$title$,
    null,
    (select id from categories where slug = 'ki-business'),
    'Future of Work',
    'published',
    (select id from authors where slug = 'ali-soy'),
    'https://picsum.photos/seed/article5/1200/700',
    $excerpt$Eine ETH-Studie zeigt: KI ersetzt nicht, sie erweitert. Was Schweizer Firmen daraus mitnehmen können.$excerpt$,
    v_sample_body,
    '2026-04-15T00:00:00Z',
    true
  ),
  (
    'data-driven-banking',
    $title$Data-Driven Banking: Warum KI allein das eigentliche Problem nicht löst$title$,
    null,
    (select id from categories where slug = 'ki-business'),
    'AI in Banking',
    'published',
    (select id from authors where slug = 'andreas-kamm'),
    'https://picsum.photos/seed/bank1/1200/700',
    $excerpt$Banken investieren Milliarden in Künstliche Intelligenz. Doch ohne saubere Daten und klare Prozesse bleibt der erhoffte Durchbruch aus.$excerpt$,
    v_sample_body,
    '2026-04-07T00:00:00Z',
    true
  ),
  (
    'gastbeitrag-edge-ai-mittelstand',
    $title$Edge-AI im Mittelstand: Ein Praxisbericht aus drei Pilotprojekten$title$,
    null,
    (select id from categories where slug = 'ki-business'),
    'KI im Business',
    'published',
    (select id from authors where slug = 'marc-keller'),
    'https://picsum.photos/seed/extguest1/1200/700',
    $excerpt$Drei Mittelstands-Pilotprojekte, ein gemeinsamer Faden: Wer Edge-AI ernst nimmt, gewinnt nicht im Pitch, sondern in der Wartung.$excerpt$,
    v_sample_body,
    '2026-04-02T00:00:00Z',
    true
  ),

-- =========================================================================
-- 8 articles aus /ki-im-business Listing (Placeholder-Body)
-- =========================================================================
  (
    'fuenf-versteckte-risiken-ki',
    $title$Fünf versteckte Risiken bei der Nutzung der falschen KI für Unternehmen$title$,
    null,
    (select id from categories where slug = 'swiss-ai'),
    'Swiss Hosted GPT',
    'published',
    (select id from authors where slug = 'matthias-zwingli'),
    'https://picsum.photos/seed/ki1/800/500',
    null,
    v_placeholder_body,
    '2025-04-16T00:00:00Z',
    false
  ),
  (
    'eu-ai-act-schweizer-unternehmen-wissen',
    $title$EU AI-Act: Was Schweizer Unternehmen unbedingt wissen und tun müssen$title$,
    null,
    (select id from categories where slug = 'ki-business'),
    'EU AI Act',
    'published',
    (select id from authors where slug = 'ali-soy'),
    'https://picsum.photos/seed/ki2/800/500',
    null,
    v_placeholder_body,
    '2025-04-03T00:00:00Z',
    false
  ),
  (
    'why-ai-wont-transform-banking',
    $title$AI in Banking: Why AI won't transform Banking$title$,
    null,
    (select id from categories where slug = 'ki-business'),
    'AI in Banking',
    'published',
    (select id from authors where slug = 'andreas-kamm'),
    'https://picsum.photos/seed/bank2/800/500',
    null,
    v_placeholder_body,
    '2026-04-01T00:00:00Z',
    false
  ),
  (
    'ai-copilots-banking-relationship-manager',
    $title$AI Co-Pilots in Banking: How Relationship Managers Stay in Control$title$,
    null,
    (select id from categories where slug = 'ki-business'),
    'AI in Banking',
    'published',
    (select id from authors where slug = 'andreas-kamm'),
    'https://picsum.photos/seed/bank3/800/500',
    null,
    v_placeholder_body,
    '2026-03-31T00:00:00Z',
    false
  ),
  (
    'warum-80-prozent-ki-projekte-scheitern',
    $title$Warum 80% der KI-Projekte scheitern — und wie Ihr Unternehmen zu den 20% gehört$title$,
    null,
    (select id from categories where slug = 'ki-business'),
    'KI-Strategie',
    'published',
    (select id from authors where slug = 'matthias-zwingli'),
    'https://picsum.photos/seed/strat1/800/500',
    null,
    v_placeholder_body,
    '2026-03-22T00:00:00Z',
    false
  ),
  (
    'make-or-buy-ki-infrastruktur',
    $title$Make or Buy: Wann lohnt sich eine eigene KI-Infrastruktur?$title$,
    null,
    (select id from categories where slug = 'ki-business'),
    'KI-Strategie',
    'published',
    (select id from authors where slug = 'ali-soy'),
    'https://picsum.photos/seed/strat2/800/500',
    null,
    v_placeholder_body,
    '2026-03-15T00:00:00Z',
    false
  ),
  (
    'high-risk-ai-systems-compliance-checkliste',
    $title$High-Risk AI Systems: Checkliste für Compliance in der Schweiz$title$,
    null,
    (select id from categories where slug = 'ki-business'),
    'EU AI Act',
    'published',
    (select id from authors where slug = 'matthias-zwingli'),
    'https://picsum.photos/seed/strat3/800/500',
    null,
    v_placeholder_body,
    '2026-03-08T00:00:00Z',
    false
  ),
  (
    'datenschutz-ki-schweizer-unternehmen',
    $title$Datenschutz und KI: Wie Schweizer Unternehmen beides unter einen Hut bringen$title$,
    null,
    (select id from categories where slug = 'swiss-ai'),
    'Swiss Hosted GPT',
    'published',
    (select id from authors where slug = 'ali-soy'),
    'https://picsum.photos/seed/priv1/800/500',
    null,
    v_placeholder_body,
    '2026-03-01T00:00:00Z',
    false
  ),

-- =========================================================================
-- 9 articles aus /future-tech Listing (Placeholder-Body)
-- =========================================================================
  (
    'iot-geraete-vernetzen-ai-openai',
    $title$IoT-Geräte vernetzen mit AI – aber richtig: Warum OpenAI API nicht die Lösung ist$title$,
    null,
    (select id from categories where slug = 'future-tech'),
    'GenAI',
    'published',
    (select id from authors where slug = 'ali-soy'),
    'https://picsum.photos/seed/iot1/800/500',
    null,
    v_placeholder_body,
    '2025-02-10T00:00:00Z',
    false
  ),
  (
    'interoperabilitaet-iot-ai-sprachbarrieren',
    $title$Interoperabilität für IoT – Wie AI die Sprachbarrieren zwischen Maschinen überwindet$title$,
    null,
    (select id from categories where slug = 'future-tech'),
    'GenAI',
    'published',
    (select id from authors where slug = 'ali-soy'),
    'https://picsum.photos/seed/iot2/800/500',
    null,
    v_placeholder_body,
    '2025-02-07T00:00:00Z',
    false
  ),
  (
    'blockchain-of-things',
    $title$Blockchain of Things – Dezentralisierung trifft auf intelligente Maschinen$title$,
    null,
    (select id from categories where slug = 'future-tech'),
    'Blockchain',
    'published',
    (select id from authors where slug = 'ali-soy'),
    'https://picsum.photos/seed/block1/800/500',
    null,
    v_placeholder_body,
    '2025-01-23T00:00:00Z',
    false
  ),
  (
    'autonome-drohnen-industrie-ai-lagerhaltung',
    $title$Autonome Drohnen in der Industrie: Wie AI Lagerhaltung neu definiert$title$,
    null,
    (select id from categories where slug = 'future-tech'),
    'Robotics',
    'published',
    (select id from authors where slug = 'matthias-zwingli'),
    'https://picsum.photos/seed/drone1/800/500',
    null,
    v_placeholder_body,
    '2026-03-15T00:00:00Z',
    false
  ),
  (
    'multimodale-ki-sehen-hoeren-lesen',
    $title$Multimodale KI: Was passiert, wenn Maschinen sehen, hören und lesen können$title$,
    null,
    (select id from categories where slug = 'future-tech'),
    'GenAI',
    'published',
    (select id from authors where slug = 'andreas-kamm'),
    'https://picsum.photos/seed/mm1/800/500',
    null,
    v_placeholder_body,
    '2026-03-02T00:00:00Z',
    false
  ),
  (
    'quantencomputer-2026-stand-durchbruch',
    $title$Quantencomputer 2026: Wo stehen wir wirklich — und wann kommt der Durchbruch?$title$,
    null,
    (select id from categories where slug = 'future-tech'),
    'Quantencomputing',
    'published',
    (select id from authors where slug = 'ali-soy'),
    'https://picsum.photos/seed/qc1/800/500',
    null,
    v_placeholder_body,
    '2026-02-20T00:00:00Z',
    false
  ),
  (
    'cobots-kmu-kollaborative-robotik',
    $title$Cobots im KMU: Wie kleine Betriebe von kollaborativer Robotik profitieren$title$,
    null,
    (select id from categories where slug = 'future-tech'),
    'Robotics',
    'published',
    (select id from authors where slug = 'matthias-zwingli'),
    'https://picsum.photos/seed/cobot1/800/500',
    null,
    v_placeholder_body,
    '2026-02-10T00:00:00Z',
    false
  ),
  (
    'smart-contracts-lieferkette-schweizer-industrie',
    $title$Smart Contracts in der Lieferkette: Praxisbericht aus der Schweizer Industrie$title$,
    null,
    (select id from categories where slug = 'future-tech'),
    'Blockchain',
    'published',
    (select id from authors where slug = 'ali-soy'),
    'https://picsum.photos/seed/sc1/800/500',
    null,
    v_placeholder_body,
    '2026-02-01T00:00:00Z',
    false
  ),
  (
    'post-quantum-kryptographie-unternehmen-handeln',
    $title$Post-Quantum Kryptographie: Warum Unternehmen jetzt handeln müssen$title$,
    null,
    (select id from categories where slug = 'future-tech'),
    'Quantencomputing',
    'published',
    (select id from authors where slug = 'andreas-kamm'),
    'https://picsum.photos/seed/pqc1/800/500',
    null,
    v_placeholder_body,
    '2026-01-20T00:00:00Z',
    false
  )
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  category_id = excluded.category_id,
  subcategory = excluded.subcategory,
  status = excluded.status,
  author_id = excluded.author_id,
  cover_image_url = excluded.cover_image_url,
  excerpt = excluded.excerpt,
  body_md = excluded.body_md,
  published_at = excluded.published_at,
  is_featured = excluded.is_featured;

end $$;
