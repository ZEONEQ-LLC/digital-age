-- Inhalte aufraeumen und Showcase befuellen (PR 211, Daten, nach dem Merge pushen).
-- Auftrag Ali 15.11.2026: moeglichst viel von seiner Liste selbst erledigen.
--
--   1. Artikeltexte (eine Anweisung, pro Artikel eine Revision):
--      a) 12 Bildbloecke ohne Datei entfernen: 3 mit blob:-Adresse (nie
--         hochgeladen) und 9 mit http://digital-age.ch/wp-content/uploads/…
--         (beim Umzug von WordPress nicht mitgenommen, im Web-Archiv nicht
--         vorhanden). Die Revision behaelt den alten Stand; tauchen die
--         Dateien in einem Backup auf, lassen sich die Bloecke wieder einsetzen.
--      b) Tote Datei-Links: drei Bloecke, die nur aus einem toten Download
--         bestanden (plus die Ueberschrift ueber der Liste), und ein Link
--         mitten im Satz (Text bleibt).
--      c) Sieben rohe Adressen (frueher eingebettete Player von SoundCloud und
--         Vimeo) als Link. Alle sieben Ziele antworten.
--      d) ALT-Texte: 53 Bilder im Text und 30 Titelbilder, nur wo der ALT leer
--         ist. Sprache wie der Artikel.
--      body_md bleibt unveraendert; der Editor erzeugt es beim naechsten
--      Speichern neu.
--   2. Die zwei Kooperationsartikel der Connect AI Group wechseln in den
--      Showcase (Entscheid E10; Ali 15.11.2026: kein Geld geflossen, darum
--      «Unternehmensbeitrag», nicht «Publireportage»). Der Trigger
--      articles_guard_content_type setzt die Kategorie.
--   3. Datenschutzerklaerung: Absatz zur Weiterleitung von Anfragen an
--      Unternehmen im Verzeichnis (Formular «Kontakt aufnehmen», seit PR 194
--      live; das Formular verweist fuer die Einwilligung auf diese Seite).
--
--   4. Hausanzeige «Werben auf digital age» mit Ziel /mediadaten, auf allen
--      sechs Platzierungen, unbefristet.
--
-- Jede Aenderung prueft den heutigen Stand: ALT nur wenn leer, Text nur wenn
-- die alte Stelle noch so dasteht, Umstellung nur bei redaktionellen Artikeln.

-- 1. Artikeltexte
with ops(slug, remove_ids, alts, edits, cover_alt) as (
  values
    ('4-insights-redesign-banking-ai', array['mb1778766904745-29']::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, null::text),
    ('4-ki-gesetzte-die-wir-brauchen', array[]::text[], $j${"mb1778766898458-10": "Illustration: Menschen und Roboter auf einer futuristischen Ebene unter einem grossen Planeten", "mb1778766898458-14": "Illustration: humanoider Roboter in einem Gerichtssaal vor einer Waage und einem Atomsymbol", "mb1778766898458-26": "Illustration: Parlamentssaal mit EU-Flagge, dem Schriftzug «EU AI Act» und einer leuchtenden Figur mit Waage", "mb1778766898458-32": "Illustration: fünf leuchtende humanoide Figuren auf Podesten, verbunden durch Lichtlinien", "mb1778766898458-64": "Illustration: leuchtende Kugel auf einem Sockel inmitten von Schaltkreisen", "mb1778766898458-117": "Illustration: Menschen in einem Büro vor einem grossen leuchtenden Schloss-Symbol"}$j$::jsonb, $j${}$j$::jsonb, 'Illustration: humanoider Roboter hält eine leuchtende Kugel, umgeben von Symbolen für Recht und Sicherheit'),
    ('700-millionen-bilder-und-ki-datenkolonialismus', array[]::text[], $j${"bl-1780579985395-9m": "Foto-Infos auf dem iPhone: Aufnahme vom 11. August 2023 in Kyoto mit Kameradaten und Kartenausschnitt"}$j$::jsonb, $j${}$j$::jsonb, null::text),
    ('agentic-ai', array[]::text[], $j${"mb1778766905977-1": "A network of glowing AI nodes connecting business systems such as Salesforce and data sources"}$j$::jsonb, $j${"mb1778766905977-55": {"find": "https://soundcloud.com/digital-age-switzerland/agentic-ai-advancements-challenges-in-communication-optimizatio?si=96e22a04caa7453a88393b0a3689f44b&utm\\_source=clipboard&utm\\_medium=text&utm\\_campaign=social\\_sharing", "replace": "[Listen to the podcast on SoundCloud](https://soundcloud.com/digital-age-switzerland/agentic-ai-advancements-challenges-in-communication-optimizatio)"}}$j$::jsonb, 'A network of glowing AI nodes connecting business systems such as Salesforce and data sources'),
    ('agentic-ai-in-banking', array[]::text[], $j${}$j$::jsonb, $j${"mb1778766906373-1": {"find": "[Testing 2.0: Transforming Testing with an Agent‑Based System](https://digital-age.ch/wp-content/uploads/2025/06/Testing-2.0.pdf)", "replace": "Testing 2.0: Transforming Testing with an Agent‑Based System"}, "mb1778766906373-39": {"find": "https://soundcloud.com/digital-age-switzerland/podcast-agentic-ai-in-banking-5-proven-compliance-risk-wins", "replace": "[Listen to the podcast on SoundCloud](https://soundcloud.com/digital-age-switzerland/podcast-agentic-ai-in-banking-5-proven-compliance-risk-wins)"}}$j$::jsonb, null::text),
    ('ai-agents-as-bank-customers', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'A person looks at a holographic human figure and account dashboards in front of a city skyline at dusk'),
    ('ai-agents-as-financial-coaches-redefine-banking', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'A man on a sofa uses his phone, surrounded by floating icons for savings, home and a friendly robot assistant'),
    ('ai-as-relationship-manager', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'A translucent AI figure sits next to a man in a suit working on a laptop'),
    ('ai-bildung-in-botswana', array['mb1778766899308-17']::text[], $j${"mb1778766899308-4": "Vier mit KI erzeugte Bilder eines rosa Elefanten an einem Wasserloch", "mb1778766899308-26": "Chatfenster des Assistenten «AI Thuto» mit einer Begrüssung auf Setswana"}$j$::jsonb, $j${}$j$::jsonb, 'Vier mit KI erzeugte Bilder eines rosa Elefanten an einem Wasserloch'),
    ('ai-co-pilots-in-banking', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'A bank advisor with a laptop talks to a couple at a meeting table'),
    ('ai-efficiency-in-banking', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'Split illustration: a calm office labelled "AI Efficiency" next to a chaotic one labelled "System Failure, Manual Override"'),
    ('ai-in-banking', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'A detective with a magnifying glass examines a screen reading "Hidden AI Costs" in a dark study'),
    ('ai-in-banking-compliance', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'Executives around a conference table with holographic dashboards, Zurich''s old town visible through the windows'),
    ('ai-in-banking-the-real-transformation-driver', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'A woman at a kitchen table looks at a laptop showing a spreadsheet and a flight booking page'),
    ('ai-in-the-loop', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'Unendlichkeitsschleife mit einem menschlichen und einem künstlichen Gehirn in den beiden Schlaufen'),
    ('ai-mindset', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'Silhouette of a man facing a glowing face made of data points in front of a city skyline'),
    ('ai-powered-compliance', array[]::text[], $j${}$j$::jsonb, $j${"mb1778766908511-45": {"find": "https://soundcloud.com/digital-age-switzerland/podcast-ai-powered-compliance?si=91d28c17c3ba4274ad358cc3ddbbb620&utm\\_source=clipboard&utm\\_medium=text&utm\\_campaign=social\\_sharing", "replace": "[Listen to the podcast on SoundCloud](https://soundcloud.com/digital-age-switzerland/podcast-ai-powered-compliance)"}}$j$::jsonb, 'A man in a suit looks at a transparent compliance dashboard showing a virtual assistant'),
    ('ai-risk-for-banks', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'A man in a suit holds an open folder in a bank lobby while digital displays behind him dissolve'),
    ('apples-ki-offensive', array[]::text[], $j${}$j$::jsonb, $j${"mb1778766906777-43": {"find": "https://soundcloud.com/digital-age-switzerland/podcast-apples-neue-ki-offensive-chancen-herausforderungen-fur-schweizer-unternehmen?si=31a59a819ab7490a836d6cdc59cb108a&utm\\_source=clipboard&utm\\_medium=text&utm\\_campaign=social\\_sharing", "replace": "[Podcast auf SoundCloud anhören](https://soundcloud.com/digital-age-switzerland/podcast-apples-neue-ki-offensive-chancen-herausforderungen-fur-schweizer-unternehmen)"}}$j$::jsonb, 'Apple-Logo aus Punkten neben dem Schriftzug «Apple und die neuen Foundation Models»'),
    ('blockchain-of-things', array['bl-1780432490131-32']::text[], $j${"bl-1780432490131-34": "Entwicklung der IoT-Netzwerke: vor 2005 geschlossen und zentral, heute offen mit zentraler Cloud, ab 2025 offen mit verteilter Cloud", "bl-1780432490131-39": "Vier Kriterien für die Blockchain-Architektur: Netzteilnehmer, Performance, Komplexität der Business-Logik und Konsens-Mechanismus"}$j$::jsonb, $j${}$j$::jsonb, 'Drei Phasen der IoT-Netzwerke: geschlossen und zentral, offen mit zentraler Cloud, offen mit verteilter Cloud'),
    ('ceo-vs-mascot', array[]::text[], $j${"mb1778766898001-15": "Schriftzug «Wissen vs. Kompetenz»", "mb1778766898001-25": "Schriftzug «Now Streaming: Netflixication»"}$j$::jsonb, $j${}$j$::jsonb, null::text),
    ('data-driven-banking', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'Streams of light converge on a row of monitors in a dark open-plan office at night'),
    ('die-digitale-interaktion-von-unternehmen-teil-i', array[]::text[], $j${"mb1778766895467-5": "Diagramm der digitalen Interaktionen eines Unternehmens mit Kundschaft, Mitarbeitenden, Partnern, Staat und Mitbewerbern"}$j$::jsonb, $j${}$j$::jsonb, null::text),
    ('die-digitale-interaktion-von-unternehmen-teil-ii', array[]::text[], $j${"bl-1780345547394-30": "Diagramm: Unternehmen im Zentrum, verbunden mit Kundschaft, Mitarbeitenden, Partnern, Kapitalgebern, Staat und Öffentlichkeit"}$j$::jsonb, $j${}$j$::jsonb, null::text),
    ('die-smarten-produkte-und-deren-wichtigsten-eigenschaften', array[]::text[], $j${"mb1778766893918-0": "Illustration: Weltkugel, umgeben von vernetzten Alltagsgegenständen wie Haus, Auto, Lampe, Flugzeug und Schlüssel", "mb1778766893918-3": "Sensor mit den Komponenten Konnektivität, Identifikation, Energieversorgung, Sensor/Aktuator, Kontroller/Elektronik und Steuerungs-Software", "mb1778766893918-14": "Grafik: Die Kosten für Sensoren sind in den letzten 10 Jahren um 60 Prozent gesunken", "mb1778766893918-24": "Grafik: Die Kosten für Prozessoren sind in den letzten 10 Jahren um den Faktor 60 gesunken", "mb1778766893918-27": "Blasendiagramm mit steigender Kurve zu Big Data Analytics", "mb1778766893918-34": "Grafik: Die Kosten für Bandbreite sind in den letzten 10 Jahren um den Faktor 40 gesunken", "mb1778766893918-37": "Smartphone mit Symbolen für Lampe, Elektroauto, Steckdose und Fernseher", "mb1778766893918-40": "IPv6 ermöglicht 340 Sextillionen IP-Adressen, als Zahl mit 36 Nullen ausgeschrieben"}$j$::jsonb, $j${}$j$::jsonb, null::text),
    ('disruption-durch-mobile-internet', array[]::text[], $j${"mb1778766894726-0": "Diskette, CD, USB-Stick und ein Tablet mit Cloud-Symbol nebeneinander"}$j$::jsonb, $j${}$j$::jsonb, null::text),
    ('einfuehrung-in-iot', array[]::text[], $j${"bl-1793647174546-j": "Grafik: Internetnutzer und vernetzte Geräte 2013, 2018 und 2020, von 20 auf 50 Milliarden vernetzte Einheiten"}$j$::jsonb, $j${}$j$::jsonb, null::text),
    ('embracing-ai-and-automation', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'A humanoid robot and a man in a suit talking in a modern office'),
    ('enterprise-gpt', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'Schriftzug «Enterprise GPT» in bunten Buchstaben auf schwarzem Grund'),
    ('enterprise-knowledge-graphs', array[]::text[], $j${"bl-1788466594291-80": "Knowledge graph example: a customer in Zurich linked to transactions, regulations and source databases", "bl-1788466594291-89": "Graph: a risk category with low, medium and high risk; high risk is inferred for customerX", "bl-1788466594291-8p": "Gartner chart section \"Critical Enablers\" listing knowledge graphs next to AI chips, blockchain and quantum processors", "bl-1788466594291-8v": "Book cover: \"Künstliche Intelligenz (KI): Strategiemethodik, Konzepte und Fallstudien\", FHNW"}$j$::jsonb, $j${}$j$::jsonb, null::text),
    ('european-ai-act-unternehmen', array['bl-1784055733142-96']::text[], $j${}$j$::jsonb, $j${"bl-1784055733142-9a": {"find": "https://vimeo.com/1059785212?share=copy", "replace": "[Video: Was bedeutet der European AI Act für dein Unternehmen? (Vimeo)](https://vimeo.com/1059785212)"}}$j$::jsonb, 'Gezeichnete Europaflagge mit zwölf gelben Sternen auf blauem Grund'),
    ('interoperabilitaet-fuer-iot-wie-ai-die-sprachbarrieren-zwischen-maschinen-ueberwindet', array[]::text[], $j${"bl-1780306597414-9h": "Schema: GenAI als Protokoll-Übersetzer zwischen drei IoT-Geräten mit den Protokollen MQTT, CoAP und OPC-UA"}$j$::jsonb, $j${}$j$::jsonb, 'Schriftzug «AI + IoT = it will matter»'),
    ('iot-der-schluessel-zur-kommerzialisierung-liegt-im-ecosystem', array['bl-1780428805912-6e', 'bl-1780428805913-6h', 'bl-1780428805913-6p']::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, null::text),
    ('iot-ecosystem', array['bl-1783452379826-7u', 'bl-1783452379826-88', 'bl-1783452379826-8d']::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, null::text),
    ('iot-geraete-vernetzen-mit-ai-aber-richtig-warum-openai-api-nicht-die-loesung-ist', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'Illustration: Turm aus vernetzten Geräten mit einer Figur an der Spitze, umgeben von Protokollnamen wie MQTT, Zigbee und REST API'),
    ('ki-benchmark', array['bl-1783429147716-bh', 'bl-1783429147716-bi']::text[], $j${}$j$::jsonb, $j${"bl-1783429147716-bk": {"find": "https://soundcloud.com/digital-age-switzerland/der-ki-pizza-benchmark-wer-backt-am-besten-fur-503?si=56ec3577ca4f4e3784251f3273b795a5&utm\\_source=clipboard&utm\\_medium=text&utm\\_campaign=social\\_sharing", "replace": "[Podcast auf SoundCloud anhören](https://soundcloud.com/digital-age-switzerland/der-ki-pizza-benchmark-wer-backt-am-besten-fur-503)"}}$j$::jsonb, null::text),
    ('ki-fuer-senioren', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'Älterer Mann im Sessel spricht mit einer leuchtenden, holografischen Assistentin'),
    ('ki-im-kundendienst', array[]::text[], $j${}$j$::jsonb, $j${"mb1778766908915-55": {"find": "https://soundcloud.com/digital-age-switzerland/ki\\_im\\_telco-kundendienst?si=aff5486caa3245e1a422607e76732d1a&utm\\_source=clipboard&utm\\_medium=text&utm\\_campaign=social\\_sharing", "replace": "[Podcast auf SoundCloud anhören](https://soundcloud.com/digital-age-switzerland/ki_im_telco-kundendienst)"}}$j$::jsonb, 'Schriftzug «dein Bot nervt total!» auf grünem Grund'),
    ('ki-kompetenz-fuer-unternehmen', array['mb1778766899723-1', 'mb1778766899723-9', 'mb1778766899723-31']::text[], $j${"mb1778766899723-27": "Lächelnder Mann mit Brille und Sakko an einem Schreibtisch in einem hellen Büro"}$j$::jsonb, $j${}$j$::jsonb, null::text),
    ('konvergenz-in-mobile-business', array[]::text[], $j${"mb1778766895082-0": "Vier farbige Pfeile zeigen auf die Mitte mit dem Schriftzug «Konvergenz»", "mb1778766895082-2": "Stufenmodell der Konvergenz: Produkt-, Geschäftsfeld-, Anbieter- und Branchenkonvergenz mit steigendem Aggregationslevel"}$j$::jsonb, $j${}$j$::jsonb, null::text),
    ('projektbericht-cham-ai-ch-eine-smarte-alternative-zur-offiziellen-gemeinde-website', array[]::text[], $j${"mb1778766898903-19": "Chatfenster des Cham Assistenten: Frage und Antwort auf Spanisch zur Freizeitgestaltung in Cham", "mb1778766898903-23": "Chatbot der Gemeinde Urdorf: Auf eine spanische Frage folgt eine Auswahl von vier Resultaten"}$j$::jsonb, $j${}$j$::jsonb, 'Website cham-ai.ch mit dem Slogan «Intelligente Antworten auf Knopfdruck» und geöffnetem Chatfenster des Cham Assistenten'),
    ('schweizer-ki-souveraenitaet', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'Titelbild «Schweizer KI Souveränität»: Berg mit Schweizer Fahne, daneben ein Drache und ein Adler'),
    ('starte-2025-mit-ki-chatbots-und-genai', array['mb1778766900133-20']::text[], $j${"mb1778766900133-27": "Matrix «Aufgaben und KI-Potential»: hoch bei Chat-Anfragen und Kunden-Tickets, tief bei telefonischen und persönlichen Kundengesprächen"}$j$::jsonb, $j${}$j$::jsonb, 'Titelbild «How to get started with AI without feeling overwhelmed»: Person mit Haftnotizen im Gesicht'),
    ('texterkennung-mit-kunstlicher-intelligenz', array[]::text[], $j${"mb1778766901727-5": "Gescannte, schief liegende Seiten eines Lehrplans mit Tabellen", "mb1778766901727-11": "Chatverlauf mit ChatGPT 4.5: mehrere abgebrochene Versuche, den Text aus dem gescannten PDF zu lesen", "mb1778766901727-15": "DeepSeek antwortet, dass es gescannte PDFs nicht direkt lesen kann", "mb1778766901727-19": "Claude schlägt vor, den Text abzutippen oder einen OCR-Dienst zu nutzen", "mb1778766901727-23": "Adobe Acrobat markiert den erkannten Text auf der gescannten Seite, daneben der AI Assistant", "mb1778766901727-25": "Excel-Tabelle mit fehlerhaft erkanntem, durcheinander geratenem Text", "mb1778766901727-30": "Grok bestätigt, dass es Text aus dem gescannten PDF extrahieren kann, und zeigt den Anfang", "mb1778766901727-32": "Grok gibt den Lehrplan als Tabelle mit den Spalten Modul, Thema, allgemeine und spezifische Ziele aus", "mb1778766901727-34": "Grok listet die tatsächliche Reihenfolge der gescannten Seiten auf", "mb1778766901727-36": "Grok erklärt die CSV-Struktur und gibt den Inhalt als CSV aus", "mb1778766901727-38": "Grok bestätigt die Anpassung, jedes Teilziel in eine eigene Zeile zu schreiben", "mb1778766901727-40": "Grok zeigt die überarbeitete CSV-Struktur und den Inhalt mit einer Zeile pro Teilziel", "mb1778766901727-42": "Fertige Tabelle des Lehrplans mit den Spalten Level, Modul, Thema, allgemeine und spezifische Ziele"}$j$::jsonb, $j${}$j$::jsonb, null::text),
    ('understanding-agents-and-agentic-systems', array[]::text[], $j${}$j$::jsonb, $j${}$j$::jsonb, 'Lettering "Agents vs. Agentic Systems" on a green background'),
    ('was-iot-bedeutet', array[]::text[], $j${"mb1778766893447-9": "Schema: Ein Aufzug meldet Daten in die Cloud, von dort gehen sie an Kundendienst und Servicetechniker", "mb1778766893447-12": "Schema: Aufzug, Smartphone, Uhr, Lautsprecher, Server und Servicefahrzeug sind über eine Cloud mit Datenbanken verbunden", "mb1778766893447-19": "Neun Anwendungsbereiche von IoT, darunter Gebäude, Energie, Gesundheit, Industrie, Transport und Handel"}$j$::jsonb, $j${}$j$::jsonb, 'Symbole vernetzter Geräte rund um den Schriftzug «Internet der Dinge»')
)
update public.articles a
   set body_blocks = jsonb_set(
         a.body_blocks, '{blocks}',
         coalesce((
           select jsonb_agg(
                    case
                      when b->>'type' = 'image' and btrim(coalesce(b->>'alt', '')) = '' and o.alts ? (b->>'id')
                        then jsonb_set(b, '{alt}', o.alts -> (b->>'id'))
                      when o.edits ? (b->>'id') and b ? 'content'
                        then jsonb_set(b, '{content}', to_jsonb(replace(
                               b->>'content',
                               o.edits -> (b->>'id') ->> 'find',
                               o.edits -> (b->>'id') ->> 'replace')))
                      else b
                    end
                    order by t.ord)
             from jsonb_array_elements(a.body_blocks -> 'blocks') with ordinality as t(b, ord)
            where not (b->>'id' = any (o.remove_ids))
         ), '[]'::jsonb)),
       cover_image_alt = case
         when o.cover_alt is not null and btrim(coalesce(a.cover_image_alt, '')) = '' then o.cover_alt
         else a.cover_image_alt
       end
  from ops o
 where a.slug = o.slug
   and a.body_blocks is not null;

-- 2. Kooperationsartikel in den Showcase
update public.articles a
   set content_type = 'company',
       startup_id = s.id,
       is_paid = false
  from public.ai_startups s
 where s.slug = 'connect-ai-group-gmbh'
   and s.status in ('published', 'featured')
   and a.slug in ('european-ai-act-unternehmen', 'ki-fuer-unternehmen-risiken')
   and a.status = 'published'
   and a.content_type = 'editorial'
   and a.is_featured = false
   and a.is_hero = false;

-- 3. Datenschutzerklaerung: neuer Absatz nach der Liste in Ziffer 7
update public.pages p
   set body_blocks = jsonb_set(p.body_blocks, '{blocks}', (
         select jsonb_agg(x.b order by x.ord, x.sub)
           from (
             select t.b, t.ord, 0 as sub
               from jsonb_array_elements(p.body_blocks -> 'blocks') with ordinality as t(b, ord)
             union all
             select $j${"id": "bl-pr211-startup-kontakt", "type": "paragraph", "content": "**Kontaktaufnahme mit Unternehmen im Swiss-AI-Verzeichnis:** Unternehmen im Verzeichnis können zustimmen, dass wir Anfragen an sie weiterleiten. Nutzen Sie auf einem Profil das Formular «Kontakt aufnehmen», leiten wir Ihren Namen, Ihre E-Mail-Adresse, Ihre Organisation (falls angegeben), Ihr Anliegen und Ihre Nachricht per E-Mail an das jeweilige Unternehmen weiter. Das Unternehmen antwortet Ihnen direkt und ist für die weitere Bearbeitung selbst verantwortlich. Den Inhalt Ihrer Anfrage speichern wir nicht. Wir speichern nur Zeitpunkt, Unternehmen, Art des Anliegens und ob die Zustellung geklappt hat. Zum Schutz vor Missbrauch verarbeiten wir zudem einen nicht umkehrbaren Prüfwert (Hash) Ihrer IP-Adresse, der in der Regel nach 24 Stunden gelöscht wird. Grundlage ist Ihre Einwilligung im Formular."}$j$::jsonb, t.ord, 1
               from jsonb_array_elements(p.body_blocks -> 'blocks') with ordinality as t(b, ord)
              where t.b->>'id' = 'bl-1780342725963-3q'
           ) x))
 where p.slug = 'datenschutzerklaerung'
   and p.body_blocks::text not like '%bl-pr211-startup-kontakt%'
   and p.body_blocks::text like '%bl-1780342725963-3q%';

-- 4. Hausanzeige «Werben auf digital age» (Notion-Karte, Angaben von dort):
-- gleiche Form wie die zwei bestehenden Hausanzeigen. Erscheint nur, wo keine
-- Kundenkampagne laeuft (Nicht-House schlaegt House).
do $house$
declare
  v_id uuid;
begin
  if exists (select 1 from public.ad_campaigns where name = 'House: Werben auf digital age') then
    return;
  end if;
  insert into public.ad_campaigns (name, is_house, status, weight, utm_enabled, utm_campaign, notes)
  values ('House: Werben auf digital age', true, 'draft', 1, false, null, 'Angelegt per Migration 20261115120000 (PR 211).')
  returning id into v_id;
  insert into public.ad_creatives (campaign_id, kind, variant, headline, body, cta_label, target_url, theme)
  select v_id, 'internal', v.variant, 'Werben auf digital age', 'Erreichen Sie Entscheider im Schweizer KI-Markt.', 'Mediadaten ansehen', '/mediadaten', 'card'
    from (values ('desktop'), ('mobile')) as v(variant);
  insert into public.ad_bookings (campaign_id, placement_id, scope, scope_ref, period)
  select v_id, p.id, 'global', null, tstzrange(now(), null, '[)')
    from public.ad_placements p;
  update public.ad_campaigns set status = 'live' where id = v_id;
end
$house$;

-- Rueckbau: Die Revisionen der betroffenen Artikel enthalten den Stand davor
-- (Editor → Versionen). Umstellung zuruecknehmen:
-- update public.articles set content_type = 'editorial', startup_id = null, is_paid = false,
--        category_id = (select id from public.categories where slug = 'ki-business')
--  where slug in ('european-ai-act-unternehmen', 'ki-fuer-unternehmen-risiken');
-- Datenschutz: den Block bl-pr211-startup-kontakt im Seiten-Editor loeschen.
-- Hausanzeige: im Werbe-Admin pausieren oder beenden.
