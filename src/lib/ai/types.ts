// Phase 11 — AI-Infrastruktur (A1a).
//
// Dünne Adapter-Typen. Bewusst kein universeller LLM-Wrapper: ein konkreter
// Provider (Anthropic), eine Naht über das LLMProvider-Interface. Ein
// zweiter Provider würde später durch eine Implementierung von LLMProvider
// hinzukommen — KEINE Provider-Registry, solange es nur einen gibt.

// Logisches Task-Tag. Wird in `ai_usage_log.task` persistiert für spätere
// Auswertung (Kosten pro Use-Case). Die acht Werte korrespondieren 1:1
// mit den AI-Buttons im Author-Editor (vier in der EditorSidebar + vier
// im EditorSeoPanel) und werden in A1b-1 an die Buttons verdrahtet.
export type AiTask =
  | "title_variants"
  | "tone_check"
  | "summary"
  | "seo_title"
  | "seo_description"
  | "seo_slug"
  | "seo_keyword"
  | "closing_paragraph"
  // Master-Button "SEO generieren" — 1 LLM-Call liefert 5 Felder als JSON
  // (Themenprofil, Focus-Keyword, 3 Title-Kandidaten, Meta-Description,
  // Slug-Vorschlag). Ersetzt die seo_title-Pilot-Verdrahtung im UI.
  | "seo_pipeline"
  // Read-only SEO-Analyse von H1 + erster Absatz + Focus-Keyword. Liefert
  // 3–6 strukturierte Empfehlungen (severity + category + finding +
  // recommendation). Ändert nichts am Artikel — eigener UI-Button im
  // SEO-Tab unter der Pipeline-Card.
  | "seo_review";

export type LLMParams = {
  system: string;
  prompt: string;
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
