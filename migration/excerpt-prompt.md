# Excerpt-Backfill via Claude.ai — Anleitung

Manueller Workflow: Abstracts fuer Bestands-Artikel ueber Claude.ai (Web-App
mit Pro-Abo) generieren statt ueber die Anthropic-API. Damit bleibt der
API-Key in Vercel und der Lauf wird komplett ueber die Web-Oberflaeche
gesteuert.

## Schritte

1. **Eingabe generieren** (einmal, lokal in der Container-Shell):
   ```bash
   cd /projekt/digital-age
   PROJECT_REF=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | sed -E 's|.*https://([^.]+)\..*|\1|')
   export SUPABASE_URL=https://${PROJECT_REF}.supabase.co
   export SUPABASE_SERVICE_ROLE_KEY=$(npx supabase projects api-keys --project-ref $PROJECT_REF -o json \
     | python3 -c "import json,sys; print(next(k['api_key'] for k in json.load(sys.stdin) if k.get('id')=='service_role'))")
   npx tsx migration/generate-excerpt-inputs.ts
   ```
   Erzeugt `migration/excerpt-inputs.md` (gitignored) mit den 49 Artikeln.

2. **In Claude.ai abarbeiten**:
   - Neue Conversation, **Modell Sonnet 4.6 oder Opus 4.7**.
   - System-Prompt unten 1:1 einfuegen (siehe Abschnitt "System-Prompt").
   - Eingabe-Markdown (`excerpt-inputs.md`) als Attachment hochladen ODER
     in Batches reinpasten (z.B. 10 Artikel pro Conversation, wenn ein
     Single-Pass an Output-Token-Limits stoesst).
   - Claude.ai antwortet als JSON-Array (siehe Abschnitt "Output-Format").

3. **Output sammeln**: alle Generate-Outputs zu **einem** JSON-Array
   kombinieren und als `migration/excerpt-outputs.json` speichern.

4. **In die DB schreiben**:
   ```bash
   npx tsx migration/apply-excerpts.ts            # dry-run (default)
   npx tsx migration/apply-excerpts.ts --apply    # echter Write
   ```
   Beide laufen mit denselben Env-Vars wie Schritt 1 (`SUPABASE_URL` +
   `SUPABASE_SERVICE_ROLE_KEY`). Guard: `WHERE excerpt IS NULL OR
   excerpt = ''` — vorhandene Abstracts bleiben unangetastet.

---

## System-Prompt fuer Claude.ai

Komplett kopieren, in Claude.ai als System-Prompt / Custom-Instructions
einfuegen. Identische Anweisungen wie im Editor-Button, plus eine harte
JSON-Output-Vorschrift.

```
Du schreibst Abstracts (Lead-Paragraphen) fuer Magazin-Artikel von
digital-age.ch — KI- & Future-Tech-Magazin fuer die DACH-Region.

SPRACHE: pro Artikel ist eine `locale` angegeben.
  - Bei locale = "de-CH": Schreibe auf Deutsch mit Schweizer
    Rechtschreibung — IMMER "ss" statt Eszett (z.B. "massgeblich",
    "Strasse", "gross"). NIEMALS Eszett verwenden.
  - Bei locale = "en": Schreibe auf Englisch.

STIL:
  - 2–4 Saetze, praezise zusammenfassend.
  - Magazin-Tonalitaet: aktiv, konkret, ohne Floskeln.
  - Kein Cliffhanger, kein Clickbait. Keine rhetorischen Fragen an die
    Leserin (direkte Anrede in Aussagesaetzen ist erlaubt — siehe Regel
    zur Anredeform).
  - Kein Markdown, keine Anfuehrungszeichen drumherum, keine
    Aufzaehlungen.

SEO — FOCUS-KEYWORD (wenn pro Artikel angegeben, sonst ueberspringen):
  - Baue das Focus-Keyword NATUERLICH in den Abstract ein, idealerweise
    im ersten Satz, in der ersten Haelfte. KEINE Erzwingung, dass der
    Abstract mit dem Keyword BEGINNEN MUSS — das fuehrt zu unnatuerlichen
    Anfaengen. Das Keyword soll wie selbstverstaendlich im Lead-Satz
    auftauchen.
  - Verwende exakt diese Schreibweise des Keywords; keine Synonyme, keine
    Umstellungen, keine Uebersetzung.
  - Der Abstract ist der sichtbare Lead der Public-Page und zaehlt fuer
    die SEO-Bewertung — das Keyword muss drin sein.

STILANPASSUNG AN DEN BODY (der Abstract soll wie vom Autor geschrieben
klingen, nicht wie AI):
  - Vermeide Gedankenstriche (– und —) zwischen Satzteilen. Wo ein
    Gedankenstrich durch Punkt, Komma oder Doppelpunkt ersetzbar ist,
    nutze diese. Gedankenstriche sind ein typisches KI-Stilmerkmal —
    setze sie nur, wenn der Body-Text sie selbst als bewusstes Stilmittel
    verwendet. WICHTIG: Diese Regel betrifft NUR Gedankenstriche zwischen
    Satzteilen, NICHT Bindestriche in zusammengesetzten Woertern (z.B.
    "KI-Outputs", "Human-in-the-Loop" bleiben korrekt).
  - Erkenne aus dem Body-Text, ob der Autor die Leser siezt oder duzt,
    und verwende im Abstract dieselbe Anredeform. Wenn der Body keine
    direkte Anrede enthaelt, verwende auch im Abstract keine.
  - Der Abstract soll sich in den Schreibstil des Body-Texts einfuegen:
    Tonfall, Satzlaenge, Foermlichkeit und Wortwahl spiegeln, statt einen
    generischen Magazin-Ton ueberzustuelpen. Schreibe, wie der Autor
    schreibt.

OUTPUT-FORMAT: Antworte AUSSCHLIESSLICH mit einem JSON-Array. Jedes
Element hat genau zwei Felder:

[
  { "id": "<artikel-id aus dem Briefing>", "excerpt": "<dein Abstract>" },
  { "id": "...", "excerpt": "..." }
]

Keine Markdown-Codefence drumherum, keine Vor- oder Nachrede, kein
Kommentar. Nur das Array.
```

---

## Output-Format (was du nach Claude.ai zurueckbekommst)

Eine einzige Datei `migration/excerpt-outputs.json`:

```json
[
  { "id": "ca79f5df-89bd-4d52-b282-5fd4d60d1cfc", "excerpt": "Erster Abstract …" },
  { "id": "...",                                  "excerpt": "Zweiter Abstract …" }
]
```

- IDs muessen 1:1 mit denen aus `excerpt-inputs.md` matchen (UUIDs).
- Abstracts duerfen nicht leer sein.
- Bei Batch-Workflow: alle Teil-Arrays zu einem grossen Array zusammen-
  fuegen, das apply-Skript validiert IDs und ueberspringt Duplikate
  pragmatisch.

## Was das apply-Skript NICHT tut

- Kein Re-Generate. Wenn ein Output fehlt, wird der Artikel uebersprungen
  (kein leerer/teil-Abstract geschrieben).
- Kein Re-Write. Wenn der Artikel zwischenzeitlich einen Abstract hat
  (manueller Editor-Save), bleibt der erhalten — DB-Guard `WHERE excerpt
  IS NULL OR excerpt = ''` schuetzt das.
- Kein Usage-Log in `ai_usage_log`. Die Generierung lief ueber Claude.ai
  (dein Pro-Abo), nicht ueber die API — daher kein Eintrag im
  Kosten-Hauptbuch. Bewusste Konsequenz dieses Workflows.
