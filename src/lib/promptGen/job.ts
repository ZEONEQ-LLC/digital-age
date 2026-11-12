import "server-only";

import { revalidatePath } from "next/cache";
import AiJobReport, { type AiJobReportLine } from "@/emails/AiJobReport";
import { getPromptOverride } from "@/lib/ai/promptOverrides";
import { callLLMForAuthor } from "@/lib/ai/systemCall";
import { resolveSystemAuthorId } from "@/lib/ai/systemAuthor";
import { notifyEditor } from "@/lib/aiJobs/notify";
import { finishRun, startRun, type JobSummary } from "@/lib/aiJobs/runs";
import { PROMPT_CATEGORIES, PROMPT_DIFFICULTIES } from "@/lib/mappers/promptMappers";
import { SITE_URL } from "@/lib/newsletter/mail";
import {
  AI_SUBMITTER_NAME,
  PROMPTS_PER_RUN,
  buildExamplePrompt,
  buildGenerationPrompt,
  formatExampleOutput,
  isoWeek,
  parseGenerated,
  pickCategories,
} from "@/lib/promptGen/generate";
import { createServiceClient } from "@/lib/supabase/service";

// Prompts der KI-Redaktion (Entscheid Ali 12.11.2026: 3 pro Woche,
// gekennzeichnet). Ein Aufruf schreibt drei Prompts fuer die am schwaechsten
// vertretenen Kategorien, je ein zweiter fuehrt das ausgefuellte Beispiel aus
// (Beispiel-Output). Die Prompts erscheinen sofort, mit ai_generated = true
// und «KI-Redaktion» als Absender. Danach Mail an die Redaktion; zurueckziehen
// geht im Admin «Prompts» (Archivieren).

export type PromptRunResult = { runId: string | null; busy?: boolean; created: number; errors: string[] };

const ADMIN_PATH = "/autor/admin/prompts";

function label(list: readonly { code: string; label: string }[], code: string): string {
  return list.find((x) => x.code === code)?.label ?? code;
}

function short(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 2).replace(/\s+\S*$/, "")} …` : text;
}

export async function runPromptGeneration(trigger: "cron" | "manual", authorId: string | null): Promise<PromptRunResult> {
  const svc = createServiceClient();
  const errors: string[] = [];
  const started = await startRun(svc, "prompt_generation", trigger);
  if ("busy" in started) return { runId: null, busy: true, created: 0, errors: ["Ein Lauf ist bereits aktiv."] };
  if ("error" in started) return { runId: null, created: 0, errors: [started.error] };
  const { runId } = started;
  const fail = async (message: string, summary: JobSummary = {}): Promise<PromptRunResult> => {
    errors.push(message);
    await finishRun(svc, runId, "error", summary, errors);
    if (trigger === "cron") {
      await notifyEditor("Prompts der KI-Redaktion: Lauf fehlgeschlagen", AiJobReport({
        heading: "Die neuen Prompts der Woche konnten nicht erstellt werden.",
        intro: "Es wurde nichts veröffentlicht. Der nächste Lauf versucht es erneut; im Admin kannst du ihn auch von Hand starten.",
        sections: [], errors, adminUrl: `${SITE_URL}${ADMIN_PATH}`, adminLabel: "Zum Admin →",
      }));
    }
    return { runId, created: 0, errors };
  };

  const { data: rows, error } = await svc.from("ai_prompts").select("title, category, status");
  if (error || !rows) return fail(`Prompts nicht lesbar: ${error?.message ?? "leer"}`);
  // Alle Titel gegen Dubletten (auch abgelehnte und archivierte), gezaehlt
  // werden nur sichtbare.
  const titles = rows.map((r) => r.title);
  const counts: Record<string, number> = {};
  for (const r of rows) if (r.status === "published" || r.status === "featured") counts[r.category] = (counts[r.category] ?? 0) + 1;
  const categories = pickCategories(counts, PROMPTS_PER_RUN, isoWeek(new Date()));

  const author = authorId ?? (await resolveSystemAuthorId(svc, "AI_JOBS_AUTHOR_ID"));
  if (!author) return fail("Kein Editor für die KI-Kosten gefunden.");
  const strategy = await getPromptOverride("prompt_generation", svc);
  const { system, prompt } = buildGenerationPrompt(categories, titles, strategy);
  const res = await callLLMForAuthor(author, { system, prompt, maxTokens: 6000, task: "prompt_generation", timeoutMs: 180_000 });
  if (!res.ok) return fail(`KI nicht erreichbar (${res.kind}).`);
  const generated = parseGenerated(res.text, titles);
  if (!generated) return fail("Die KI-Antwort war kein gültiges JSON.", { raw: res.text.slice(0, 2000) });
  if (generated.length === 0) return fail("Kein Vorschlag bestand die Prüfung (Länge, Kategorie, Dublette).");

  // Beispiele parallel ausfuehren; ein Fehler kostet nur den Beispiel-Output.
  const examples = await Promise.all(
    generated.map(async (g) => {
      const ex = buildExamplePrompt(g);
      const r = await callLLMForAuthor(author, { ...ex, maxTokens: 1200, task: "prompt_generation", timeoutMs: 90_000 });
      if (!r.ok) { errors.push(`Beispiel für «${g.title}»: KI nicht erreichbar (${r.kind}).`); return null; }
      return formatExampleOutput(g.example_values, r.text);
    }),
  );

  const now = new Date().toISOString();
  const lines: AiJobReportLine[] = [];
  for (const [i, g] of generated.entries()) {
    const { data: ins, error: insErr } = await svc.from("ai_prompts").insert({
      title: g.title,
      category: g.category,
      difficulty: g.difficulty,
      context: g.context,
      prompt_text: g.prompt_text,
      example_output: examples[i],
      tested_with: "claude",
      status: "published",
      published_at: now,
      author_id: null,
      submitter_name: AI_SUBMITTER_NAME,
      ai_generated: true,
    }).select("slug").single();
    if (insErr || !ins) { errors.push(`«${g.title}»: ${insErr?.message ?? "nicht gespeichert"}`); continue; }
    lines.push({ title: g.title, detail: `${label(PROMPT_CATEGORIES, g.category)}, ${label(PROMPT_DIFFICULTIES, g.difficulty)}. ${short(g.context, 220)}`, href: `${SITE_URL}/ai-prompts/${ins.slug}` });
  }

  const created = lines.length;
  await finishRun(svc, runId, created === 0 ? "error" : errors.length > 0 ? "partial" : "ok", { created, categories }, errors);
  try { revalidatePath("/ai-prompts"); } catch { /* ausserhalb eines Requests (Test) */ }

  if (created > 0 || trigger === "cron") {
    await notifyEditor(
      created > 0 ? `Prompts der KI-Redaktion: ${created} neu veröffentlicht` : "Prompts der KI-Redaktion: nichts veröffentlicht",
      AiJobReport({
        heading: created > 0 ? "Die KI-Redaktion hat neue Prompts veröffentlicht." : "Die KI-Redaktion hat diese Woche nichts veröffentlicht.",
        intro: created > 0
          ? "Die Prompts sind bereits live und als «KI-Redaktion» gekennzeichnet. Gefällt dir einer nicht, archivierst du ihn im Admin unter Prompts."
          : "Alle Einträge sind an der Prüfung oder beim Speichern gescheitert.",
        sections: [{ title: "Neu", lines }],
        errors,
        adminUrl: `${SITE_URL}${ADMIN_PATH}`,
        adminLabel: "Prompts im Admin →",
      }),
    );
  }
  return { runId, created, errors };
}
