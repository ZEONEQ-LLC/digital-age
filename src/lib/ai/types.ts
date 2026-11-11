// Phase 11 — AI-Infrastruktur (A1a).
//
// Dünne Adapter-Typen. Bewusst kein universeller LLM-Wrapper: ein konkreter
// Provider (Anthropic), eine Naht über das LLMProvider-Interface. Ein
// zweiter Provider würde später durch eine Implementierung von LLMProvider
// hinzukommen — KEINE Provider-Registry, solange es nur einen gibt.

// Logisches Task-Tag. Wird in `ai_usage_log.task` persistiert für spätere
// Auswertung (Kosten pro Use-Case). title_variants, tone_check, summary und
// closing_paragraph gehoerten zu Buttons der EditorSidebar, die mit PR 130
// weggefallen ist; sie haben heute keinen Aufrufer (nur Modellwahl in der
// AI-Konfiguration). Ob sie wiederkommen oder entfernt werden, ist offen
// (Backlog «AI 1b»).
export type AiTask =
  | "title_variants"
  | "tone_check"
  | "summary"
  | "closing_paragraph"
  // Master-Button "SEO generieren" — 1 LLM-Call liefert 5+ Felder als JSON
  // (Themenprofil, Focus-Keyword, 3 Title-Kandidaten, Meta-Description,
  // Slug-Vorschlag, semantische Begriffe). Wird auch von den 4 Einzel-
  // Re-Generate-Buttons im SEO-Tab wiederverwendet — sie picken nur das
  // jeweilige Ziel-Feld aus dem Master-Ergebnis (Single Source of Truth,
  // kein Prompt-Drift). Eigene seo_title/description/slug/keyword-Tasks
  // existieren bewusst nicht.
  | "seo_pipeline"
  // Read-only SEO-Analyse von H1 + erster Absatz + Focus-Keyword. Liefert
  // 3–6 strukturierte Empfehlungen (severity + category + finding +
  // recommendation). Ändert nichts am Artikel — eigener UI-Button im
  // SEO-Tab unter der Pipeline-Card.
  | "seo_review"
  // News-Ticker Item-Generation: pro RSS-Feed-Item ein LLM-Call, der
  // Title/Teaser/Summary/Category als JSON liefert oder mit {skip:true}
  // off-topic-Items aussortiert. Wird vom Refresh-Orchestrator pro Item
  // einzeln aufgerufen.
  | "news_item_generation"
  // Abstract-Generierung aus dem Body-Text. Wird vom Toolbar-Button im
  // Abstract-Editor aufgerufen. Locale (de-CH | en) ist harte Vorgabe im
  // System-Prompt, Output ist Plain-Token-Text (kein JSON).
  | "abstract_generate"
  // Highlight-Vorschlaege: die AI schlaegt 3-6 woertliche Kernaussagen zum
  // Markieren (Bold + Green-Highlight) vor. Toolbar-Button im Body-Editor,
  // Anwendung erst nach Auswahl im Modal. Output ist JSON (quote + reason).
  | "highlight_suggestions"
  // Bild-ALT-Text-Generierung (Vision): ein Bild wird an das Modell
  // uebergeben, Output ist JSON ({alt}). Vom Co-Pilot fuer Hero + Inline-
  // Bilder ohne ALT genutzt. Braucht ein vision-faehiges Modell (Haiku 4.5
  // und Sonnet 5 koennen Image-Content-Blocks).
  | "image_alt"
  // Podcast-Empfehlung per Teilen (api/podcasts/ingest): Kurzbeschreibung,
  // Kategorie und Sprache aus Apple-Metadaten. Laeuft ohne Session ueber
  // callLLMForAuthor (systemCall.ts).
  | "podcast_ingest"
  // Hero Studio (PR 182): vier Hero-Vorschlaege (2 Linie, 2 Typo) aus dem
  // Beitrag als JSON, auf Knopfdruck im Tab «Hero Studio», gespeichert in
  // articles.cover_proposals (keine Revision). v1 nur Symbol-Motive.
  | "hero_proposals"
  // Hero Studio: Posttexte fuer LinkedIn und Instagram zum Beitrag (JSON),
  // nur Anzeige und ZIP-Paket, nicht gespeichert.
  | "social_posts";

// Laufzeit-Liste aller Tasks (Resolver, Speichern der Konfiguration). Der
// Record erzwingt beim Kompilieren, dass jeder AiTask-Wert hier steht; eine
// neue Task braucht nur diese Zeile plus Label und Gruppe im Admin.
const AI_TASK_FLAGS: Record<AiTask, true> = {
  title_variants: true,
  tone_check: true,
  summary: true,
  closing_paragraph: true,
  seo_pipeline: true,
  seo_review: true,
  news_item_generation: true,
  abstract_generate: true,
  highlight_suggestions: true,
  image_alt: true,
  podcast_ingest: true,
  hero_proposals: true,
  social_posts: true,
};

export const AI_TASKS = Object.keys(AI_TASK_FLAGS) as AiTask[];

export function isAiTask(value: unknown): value is AiTask {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(AI_TASK_FLAGS, value);
}

// Tasks, deren Modell nicht auf der Seite AI-Konfiguration, sondern in ihrem
// eigenen Bereich gewaehlt wird (News-Ticker seit PR 190). saveAiConfig
// uebernimmt deren Override unveraendert aus der DB.
export const TASKS_WITH_OWN_MODEL_SETTING: readonly AiTask[] = ["news_item_generation"];

// Minimaler Image-Input fuer Vision-Tasks. Aktuell nur URL-Source (die
// Bild-URLs sind public Supabase-Storage-URLs, die Anthropic selbst laden
// kann); base64 waere eine spaetere Erweiterung derselben Naht.
export type LLMImage = { source: { kind: "url"; url: string } };

export type LLMParams = {
  system: string;
  prompt: string;
  // Optionale Bilder (Vision). Wenn gesetzt, baut der Provider den user-
  // content als Block-Array (Text + Image-Blocks); ohne images unveraendert
  // ein reiner Text-String.
  images?: LLMImage[];
  maxTokens: number;
  task: AiTask;
  // Optionales Modell-Override pro Call. Wenn gesetzt, nutzt der
  // Provider diesen Wert statt `process.env.ANTHROPIC_MODEL`. Wird vom
  // Config-Resolver in `callLLM` befüllt (DB → task_model_overrides ↦
  // default_model). Bleibt undefined bei Direkt-Callern oder Config-
  // Resolve-Failure (dann Env-Fallback im Provider).
  model?: string;
};

// Discriminated Union: success vs structured error. Hält das Aufrufer-Code
// frei von Try/Catch — alle Fehler kommen typisiert zurück.
export type AiResultSuccess = {
  ok: true;
  text: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

export type AiErrorKind =
  | "config" // fehlende Env-Var, Provider nicht initialisierbar
  | "auth" // 401 vom Provider
  | "rate_limit" // 429 vom Provider ODER eigener Author-Limiter
  | "timeout" // Netzwerk-Timeout / abort
  | "invalid_json" // Antwort liess sich nicht zu erwartetem Schema parsen
  | "unknown"; // alles andere — Provider-Details bleiben in Server-Logs

export type AiResultError = {
  ok: false;
  kind: AiErrorKind;
  message: string;
};

export type AiResult = AiResultSuccess | AiResultError;

// Provider-Naht. Implementierungen leben unter `src/lib/ai/providers/*`.
export interface LLMProvider {
  generate(params: LLMParams): Promise<AiResult>;
}
