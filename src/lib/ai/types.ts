// Phase 11 — AI-Infrastruktur (A1a).
//
// Dünne Adapter-Typen. Bewusst kein universeller LLM-Wrapper: ein konkreter
// Provider (Anthropic), eine Naht über das LLMProvider-Interface. Ein
// zweiter Provider würde später durch eine Implementierung von LLMProvider
// hinzukommen — KEINE Provider-Registry, solange es nur einen gibt.

// Logisches Task-Tag. Wird in `ai_usage_log.task` persistiert für spätere
// Auswertung (Kosten pro Use-Case). Aktuell nur Smoke-Test — echte Tasks
// (z.B. "seo_title", "summary") kommen mit den Editor-Buttons in späteren
// PRs hinzu.
export type AiTask = "smoke_test";

export type LLMParams = {
  system: string;
  prompt: string;
  maxTokens: number;
  task: AiTask;
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
