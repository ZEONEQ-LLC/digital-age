import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { createServiceClient } from "@/lib/supabase/service";
import { KNOWN_MODEL_IDS } from "@/lib/ai/models";
import { TASK_LABELS } from "@/lib/ai/taskLabels";
import {
  buildReport,
  classFromModelId,
  dedupeFindings,
  formatDelta,
  normalizeModelId,
  USAGE_WINDOW_DAYS,
  type CatalogModel,
  type Finding,
  type ModelStatus,
  type TaskReport,
  type UsageRow,
} from "./report";
import { sendModelCheckMail } from "./mail";

// Modell-Check: Daten laden (Katalog, Kostenlog, AI-Konfiguration), mit der
// Models API abgleichen, Lauf protokollieren, bei Neuem eine Mail schicken.
// Kein Auto-Wechsel: gewechselt wird nur per Klick im Admin.

type Sb = SupabaseClient<Database>;
type CatalogRow = Database["public"]["Tables"]["ai_model_catalog"]["Row"];

const STATUSES: readonly ModelStatus[] = ["active", "deprecated", "retired"];

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function catalogFromRow(r: CatalogRow): CatalogModel {
  const cls = r.model_class;
  return {
    modelId: r.model_id,
    label: r.label,
    modelClass: cls === "haiku" || cls === "sonnet" || cls === "opus" || cls === "fable" ? cls : "other",
    inputPerMTok: num(r.input_usd_per_mtok),
    outputPerMTok: num(r.output_usd_per_mtok),
    longPromptThreshold: num(r.long_prompt_threshold),
    inputPerMTokLong: num(r.input_usd_per_mtok_long),
    outputPerMTokLong: num(r.output_usd_per_mtok_long),
    status: (STATUSES as readonly string[]).includes(r.status) ? (r.status as ModelStatus) : "active",
    retirementDate: r.retirement_date,
    replacementModelId: r.replacement_model_id,
    releasedAt: r.released_at,
    vision: r.vision,
  };
}

export type ModelCheckInputs = {
  catalogRows: CatalogRow[];
  catalog: CatalogModel[];
  usage: UsageRow[];
  defaultModel: string | undefined;
  overrides: Record<string, unknown>;
};

// Mit Session-Client (Admin-Seite, RLS: nur Editoren) oder Service-Client (Cron).
export async function loadModelCheckInputs(sb: Sb): Promise<ModelCheckInputs> {
  const since = new Date(Date.now() - USAGE_WINDOW_DAYS * 86_400_000).toISOString();
  const [cat, usage, cfg] = await Promise.all([
    sb.from("ai_model_catalog").select("*").order("model_class").order("released_at", { ascending: false, nullsFirst: false }),
    sb.from("ai_usage_log").select("task, model, input_tokens, output_tokens").gte("created_at", since).limit(10_000),
    sb.from("ai_config").select("default_model, task_model_overrides").eq("id", "global").maybeSingle(),
  ]);
  if (cat.error) throw new Error(`Katalog nicht lesbar: ${cat.error.message}`);
  if (usage.error) throw new Error(`Kostenlog nicht lesbar: ${usage.error.message}`);
  if (cfg.error) throw new Error(`AI-Konfiguration nicht lesbar: ${cfg.error.message}`);
  const raw = cfg.data?.task_model_overrides;
  return {
    catalogRows: cat.data ?? [],
    catalog: (cat.data ?? []).map(catalogFromRow),
    usage: usage.data ?? [],
    defaultModel: cfg.data?.default_model ?? undefined,
    overrides: raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {},
  };
}

export function reportFromInputs(inputs: ModelCheckInputs): { tasks: TaskReport[]; findings: Finding[] } {
  return buildReport({
    catalog: inputs.catalog,
    usage: inputs.usage,
    defaultModel: inputs.defaultModel,
    overrides: inputs.overrides,
    selectable: KNOWN_MODEL_IDS,
  });
}

type ApiModel = { id: string; displayName: string; releasedAt: string | null; vision: boolean | null };

async function fetchApiModels(): Promise<ApiModel[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY fehlt");
  const client = new Anthropic({ apiKey });
  const out: ApiModel[] = [];
  for await (const m of client.models.list({ limit: 100 })) {
    const d = m.created_at ? m.created_at.slice(0, 10) : null;
    out.push({
      id: m.id,
      displayName: m.display_name,
      // Epoch heisst «Datum unbekannt».
      releasedAt: d && d > "1971-01-01" ? d : null,
      vision: m.capabilities?.image_input?.supported ?? null,
    });
  }
  return out;
}

// Neu erkannte Modelle gelten als erwaehnenswert, wenn sie juenger als das
// sind (aeltere tauchen beim ersten Abgleich nur als Katalogzeile auf).
const NEW_MODEL_MAX_AGE_DAYS = 180;

export type RunItem = { key: string; level: "warn" | "info" | "rec"; message: string };

export type ModelCheckRunResult = {
  items: RunItem[];
  newItems: RunItem[];
  errors: string[];
  modelsSeen: string[];
  notified: boolean;
};

function recItems(tasks: TaskReport[], labels: Map<string, string>): RunItem[] {
  return tasks.flatMap((t) =>
    t.recommendations.map((r) => {
      const delta = formatDelta(r);
      const target = labels.get(r.targetModel) ?? r.targetModel;
      const current = t.currentModel ? labels.get(t.currentModel) ?? t.currentModel : "–";
      return {
        key: `rec:${t.task}:${r.kind}:${r.targetModel}`,
        level: "rec" as const,
        message: `${TASK_LABELS[t.task]}: ${target} statt ${current}${delta ? ` → ${delta}` : ""}. ${r.reason}${r.needsComparison ? " Vor dem Wechsel testen." : ""}`,
      };
    }),
  );
}

export async function runModelCheck(trigger: "cron" | "manual"): Promise<ModelCheckRunResult> {
  const sb = createServiceClient();
  const errors: string[] = [];
  const apiItems: RunItem[] = [];
  let modelsSeen: string[] = [];

  let inputs = await loadModelCheckInputs(sb);

  // 1. Abgleich mit der Models API (Preise liefert sie nicht).
  try {
    const api = await fetchApiModels();
    modelsSeen = api.map((m) => m.id);
    const byId = new Map(inputs.catalog.map((m) => [m.modelId, m]));
    const now = new Date().toISOString();
    const seenNormalized = new Set<string>();
    for (const m of api) {
      const id = normalizeModelId(m.id);
      seenNormalized.add(id);
      if (byId.has(id)) {
        const patch: Database["public"]["Tables"]["ai_model_catalog"]["Update"] = { seen_in_api_at: now };
        if (m.releasedAt) patch.released_at = m.releasedAt;
        if (m.vision !== null) patch.vision = m.vision;
        const { error } = await sb.from("ai_model_catalog").update(patch).eq("model_id", id);
        if (error) errors.push(`Katalog-Update ${id}: ${error.message}`);
      } else {
        const { error } = await sb.from("ai_model_catalog").insert({
          model_id: id,
          label: m.displayName,
          model_class: classFromModelId(id),
          released_at: m.releasedAt,
          vision: m.vision,
          source: "Models API",
          seen_in_api_at: now,
        });
        if (error) {
          errors.push(`Katalog-Insert ${id}: ${error.message}`);
        } else if (m.releasedAt && Date.now() - new Date(m.releasedAt).getTime() < NEW_MODEL_MAX_AGE_DAYS * 86_400_000) {
          apiItems.push({ key: `new:${id}`, level: "info", message: `Neues Modell in der Models API: ${m.displayName} (${id}). Preis fehlt, bitte im Katalog eintragen.` });
        }
      }
    }
    // Waehlbare Modelle, die die API nicht mehr kennt: vermutlich abgeschaltet.
    for (const id of KNOWN_MODEL_IDS) {
      if (!seenNormalized.has(id)) {
        apiItems.push({ key: `gone:${id}`, level: "warn", message: `${id} steht in der Auswahl, fehlt aber in der Models API (abgeschaltet oder umbenannt?).` });
      }
    }
    inputs = await loadModelCheckInputs(sb);
  } catch (err) {
    errors.push(`Models API: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Kosten und Empfehlungen.
  const report = reportFromInputs(inputs);
  const labels = new Map(inputs.catalog.map((m) => [m.modelId, m.label || m.modelId]));
  const items: RunItem[] = dedupeFindings([
    ...recItems(report.tasks, labels),
    ...report.findings.map((f) => ({ key: f.key, level: f.level, message: f.message })),
    ...apiItems,
  ]);

  // 3. Neu gegenueber dem letzten Lauf (Empfehlungen, Hinweise, Fehler).
  const { data: prev } = await sb
    .from("ai_model_check_runs")
    .select("items, errors")
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const prevKeys = new Set<string>(
    Array.isArray(prev?.items) ? (prev.items as { key?: unknown }[]).map((i) => String(i?.key ?? "")) : [],
  );
  const prevErrors = new Set<string>(Array.isArray(prev?.errors) ? (prev.errors as unknown[]).map(String) : []);
  const newItems = items.filter((i) => !prevKeys.has(i.key));
  const newErrors = errors.filter((e) => !prevErrors.has(e));

  // 4. Mail nur beim Cron und nur bei Neuem (keine leere Wochenmail).
  let notified = false;
  if (trigger === "cron" && (newItems.length > 0 || newErrors.length > 0)) {
    const res = await sendModelCheckMail({ newItems, errors: newErrors, totalItems: items.length });
    notified = res.ok;
    if (!res.ok) errors.push(`Mail: ${res.error}`);
  }

  const { error: insErr } = await sb.from("ai_model_check_runs").insert({
    trigger,
    items: items as unknown as Json,
    errors: errors as unknown as Json,
    models_seen: modelsSeen,
    notified,
  });
  if (insErr) errors.push(`Lauf nicht gespeichert: ${insErr.message}`);

  return { items, newItems, errors, modelsSeen, notified };
}
