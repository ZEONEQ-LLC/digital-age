-- Inhaltskorrekturen auf Wunsch von Ali (13.11.2026). Nur Daten, keine
-- Schemaaenderung; nach dem Merge pushen (die Weiterleitung fuer den neuen
-- Slug kommt mit dem Deploy, migration/redirect-map.json).
--
-- 1. Titel-Tippfehler «lockchain of Things» → «Blockchain of Things».
-- 2. Platzhalter-Slug draft-1783429699290-rukrng → sprechende Adresse
--    (slugFromTitle des Titels), 301 von der alten Adresse.
-- 3. Über uns, Redaktion und KI-Transparenz indexierbar (noindex aus).
-- 4. KI-Transparenz an die Praxis seit PR 191–206 angepasst (Textvorschlag
--    vom 13.11.2026, von Ali bestätigt): News, Prompts der KI-Redaktion,
--    Plattform-Verzeichnis, Newsletter-Entwurf; Kontakt-Link relativ statt
--    alter Vercel-Adresse; «GPT-4» → «ChatGPT».
-- Jede Aenderung greift nur, wenn der Datensatz noch so aussieht wie am
-- 13.11.2026 (sonst bleibt er unveraendert).

update public.articles
   set title = 'Blockchain of Things: Architektur für dezentrale IoT-Ökosysteme'
 where id = '125b51b6-1d1d-4408-b423-7bacf75c34de'
   and title = 'lockchain of Things: Architektur für dezentrale IoT-Ökosysteme';

update public.articles
   set slug = 'ki-statt-menschenkenntnis-warum-viele-fuehrungskraefte'
 where id = '636bd761-18d2-4c27-b29e-4014d35d607b'
   and slug = 'draft-1783429699290-rukrng';

update public.pages
   set body_blocks = $ki${"blocks": [{"id": "bl-1780342784105-5k", "type": "heading", "level": 2, "content": "Unsere Haltung"}, {"id": "bl-1780342784105-5l", "type": "paragraph", "content": "KI ist für uns ein Werkzeug und kein Ersatz für kritisches Denken oder fundierte Analyse. Wir setzen die KI dann ein, um Zeit zu sparen, Inspiration zu finden und unsere Inhalte noch nützlicher zu machen. Wir nutzen KI nie, um Verantwortung abzugeben. Jeder Beitrag wird redaktionell geprüft, überarbeitet und mit menschlichem Gespür ergänzt (Human-in-the-Loop)."}, {"id": "bl-1780342784105-5m", "type": "heading", "level": 2, "content": "KI-Transparenz: Wo wir künstliche Intelligenz einsetzen"}, {"id": "bl-1780342784105-5n", "type": "paragraph", "content": "Wir nutzen verschiedene KI-Tools unterstützend in folgenden Bereichen:"}, {"id": "bl-1780342784105-5o", "type": "list", "ordered": false, "items": ["**{{g}}Texterstellung:{{/g}}** Struktur, Gliederung, Ideenfindung, erste Rohfassung – z. B. mit ChatGPT, Perplexity, Grok, Claude oder mit DeepSeek", "**{{g}}Bildgenerierung:{{/g}}** Artikelbilder entstehen teilweise mit DALL·E, Midjourney, Sora und Adobe AI Creative Cloud Tools", "**{{g}}Übersetzungen:{{/g}}** Für erste Versionen verwenden wir DeepL oder andere aktuelle bzw. gängige KI Tools gefolgt von manueller Überarbeitung.", "**{{g}}SEO und Metadaten:{{/g}}** Unterstützung bei der Keyword-Analyse, Meta-Beschreibungen, Snippets und SEO-Optimierung des Textes inkl. Titel.", "**{{g}}Recherche und Ideensuche:{{/g}}** Einsatz von verschiedenen gängigen KI-Tools, insbesondere bei Trendanalysen oder zur Themenfindung.", "**{{g}}Audio oder Podcasts:{{/g}}** Für die Generierung von Podcasts oder Audofiles nutzen wir NotebookLM von Google.", "**{{g}}Editorielle KI-Unterstützung:{{/g}}** Für SEO-Vorschläge, Zusammenfassungen und Bildbeschreibungen zu unseren Artikeln sowie für den Entwurf des Newsletters nutzen wir Anthropic Claude über die API. Was davon übernommen wird, entscheidet die Autorin oder der Autor bzw. die Redaktion; jeder Newsletter wird vor dem Versand freigegeben.", "**{{g}}News:{{/g}}** Die Meldungen im Ticker und unter /news fasst Claude aus den verlinkten Quellen zusammen und ordnet sie ein (Wirtschaft, Gesellschaft, Umwelt, Dringlichkeit). Sie erscheinen automatisch; die Redaktion prüft sie danach und korrigiert oder entfernt sie bei Bedarf. Die Quelle ist immer verlinkt.", "**{{g}}Prompts der KI-Redaktion:{{/g}}** Jede Woche schreibt Claude drei neue Prompts für unsere Sammlung und testet sie an einem Beispiel. Sie sind als «KI-Redaktion» gekennzeichnet.", "**{{g}}Verzeichnis der KI-Plattformen:{{/g}}** Einmal pro Woche liest unser System die offiziellen Preisseiten der Anbieter und sucht neue Plattformen in den App-Store-Charts der Schweiz, Deutschlands und Österreichs sowie in öffentlichen Ranglisten. Claude wertet nur die Änderungen aus und aktualisiert das Verzeichnis. Jede Änderung ist mit einer Quelle belegt und geht an die Redaktion, die sie zurücknehmen kann."]}, {"id": "bl-1780342784105-5p", "type": "heading", "level": 2, "content": "Was die KI bei uns nicht tut"}, {"id": "bl-1780342784105-5q", "type": "list", "ordered": false, "items": ["KI entscheidet nicht über Themen, Inhalte oder Titel unserer Artikel.", "KI veröffentlicht keine Artikel ohne redaktionelle Prüfung. Automatisch und gekennzeichnet erscheinen nur News-Kurzfassungen, Prompts der KI-Redaktion und das Plattform-Verzeichnis. Dort prüfen wir nach der Veröffentlichung.", "KI interagiert nicht autonom im Push-Verfahren mit unserer Community.", "KI erhält keinen Zugriff auf persönliche oder vertrauliche Daten.", "KI entscheidet und installiert nicht von selbst über die Tools, AddIns, etc. auf digital-age.ch", "KI macht uns keinen Druck, wenn wir gerade im Urlaub sind, oder kreative Pause brauchen."]}, {"id": "bl-1780342784105-5r", "type": "heading", "level": 2, "content": "Warum wir KI einsetzen"}, {"id": "bl-1780342784105-5s", "type": "paragraph", "content": "Weil wir glauben, dass Technologie sinnvoll eingesetzt neue Möglichkeiten schafft. Wir wollen Inhalte schaffen, die klar, praxis relevant und zukunftsorientiert sind. KI hilft uns dabei. Gleichzeitig gilt: Qualität, Transparenz und Verantwortung stehen an erster Stelle."}, {"id": "bl-1780342784105-5t", "type": "heading", "level": 2, "content": "Fragen oder Feedback?"}, {"id": "bl-1780342784105-5u", "type": "paragraph", "content": "Du möchtest mehr wissen oder hast Fragen zur KI-Nutzung auf digital-age.ch?"}, {"id": "bl-1780342784105-5v", "type": "paragraph", "content": "Schreib uns: [Kontaktformular](/kontakt)"}, {"id": "bl-1780342784105-5w", "type": "heading", "level": 2, "content": "Transparenz bis zum Schluss"}, {"id": "bl-1780342784105-5x", "type": "paragraph", "content": "Ja, auch dieser Text entstand in Zusammenarbeit mit KI. Wie immer bei uns: von Maschinen unterstützt, von Menschen verantwortet."}], "sources": [], "version": 1}$ki$::jsonb
 where slug = 'ki-transparenz'
   and updated_at = '2026-06-01 19:39:44.401303+00';

-- Nach dem Text (ein updated_at-Trigger wuerde sonst die Bedingung oben brechen).
update public.pages
   set noindex = false
 where slug in ('ueber-uns', 'redaktion', 'ki-transparenz')
   and noindex = true;
