-- Bilder und Downloads aus dem alten WordPress zurueck in die Artikel.
--
-- PR 211 hatte Bild- und Download-Bloecke entfernt, deren Dateien auf dem
-- alten Server fehlten. Die Dateien liegen jetzt aus dem Backup unter
-- public/images/archiv/ und public/downloads/archiv/. Jeder Block kommt mit
-- seiner alten ID an seine alte Stelle zurueck (Position 1-basiert, wie sie
-- vor dem Entfernen war, aufsteigend je Artikel eingefuegt).
--
-- Ein UPDATE pro Artikel, damit der Revisions-Trigger genau eine Revision
-- mit dem Stand davor anlegt.
--
-- Wiederholbar: ein Block, dessen ID im Artikel schon steht, wird uebersprungen.

create temporary table wp_archiv_bloecke (slug text, pos int, block jsonb);
insert into wp_archiv_bloecke (slug, pos, block) values
      ('ai-bildung-in-botswana', 18,
       $j${"id": "mb1778766899308-17", "type": "image", "url": "/images/archiv/botswana-unterricht.webp", "filename": "botswana-unterricht.webp", "alt": "Videocall mit Kindern in einem Klassenzimmer in Botswana, daneben ein Smartphone mit dem KI-Assistenten", "caption": "Unterricht in Botswana", "size": "full", "alignment": "center"}$j$::jsonb),
      ('blockchain-of-things', 2,
       $j${"id": "bl-1780432490131-32", "type": "image", "url": "/images/archiv/cloud-und-smarte-produkte.webp", "filename": "cloud-und-smarte-produkte.webp", "alt": "Grafik: smarte, vernetzte Produkte von vier Herstellern, jeder mit seiner eigenen Cloud", "size": "full", "alignment": "center"}$j$::jsonb),
      ('starte-2025-mit-ki-chatbots-und-genai', 21,
       $j${"id": "mb1778766900133-20", "type": "image", "url": "/images/archiv/3-schritte-ki.webp", "filename": "3-schritte-ki.webp", "alt": "Drei Schritte zum KI-Einsatz: einfach starten, auf nicht-sensitive Daten fokussieren, testen, lernen und optimieren", "size": "full", "alignment": "center"}$j$::jsonb),
      ('iot-ecosystem', 3,
       $j${"id": "bl-1783452379826-7u", "type": "image", "url": "/images/archiv/iot-ecosystem.webp", "filename": "iot-ecosystem.webp", "alt": "Mindmap des IoT Ecosystems mit Players, Anwendungen, Dienstleistungen und Bausteinen", "size": "full", "alignment": "center"}$j$::jsonb),
      ('iot-ecosystem', 17,
       $j${"id": "bl-1783452379826-88", "type": "image", "url": "/images/archiv/iot-landscape-2014.webp", "filename": "iot-landscape-2014.webp", "alt": "IoT-Landschaft 2014 mit Firmenlogos, gegliedert nach Anwendungen, Plattformen und Bausteinen", "source": "Grafik: Matt Turck, David Rogg und FirstMark Capital, 2014", "size": "full", "alignment": "center"}$j$::jsonb),
      ('iot-ecosystem', 22,
       $j${"id": "bl-1783452379826-8d", "type": "image", "url": "/images/archiv/iot-wertschoepfungskette.webp", "filename": "iot-wertschoepfungskette.webp", "alt": "IoT-Wertschöpfungskette in acht Stufen, von den Modulen bis zum Kunden", "size": "full", "alignment": "center"}$j$::jsonb),
      ('ki-kompetenz-fuer-unternehmen', 2,
       $j${"id": "mb1778766899723-1", "type": "image", "url": "/images/archiv/frustration.webp", "filename": "frustration.webp", "alt": "Junger Mann vor dem Bildschirm greift sich erschrocken an den Kopf", "size": "full", "alignment": "center"}$j$::jsonb),
      ('ki-kompetenz-fuer-unternehmen', 10,
       $j${"id": "mb1778766899723-9", "type": "image", "url": "/images/archiv/genai-plattformen-logos.webp", "filename": "genai-plattformen-logos.webp", "alt": "Logos von GenAI-Plattformen: DeepSeek, Gemini, ChatGPT, LLaMA, Perplexity, Claude, DALL-E und Copilot", "size": "full", "alignment": "center"}$j$::jsonb),
      ('ki-kompetenz-fuer-unternehmen', 32,
       $j${"id": "mb1778766899723-31", "type": "image", "url": "/images/archiv/genai-plattformen-revdsg.webp", "filename": "genai-plattformen-revdsg.webp", "alt": "Überblick: Anforderungen an GenAI-Plattformen unter revDSG", "size": "full", "alignment": "center"}$j$::jsonb),
      ('european-ai-act-unternehmen', 3,
       $j${"id": "bl-1784055733142-96", "type": "paragraph", "content": "PDF herunterladen: [What does the European AI Act mean for your business?](/downloads/archiv/What-does-the-European-AI-Act-mean-for-your-business.pdf)"}$j$::jsonb),
      ('4-insights-redesign-banking-ai', 30,
       $j${"id": "mb1778766904745-29", "type": "paragraph", "content": "Could be also interesting: [[embracing-ai-and-automation]](Unlocking the Future: Ways AI and Automation Solve Workforce Demographic Challenges)"}$j$::jsonb),
      ('ki-benchmark', 135,
       $j${"id": "bl-1783429147716-bh", "type": "heading", "level": 2, "content": "Detaillierte Auswertungen und Grundlagen"}$j$::jsonb),
      ('ki-benchmark', 136,
       $j${"id": "bl-1783429147716-bi", "type": "list", "ordered": false, "items": ["[Perplexity Report](/downloads/archiv/Perplexity-KI-Pizza-Benchmark-Report.pdf)", "[ChatGPT Report](/downloads/archiv/ChatGPT-o3-KI-Pizza-Benchmark-Report.pdf)", "[Mengenangaben von allen KI Plattformen](/downloads/archiv/Pizza-Rezept-Konsolidiert.xlsx)"]}$j$::jsonb);

do $$
declare
  a record;
  r record;
  blocks jsonb;
  n int;
  changed boolean;
begin
  for a in select distinct slug from wp_archiv_bloecke order by slug loop
    select x.body_blocks -> 'blocks' into blocks
      from public.articles x
     where x.slug = a.slug and x.body_blocks is not null;
    if blocks is null then
      continue;
    end if;
    changed := false;
    for r in select * from wp_archiv_bloecke where slug = a.slug order by pos loop
      if exists (select 1 from jsonb_array_elements(blocks) b where b->>'id' = r.block->>'id') then
        continue;
      end if;
      n := jsonb_array_length(blocks);
      -- Position p heisst: der Block steht danach an Stelle p (1-basiert).
      select coalesce(jsonb_agg(x.b order by x.k), '[]'::jsonb) into blocks
        from (
          select t.b, case when t.ord < r.pos then t.ord * 2 else t.ord * 2 + 1 end as k
            from jsonb_array_elements(blocks) with ordinality t(b, ord)
          union all
          select r.block, least(r.pos, n + 1) * 2
        ) x;
      changed := true;
    end loop;
    if changed then
      update public.articles x
         set body_blocks = jsonb_set(x.body_blocks, '{blocks}', blocks)
       where x.slug = a.slug;
    end if;
  end loop;
end
$$;

drop table wp_archiv_bloecke;
