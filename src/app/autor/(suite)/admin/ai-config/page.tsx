import PageTitle from "@/components/author/PageTitle";
import { createClient } from "@/lib/supabase/server";
import type { AiTask } from "@/lib/ai/types";
import AiConfigClient from "./AiConfigClient";

const TASK_LABELS: Record<AiTask, string> = {
  title_variants: "Titel-Varianten",
  tone_check: "Stil & Tonalität prüfen",
  summary: "Zusammenfassung",
  seo_title: "SEO-Titel",
  seo_description: "Meta-Description",
  seo_slug: "URL-Slug",
  seo_keyword: "Focus Keyword",
  closing_paragraph: "Schluss-Absatz",
  seo_pipeline: "SEO-Pipeline (Master)",
  seo_review: "SEO-Verbesserungsvorschläge",
  news_item_generation: "News-Ticker Item-Generation",
  abstract_generate: "Abstract generieren",
};

// Visuelle Gruppierung der Tasks. Reihenfolge im Array = Reihenfolge in
// der UI; alle 12 Tasks aus AiTask müssen genau einer Gruppe angehören.
type TaskGroup = { id: string; label: string; tasks: AiTask[] };

const TASK_GROUPS: TaskGroup[] = [
  {
    id: "seo",
    label: "SEO",
    tasks: [
      "seo_pipeline",
      "seo_review",
      "seo_title",
      "seo_description",
      "seo_slug",
      "seo_keyword",
    ],
  },
  {
    id: "content",
    label: "Content",
    tasks: [
      "title_variants",
      "tone_check",
      "summary",
      "abstract_generate",
      "closing_paragraph",
    ],
  },
  {
    id: "news",
    label: "News",
    tasks: ["news_item_generation"],
  },
];

export default async function AiConfigPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_config")
    .select("system_prompt, default_model, task_model_overrides, updated_at")
    .eq("id", "global")
    .single();

  // Fallback-Initial: leere Felder. Bei Fehler bleibt die UI bedienbar,
  // Server-Action overschreibt beim Save sowieso die ganze Row.
  const initialSystemPrompt = data?.system_prompt ?? "";
  const initialDefaultModel = data?.default_model ?? "";
  const rawOverrides = (data?.task_model_overrides ?? {}) as Record<
    string,
    unknown
  >;
  const initialTaskOverrides: Partial<Record<AiTask, string>> = {};
  for (const t of Object.keys(TASK_LABELS) as AiTask[]) {
    const v = rawOverrides[t];
    if (typeof v === "string") initialTaskOverrides[t] = v;
  }

  return (
    <>
      <PageTitle
        title="AI-Konfiguration"
        subtitle="Systemprompt + Modell-Default + optionale Overrides pro AI-Task. Wird zur Laufzeit von callLLM gelesen — Änderungen wirken sofort, kein Redeploy nötig."
      />
      <AiConfigClient
        initialSystemPrompt={initialSystemPrompt}
        initialDefaultModel={initialDefaultModel}
        initialTaskOverrides={initialTaskOverrides}
        taskLabels={TASK_LABELS}
        taskGroups={TASK_GROUPS}
        lastUpdatedAt={data?.updated_at ?? null}
      />
    </>
  );
}
