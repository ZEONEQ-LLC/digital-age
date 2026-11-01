import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { resolveLLMConfig } from "@/lib/ai/config";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { checkAiRateLimit, logAiUsage } from "@/lib/ai/rateLimit";
import type { AiResult, LLMParams, LLMProvider } from "@/lib/ai/types";

// LLM-Aufruf ohne Browser-Session (Route Handler mit Bearer-Token, Cron).
// Gleiche Schritte wie callLLM (client.ts): Rate-Limit je Author, Config aus
// der DB (hier per Service-Client, weil keine Session fuer RLS vorliegt),
// Provider, Kosten-Hauptbuch. Der Author wird vom Aufrufer bestimmt und
// traegt Rate-Limit und Kosten. Bewusst "server-only" und NICHT "use server":
// kein Client darf einen fremden Author einsetzen.
const provider: LLMProvider = new AnthropicProvider();

export async function callLLMForAuthor(authorId: string, params: LLMParams): Promise<AiResult> {
  const decision = await checkAiRateLimit(authorId);
  if (!decision.allowed) {
    return { ok: false, kind: "rate_limit", message: `hourly author limit reached, retry in ${decision.retryAfterSeconds}s` };
  }
  const resolved = await resolveLLMConfig(params, createServiceClient());
  const result = await provider.generate(resolved);
  if (!result.ok && result.kind === "config") return result;
  await logAiUsage({
    authorId,
    task: params.task,
    provider: result.ok ? result.provider : "anthropic",
    model: result.ok ? result.model : (resolved.model ?? process.env.ANTHROPIC_MODEL ?? "unknown"),
    inputTokens: result.ok ? result.inputTokens : 0,
    outputTokens: result.ok ? result.outputTokens : 0,
  });
  return result;
}
