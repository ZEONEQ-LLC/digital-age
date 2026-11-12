import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";

// Laeufe der Hintergrund-Jobs in ai_job_runs (PR 197). Ein Lauf gilt bis
// 15 Minuten nach dem Start als aktiv; so startet ein Doppelklick auf
// «Jetzt …» keinen zweiten, und ein abgestuerzter Lauf blockiert nicht ewig.

export type AiJob = "platform_research" | "prompt_generation";
export type RunStatus = "ok" | "partial" | "error";
export type JobSummary = { [key: string]: Json };

const ACTIVE_WINDOW_MS = 15 * 60_000;

export async function startRun(
  svc: SupabaseClient<Database>,
  job: AiJob,
  trigger: "cron" | "manual",
): Promise<{ runId: string } | { busy: true } | { error: string }> {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
  const { data: active } = await svc
    .from("ai_job_runs")
    .select("id")
    .eq("job", job)
    .eq("status", "running")
    .gte("started_at", since)
    .limit(1);
  if (active && active.length > 0) return { busy: true };
  const { data, error } = await svc.from("ai_job_runs").insert({ job, trigger }).select("id").single();
  if (error || !data) return { error: error?.message ?? "Lauf nicht angelegt" };
  return { runId: data.id };
}

export async function finishRun(
  svc: SupabaseClient<Database>,
  runId: string,
  status: RunStatus,
  summary: JobSummary,
  errors: string[],
): Promise<void> {
  await svc
    .from("ai_job_runs")
    .update({ status, summary, errors, finished_at: new Date().toISOString() })
    .eq("id", runId);
}
