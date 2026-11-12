import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type {
  AiErrorKind,
  AiResult,
  LLMParams,
  LLMProvider,
} from "@/lib/ai/types";

// Hartes Request-Timeout. Anthropic-SDK respektiert AbortSignal aus dem
// zweiten Argument zur messages.create-Methode.
const REQUEST_TIMEOUT_MS = 30_000;

// Ab der Claude-5.5-Generation ist adaptives Thinking immer aktiv und zaehlt
// auf max_tokens mit (Thinking + Antworttext). Die Caller geben maxTokens
// als Budget fuer den sichtbaren Text an (200–1500); ohne Puffer wuerde
// das Thinking den Rahmen aufbrauchen und die Antwort abschneiden.
// Der Puffer kostet nichts, solange er nicht genutzt wird.
const THINKING_HEADROOM_TOKENS = 2_048;

// Fortsetzungen nach "pause_turn" (Websuche am Iterationslimit).
const MAX_CONTINUATIONS = 3;

function classifyError(err: unknown): { kind: AiErrorKind; message: string } {
  // Anthropic-SDK liefert APIError mit `status`-Property; AbortError aus
  // dem Fetch-Stack hat name "AbortError".
  const e = err as { status?: number; name?: string; message?: string };
  if (e?.name === "AbortError") {
    return { kind: "timeout", message: "request timed out" };
  }
  if (typeof e?.status === "number") {
    if (e.status === 401 || e.status === 403) {
      return { kind: "auth", message: "authentication rejected by provider" };
    }
    if (e.status === 429) {
      return { kind: "rate_limit", message: "provider rate limit reached" };
    }
  }
  return { kind: "unknown", message: "provider call failed" };
}

export class AnthropicProvider implements LLMProvider {
  async generate(params: LLMParams): Promise<AiResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = params.model ?? process.env.ANTHROPIC_MODEL;
    if (!apiKey || !model) {
      // Niemals den Key-Wert loggen, nur die fehlende Variable benennen.
      console.error(
        "[ai:anthropic] ANTHROPIC_API_KEY oder ANTHROPIC_MODEL fehlt",
      );
      return {
        ok: false,
        kind: "config",
        message: "anthropic provider not configured",
      };
    }

    const client = new Anthropic({ apiKey });
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), params.timeoutMs ?? REQUEST_TIMEOUT_MS);

    // Ohne images: reiner Text-String (unveraendertes Verhalten). Mit images:
    // Content-Block-Array aus Text + Image-Blocks (URL-Source).
    const userContent: Anthropic.MessageParam["content"] =
      params.images && params.images.length > 0
        ? [
            { type: "text", text: params.prompt },
            ...params.images.map(
              (img): Anthropic.ImageBlockParam => ({
                type: "image",
                source: { type: "url", url: img.source.url },
              }),
            ),
          ]
        : params.prompt;

    try {
      // Mit Websuche: Server-Tool, Claude sucht selbst. Erreicht die Suche ihr
      // Iterationslimit, kommt stop_reason "pause_turn"; dann wird die Antwort
      // angehaengt und fortgesetzt (hoechstens MAX_CONTINUATIONS Mal).
      // Websuche mit dynamischer Filterung (20260209) gibt es fuer Sonnet,
      // Opus und Fable; Haiku bekommt die Basis-Variante.
      const searchType = /haiku/i.test(model) ? ("web_search_20250305" as const) : ("web_search_20260209" as const);
      const tools = params.webSearch
        ? [{ type: searchType, name: "web_search" as const, max_uses: params.webSearch.maxUses }]
        : undefined;
      const messages: Anthropic.MessageParam[] = [{ role: "user", content: userContent }];
      let inputTokens = 0;
      let outputTokens = 0;
      let resp: Anthropic.Message | null = null;
      for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
        resp = await client.messages.create(
          {
            model,
            max_tokens: params.maxTokens + THINKING_HEADROOM_TOKENS,
            system: params.system,
            messages,
            ...(tools ? { tools } : {}),
          },
          { signal: ac.signal },
        );
        inputTokens += resp.usage.input_tokens;
        outputTokens += resp.usage.output_tokens;
        if (resp.stop_reason !== "pause_turn") break;
        messages.push({ role: "assistant", content: resp.content });
      }
      if (!resp) throw new Error("no response");

      // Nur Text-Bloecke der letzten Antwort (Thinking, Suchaufrufe und
      // Suchergebnisse ignorieren) — non-streaming, einfache Form.
      const firstText = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      if (resp.stop_reason === "max_tokens") {
        // Antwort wurde abgeschnitten (Thinking + Text > Budget). Kein
        // Fehler, aber sichtbar machen — Hinweis, maxTokens des Callers
        // oder den Puffer zu erhoehen.
        console.warn(
          `[ai:anthropic] max_tokens erreicht (task=${params.task}, model=${model}, output=${resp.usage.output_tokens})`,
        );
      }

      return {
        ok: true,
        text: firstText,
        provider: "anthropic",
        model,
        inputTokens,
        outputTokens,
      };
    } catch (err) {
      const classified = classifyError(err);
      // Rohen SDK-Fehler nur server-side loggen, nicht im Result.
      console.error(`[ai:anthropic] ${classified.kind}:`, err);
      return { ok: false, ...classified };
    } finally {
      clearTimeout(timer);
    }
  }
}
