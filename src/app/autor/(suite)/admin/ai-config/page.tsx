import PageTitle from "@/components/author/PageTitle";
import { createClient } from "@/lib/supabase/server";
import type { AiTask } from "@/lib/ai/types";
import {
  EDITABLE_PROMPT_IDS,
  EDITABLE_DEFAULT_STRATEGIES,
  type EditablePromptId,
} from "@/lib/ai/promptRegistry";
import AiConfigClient from "./AiConfigClient";

// Editierbare Strategie-Prompts (Prompt-ID → UI-Label). Placeholder = der
// Code-Default aus der Registry; leeres Feld = Code-Standard.
const PROMPT_LABELS: Record<EditablePromptId, string> = {
  seo_keyword_candidates: "SEO — Keyword-Kandidaten (Stufe 1)",
  seo_derive: "SEO — Ableitung aus Keyword (Stufe 2)",
  seo_review: "SEO — Verbesserungsvorschläge (Analyse)",
  highlight_suggestions: "Highlight-Vorschläge",
  image_alt: "Bild-ALT-Texte",
};

// TASK_LABELS enthält alle Tasks, für die das UI ein Override-Dropdown
// anbietet (= KNOWN_TASKS aus config.ts/configActions.ts). Nach dem
// (b)-Umbau (kein Einzel-Server-Action pro SEO-Feld mehr — alle 4
// Einzel-Buttons im SEO-Tab nutzen wieder die seo_pipeline) gibt es im
// AiTask-Enum keine SEO-Einzel-Tasks mehr; TASK_LABELS deckt damit
// die volle Enum-Breite ab.
const TASK_LABELS: Record<AiTask, string> = {
  title_variants: "Titel-Varianten",
  tone_check: "Stil & Tonalität prüfen",
  summary: "Zusammenfassung",
  closing_paragraph: "Schluss-Absatz",
  seo_pipeline: "SEO-Pipeline (Master)",
  seo_review: "SEO-Verbesserungsvorschläge",
  news_item_generation: "News-Ticker Item-Generation",
  abstract_generate: "Abstract generieren",
  highlight_suggestions: "Highlight-Vorschläge",
  image_alt: "Bild-ALT-Texte",
};

// Visuelle Gruppierung der UI-sichtbaren Tasks. Reihenfolge im Array =
// Reihenfolge in der UI; jeder Key in TASK_LABELS muss genau einer Gruppe
// angehören.
type TaskGroup = { id: string; label: string; tasks: AiTask[] };

const TASK_GROUPS: TaskGroup[] = [
  {
    id: "seo",
    label: "SEO",
    tasks: ["seo_pipeline", "seo_review"],
  },
  {
    id: "content",
    label: "Content",
    tasks: [
      "title_variants",
      "tone_check",
      "summary",
      "abstract_generate",
      "highlight_suggestions",
      "image_alt",
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
    .select(
      "system_prompt, default_model, task_model_overrides, task_prompt_overrides, updated_at",
    )
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

  const rawPromptOverrides = (data?.task_prompt_overrides ?? {}) as Record<
    string,
    unknown
  >;
  const initialPromptOverrides: Record<string, string> = {};
  for (const id of EDITABLE_PROMPT_IDS) {
    const v = rawPromptOverrides[id];
    if (typeof v === "string") initialPromptOverrides[id] = v;
  }
  const promptEntries = EDITABLE_PROMPT_IDS.map((id) => ({
    id,
    label: PROMPT_LABELS[id],
    placeholder: EDITABLE_DEFAULT_STRATEGIES[id],
  }));

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
        promptEntries={promptEntries}
        initialPromptOverrides={initialPromptOverrides}
        lastUpdatedAt={data?.updated_at ?? null}
      />
    </>
  );
}
