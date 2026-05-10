-- Phase 7 Session C — Seed existing authors from mockAuthorApi.ts
--
-- Strategy:
--   - Ali Soy: Email 'ali@zeoneq.com' (echter Login aus Session B). Update auf
--     editor-role + Profile-Felder. on conflict (email) macht das idempotent.
--   - Andreas, Matthias, Marc: Insert mit Placeholder-Emails. user_id bleibt
--     null bis sie sich erstmals einloggen. TODO Session D/E: merge-on-first-login
--     Logic im Auth-Trigger ergänzen, damit beim ersten Login mit einer
--     Placeholder-Email der existierende Row geclaimt wird statt zu kollidieren.

insert into authors (
  slug, display_name, email, role, handle, job_title, location, bio, avatar_url, joined_at, social_links
) values
  (
    'ali-soy',
    'Ali Soy',
    'ali@zeoneq.com',
    'editor',
    'ali-soy',
    'Founder & Editor in Chief',
    'Zürich',
    'Heute haben wir die technischen Werkzeuge und das Wissen (nun ja, gilt nicht für alle), um die Produktivität zu steigern, mehr Transparenz zu schaffen und die Dinge einfacher zu gestalten. Es ist an der Zeit für grosse Veränderungen. Digital aus Überzeugung. Co-Founder & Managing Director von Digital Republic und Dozent an der Hochschule für Wirtschaft Zürich (HWZ).',
    'https://i.pravatar.cc/200?img=68',
    '2024-01-15T00:00:00Z',
    jsonb_build_object('linkedin', 'linkedin.com/in/ali-soy')
  ),
  (
    'andreas-kamm',
    'Andreas Kamm',
    'andreas.kamm@digital-age.ch',
    'author',
    'andreas-kamm',
    'Senior Banking Reporter',
    'Zürich',
    'As a Journey Strategist and Business Innovation Lead at a leading Swiss bank, I draw on nearly four decades of banking experience and advanced expertise in artificial intelligence. With a postgraduate degree in AI in Finance from HWZ Zurich, I specialize in driving AI-powered transformation and digital innovation in the financial sector. My advisory work centers on designing AI-driven business models and forward-looking digitalization strategies that seamlessly integrate traditional banking with disruptive technologies.',
    'https://i.pravatar.cc/200?img=12',
    '2024-06-01T00:00:00Z',
    null
  ),
  (
    'matthias-zwingli',
    'Matthias Zwingli',
    'matthias.zwingli@digital-age.ch',
    'author',
    'matthias-zwingli',
    'Founder & CEO, Connect AI',
    'Zürich',
    'Matthias Zwingli ist CEO und Gründer von Connect AI, einem Unternehmen mit Sitz in Zürich, das sich auf hochwertige, massgeschneiderte KI-Assistenten für Unternehmen spezialisiert hat. Mit einem Hintergrund in Betriebswirtschaft von der Universität St. Gallen bringt er fundiertes Wissen in Unternehmensführung und Technologie mit. Matthias ist ein leidenschaftlicher Kitesurfer und engagierter Business Angel, der sich für die Förderung von Start-ups einsetzt.',
    'https://i.pravatar.cc/200?img=33',
    '2025-03-01T00:00:00Z',
    null
  ),
  (
    'marc-keller',
    'Marc Keller',
    'marc.keller@helvetia-ai.ch',
    'external',
    'marc-keller',
    'Founder, Helvetia AI',
    'Bern, CH',
    'Gründer von Helvetia AI. Beschäftigt sich mit Edge-AI-Anwendungen im Schweizer Mittelstand.',
    'https://i.pravatar.cc/200?img=14',
    '2026-03-12T00:00:00Z',
    jsonb_build_object('website', 'https://helvetia-ai.ch')
  )
on conflict (email) do update set
  slug = excluded.slug,
  display_name = excluded.display_name,
  role = excluded.role,
  handle = excluded.handle,
  job_title = excluded.job_title,
  location = excluded.location,
  bio = excluded.bio,
  avatar_url = excluded.avatar_url,
  joined_at = excluded.joined_at,
  social_links = excluded.social_links;
