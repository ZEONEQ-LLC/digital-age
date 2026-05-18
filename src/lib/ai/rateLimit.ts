import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

// Pragmatische Abweichung von `src/lib/rate-limit.ts`:
//   - Identifier: Author-ID (authentifizierter Editor-Kontext) statt
//     IP-Hash.
//   - Storage: `ai_usage_log` ist Rate-Limit-Zähler UND persistenter
//     Kosten-Hauptbuch — derselbe Insert dient beiden Zwecken.
//   - KEIN 24h-Auto-Cleanup (Begründung: Kostenhistorie soll dauerhaft
//     erhalten bleiben). Ein Long-Term-Cleanup für >365 Tage alte Zeilen
//     wäre denkbar, ist aber bewusst nicht aktiv — solange das Volumen
//     klein bleibt, ist Vollarchiv die saubere Default.
//
// Der bestehende `rate-limit.ts`-Helper bleibt unverändert — er ist für
// IP-basierte Public-Form-Submissions zugeschnitten und mit
// `newsletter_signup_attempts` als Backing-Table verdrahtet. Hier brauchen
// wir eine andere Identifier-Klasse (User statt IP) und eine andere
// Retention-Politik (forever statt 24h), darum eigene Implementierung.

// Limit: 20 AI-Calls pro Author pro Stunde. Konservativ. Anpassbar.
const LIMIT_PER_HOUR = 20;

const HOUR_MS = 60 * 60 * 1000;

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export async function checkAiRateLimit(
  authorId: string,
): Promise<RateLimitDecision> {
  const supabase = createServiceClient();
  const oneHourAgo = new Date(Date.now() - HOUR_MS).toISOString();

  // Anzahl der Calls im laufenden Fenster.
  const { count } = await supabase
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("author_id", authorId)
    .gte("created_at", oneHourAgo);

  if ((count ?? 0) < LIMIT_PER_HOUR) {
    return { allowed: true };
  }

  // Ältesten relevanten Eintrag finden — dessen Roll-out-Zeit ist die
  // frühestmögliche Retry-Gelegenheit.
  const { data: oldest } = await supabase
    .from("ai_usage_log")
    .select("created_at")
    .eq("author_id", authorId)
    .gte("created_at", oneHourAgo)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let retryAfterSeconds = 60; // Fallback wenn die Query nichts zurückgibt
  if (oldest?.created_at) {
    const ageMs = Date.now() - new Date(oldest.created_at).getTime();
    const remainingMs = HOUR_MS - ageMs;
    retryAfterSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  }

  return { allowed: false, retryAfterSeconds };
}

export async function logAiUsage(args: {
  authorId: string;
  task: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("ai_usage_log").insert({
    author_id: args.authorId,
    task: args.task,
    provider: args.provider,
    model: args.model,
    input_tokens: args.inputTokens,
    output_tokens: args.outputTokens,
  });
  if (error) {
    // Nicht throwen — Logging-Failure soll den AI-Call nicht killen, der
    // Provider-Call ist schon passiert. Aber sichtbar in Server-Logs.
    console.error("[ai:usage-log] insert failed:", error);
  }
}

// Optionaler Cleanup für sehr alte Einträge (>365 Tage). NICHT aktiv
// aufgerufen — nur als Vorschlag dokumentiert, falls die Tabelle in Jahren
// unbeherrschbar wird. Aktivierung sollte bewusste Produkt-Entscheidung
// sein (Kosten-Aggregations-Job müsste vorher die Daten abziehen):
//
// export async function cleanupOldAiUsage(maxAgeDays = 365): Promise<void> {
//   const supabase = createServiceClient();
//   const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
//   await supabase.from("ai_usage_log").delete().lt("created_at", cutoff);
// }
