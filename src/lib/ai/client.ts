"use server";

import { createClient } from "@/lib/supabase/server";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { checkAiRateLimit, logAiUsage } from "@/lib/ai/rateLimit";
import type { AiResult, LLMParams, LLMProvider } from "@/lib/ai/types";

// Provider-Wahl ist aktuell hartverdrahtet. Die Naht ist das
// `LLMProvider`-Interface, NICHT eine Provider-Registry — eine Registry
// macht erst Sinn, wenn ein zweiter Provider existiert. Bis dahin: ein
// Aufruf, ein Provider.
const provider: LLMProvider = new AnthropicProvider();

// Holt die Author-ID des eingeloggten Users. Pattern aus den bestehenden
// Server Actions (z.B. authorActions.requireCurrentAuthor).
async function getCurrentAuthorId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: author } = await supabase
    .from("authors")
    .select("id")
    .eq("user_id", user.id)
    .single();
  return author?.id ?? null;
}

// Zentrale Aufruf-Funktion. Ablauf:
//   1. Author-ID auflösen — wenn nicht eingeloggt: config-Error.
//   2. Rate-Limit-Check vor dem Provider-Call. Bei allowed:false
//      sofortiger rate_limit-AiResult, KEIN Provider-Call und KEIN
//      Usage-Log (es ist ja kein Call passiert).
//   3. Provider-Call.
//   4. Usage-Log NUR wenn ein Provider-Call tatsächlich passiert ist —
//      also nicht in Fall (1) (kein Author) und nicht in Fall (2)
//      (Pre-Block durch Rate-Limit). Bei config-Fehler aus dem
//      Provider (z.B. fehlende Env) ebenfalls nicht loggen — kein Call
//      = keine Kosten. Bei jedem anderen Provider-Ergebnis (success,
//      auth, rate_limit-vom-Provider, timeout, unknown) wird geloggt,
//      mit Token-Counts wenn vorhanden (sonst 0/0).
export async function callLLM(params: LLMParams): Promise<AiResult> {
  const authorId = await getCurrentAuthorId();
  if (!authorId) {
    return {
      ok: false,
      kind: "config",
      message: "not authenticated",
    };
  }

  const decision = await checkAiRateLimit(authorId);
  if (!decision.allowed) {
    return {
      ok: false,
      kind: "rate_limit",
      message: `daily author limit reached, retry in ${decision.retryAfterSeconds}s`,
    };
  }

  const result = await provider.generate(params);

  // Provider-Konfig-Fehler bedeutet, dass kein Call passiert ist — also
  // auch keine Kosten anfielen, kein Log. Alle anderen Outcomes loggen.
  if (!result.ok && result.kind === "config") {
    return result;
  }

  if (result.ok) {
    await logAiUsage({
      authorId,
      task: params.task,
      provider: result.provider,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });
  } else {
    // Fehlerhafter Call ohne Token-Info: trotzdem loggen (=Spur, dass
    // ein Versuch passiert ist), aber mit 0/0 für Tokens.
    await logAiUsage({
      authorId,
      task: params.task,
      provider: "anthropic",
      model: process.env.ANTHROPIC_MODEL ?? "unknown",
      inputTokens: 0,
      outputTokens: 0,
    });
  }

  return result;
}
