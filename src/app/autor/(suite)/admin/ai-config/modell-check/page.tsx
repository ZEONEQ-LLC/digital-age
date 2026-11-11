import Link from "next/link";
import PageTitle from "@/components/author/PageTitle";
import { createClient } from "@/lib/supabase/server";
import { KNOWN_MODEL_IDS } from "@/lib/ai/models";
import { TASK_LABELS } from "@/lib/ai/taskLabels";
import { dedupeFindings, formatDate, formatDelta, USAGE_WINDOW_DAYS } from "@/lib/ai/modelCheck/report";
import { loadModelCheckInputs, reportFromInputs } from "@/lib/ai/modelCheck/run";
import ModelCheckClient, { type CatalogView, type FindingView, type TaskRowView } from "./ModelCheckClient";

// Modell-Check (Erweiterung der AI-Konfiguration): Kosten pro Aufgabe aus dem
// Kostenlog, Empfehlungen nach vier Regeln, Katalog mit Preisen. Rechnet live
// aus der DB (Session-Client, RLS: nur Editoren); der woechentliche Lauf
// ergaenzt den Abgleich mit der Models API und die Mail.

export const dynamic = "force-dynamic";

const KIND_LABEL = { pflicht: "Pflicht", upgrade: "Gratis-Upgrade", qualitaet: "Qualität", sparen: "Sparen" } as const;

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("de-CH", {
    timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Modelle ohne Preis, die aelter sind, landen eingeklappt unter «Ältere Modelle».
const RECENT_DAYS = 365;

function olderThanDays(isoDate: string, days: number): boolean {
  return Date.now() - new Date(isoDate).getTime() > days * 86_400_000;
}

export default async function ModelCheckPage() {
  const supabase = await createClient();
  let loadError: string | null = null;
  let inputs: Awaited<ReturnType<typeof loadModelCheckInputs>> | null = null;
  try {
    inputs = await loadModelCheckInputs(supabase);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Daten nicht lesbar.";
  }
  const { data: lastRun } = await supabase
    .from("ai_model_check_runs")
    .select("ran_at, trigger, items, errors")
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const labels = new Map((inputs?.catalog ?? []).map((m) => [m.modelId, m.label || m.modelId]));
  const label = (id: string | null) => (id ? labels.get(id) ?? id : "–");
  const report = inputs ? reportFromInputs(inputs) : { tasks: [], findings: [] };

  const rows: TaskRowView[] = report.tasks
    .map((t) => ({
      task: t.task,
      label: TASK_LABELS[t.task],
      currentModel: t.currentModel,
      currentLabel: label(t.currentModel),
      callsPerMonth: t.stats?.callsPerMonth ?? 0,
      avgInput: t.stats ? Math.round(t.stats.avgInput) : null,
      avgOutput: t.stats ? Math.round(t.stats.avgOutput) : null,
      measured: t.stats?.measured ?? false,
      costPerMonth: t.costPerMonth,
      recs: t.recommendations.map((r) => ({
        kind: r.kind,
        kindLabel: KIND_LABEL[r.kind],
        targetModel: r.targetModel,
        targetLabel: label(r.targetModel),
        reason: r.reason,
        delta: formatDelta(r),
        needsComparison: r.needsComparison,
      })),
    }))
    .sort((a, b) =>
      (b.recs.length > 0 ? 1 : 0) - (a.recs.length > 0 ? 1 : 0) ||
      (b.costPerMonth ?? -1) - (a.costPerMonth ?? -1) ||
      b.callsPerMonth - a.callsPerMonth ||
      a.label.localeCompare(b.label, "de"),
    );

  // Live-Hinweise plus die API-Hinweise des letzten Laufs (neu/verschwunden).
  const apiFindings: FindingView[] = Array.isArray(lastRun?.items)
    ? (lastRun.items as { key?: unknown; level?: unknown; message?: unknown }[])
        .filter((i) => typeof i?.key === "string" && /^(new|gone):/.test(i.key) && typeof i.message === "string")
        .map((i) => ({ key: String(i.key), level: i.level === "warn" ? "warn" : "info", message: String(i.message) }))
    : [];
  const findings: FindingView[] = dedupeFindings([...report.findings, ...apiFindings]);

  const seenInApi = new Map((inputs?.catalogRows ?? []).map((r) => [r.model_id, r.seen_in_api_at]));
  const catalog: CatalogView[] = (inputs?.catalog ?? []).map((m) => {
    const seen = seenInApi.get(m.modelId);
    return {
      modelId: m.modelId,
      label: m.label || m.modelId,
      modelClass: m.modelClass,
      inputPerMTok: m.inputPerMTok,
      outputPerMTok: m.outputPerMTok,
      longTier:
        m.longPromptThreshold && m.inputPerMTokLong !== null && m.outputPerMTokLong !== null
          ? `ab ${Math.round(m.longPromptThreshold / 1000)}k Prompt-Tokens: ${m.inputPerMTokLong} / ${m.outputPerMTokLong}`
          : null,
      status: m.status,
      retirementDate: m.retirementDate ?? "",
      releasedLabel: m.releasedAt ? formatDate(m.releasedAt) : "–",
      seenLabel: seen ? formatDate(seen.slice(0, 10)) : "–",
      selectable: KNOWN_MODEL_IDS.has(m.modelId),
      inUse: report.tasks.some((t) => t.currentModel === m.modelId),
      recent: !m.releasedAt || olderThanDays(m.releasedAt, RECENT_DAYS) === false,
    };
  });

  const runInfo = lastRun
    ? {
        label: `${fmtDateTime(lastRun.ran_at)} (${lastRun.trigger === "cron" ? "automatisch" : "von Hand"})`,
        errors: Array.isArray(lastRun.errors) ? (lastRun.errors as unknown[]).map(String) : [],
      }
    : null;

  return (
    <>
      <PageTitle
        title="Modell-Check"
        subtitle="Kosten pro KI-Aufgabe und Empfehlungen. Prüft wöchentlich (Montag früh) und mailt nur bei Neuem. Gewechselt wird nur per Klick."
      />
      <p style={{ margin: "-16px 0 24px", fontSize: 13 }}>
        <Link href="/autor/admin/ai-config" style={{ color: "var(--da-green)", textDecoration: "underline", textUnderlineOffset: 2 }}>
          ← Zur AI-Konfiguration
        </Link>
      </p>
      <ModelCheckClient
        rows={rows}
        findings={findings}
        catalog={catalog}
        runInfo={runInfo}
        loadError={loadError}
        windowDays={USAGE_WINDOW_DAYS}
      />
    </>
  );
}
