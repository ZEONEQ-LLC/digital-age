// TEMPORAER — wird in A1b entfernt. Dient nur der Verifikation der
// AI-Infrastruktur (A1a) im Vercel-Preview.

"use server";

import { callLLM } from "@/lib/ai/client";
import type { AiResult } from "@/lib/ai/types";

export async function runAiSmokeTest(): Promise<AiResult> {
  return callLLM({
    system: "Antworte mit genau dem Wort: OK",
    prompt: "Ping",
    maxTokens: 16,
    task: "smoke_test",
  });
}
