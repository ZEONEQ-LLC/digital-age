import Link from "next/link";
import PageTitle from "@/components/author/PageTitle";
import { createClient } from "@/lib/supabase/server";
import type { AiTask } from "@/lib/ai/types";
import {
  EDITABLE_PROMPT_IDS,
  EDITABLE_DEFAULT_STRATEGIES,
  type EditablePromptId,
} from "@/lib/ai/promptRegistry";
import { TASK_LABELS } from "@/lib/ai/taskLabels";
import AiConfigClient from "./AiConfigClient";

// Editierbare Strategie-Prompts (Prompt-ID → UI-Label). Placeholder = der
// Code-Default aus der Registry; leeres Feld = Code-Standard.
const PROMPT_LABELS: Record<EditablePromptId, string> = {
  seo_keyword_candidates: "SEO — Keyword-Kandidaten (Stufe 1)",
  seo_derive: "SEO — Ableitung aus Keyword (Stufe 2)",
  seo_review: "SEO — Verbesserungsvorschläge (Analyse)",
  abstract_generate: "Abstract generieren",
  highlight_suggestions: "Highlight-Vorschläge",
  image_alt: "Bild-ALT-Texte",
  hero_proposals: "Hero Studio — Vorschläge",
  social_posts: "Hero Studio — Posttexte",
  newsletter_draft: "Newsletter-Entwurf",
};

// Visuelle Gruppierung der Tasks auf dieser Seite. Reihenfolge im Array =
// Reihenfolge in der UI. Jede Task gehört genau einer Gruppe an, ausser den
// Tasks mit eigener Modellwahl (TASKS_WITH_OWN_MODEL_SETTING: News-Ticker,
// gewählt unter /autor/news-ticker).
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
      "abstract_generate",
      "highlight_suggestions",
      "image_alt",
    ],
  },
  {
    id: "podcasts",
    label: "Podcasts",
    tasks: ["podcast_ingest"],
  },
  {
    id: "hero",
    label: "Hero Studio",
    tasks: ["hero_proposals", "social_posts"],
  },
  {
    id: "newsletter",
    label: "Newsletter",
    tasks: ["newsletter_draft"],
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
        subtitle="Systemprompt, Standard-Modell, Modell pro Aufgabe und Task-Prompts. Änderungen wirken sofort, kein Redeploy nötig. Das Modell für den News-Ticker wählst du unter News-Ticker."
        right={
          <Link
            href="/autor/admin/ai-config/modell-check"
            style={{
              color: "var(--da-green)",
              border: "1px solid var(--da-green)",
              borderRadius: 4,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Modell-Check: Kosten und Empfehlungen →
          </Link>
        }
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
