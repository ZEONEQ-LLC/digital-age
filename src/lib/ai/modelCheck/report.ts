// Modell-Check: Kosten pro Aufgabe und Empfehlungen (rein, ohne DB und ohne
// "server-only", damit der Test es laden kann). Datenbeschaffung in run.ts,
// Anzeige unter /autor/admin/ai-config/modell-check.
//
// Grundsatz (Notion-Karte «Modell-Check», 26.10.2026): Listenpreise allein
// fuehren in die Irre, massgeblich sind die gemessenen Tokens pro Aufgabe.
// Prognosen fuer ein anderes Modell rechnen mit denselben Tokens und sind
// darum nur «ca.» (anderer Tokenizer, Thinking-Tokens zaehlen als Output).

import { AI_TASKS, type AiTask } from "@/lib/ai/types";
import { resolveTaskModel } from "@/lib/ai/taskModel";

export type ModelClass = "haiku" | "sonnet" | "opus" | "fable" | "other";
export type ModelStatus = "active" | "deprecated" | "retired";

export type CatalogModel = {
  modelId: string;
  label: string;
  modelClass: ModelClass;
  // USD pro Million Tokens; null = Preis fehlt.
  inputPerMTok: number | null;
  outputPerMTok: number | null;
  // Ab so vielen Prompt-Tokens gelten die *Long-Preise (Haiku 5.5: 100k).
  longPromptThreshold: number | null;
  inputPerMTokLong: number | null;
  outputPerMTokLong: number | null;
  status: ModelStatus;
  retirementDate: string | null; // YYYY-MM-DD
  replacementModelId: string | null;
  releasedAt: string | null; // YYYY-MM-DD
  vision: boolean | null;
};

export type UsageRow = {
  task: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
};

export type TaskStats = {
  // Aufrufe mit Tokens im Fenster, hochgerechnet auf 30 Tage.
  callsPerMonth: number;
  calls: number;
  avgInput: number;
  avgOutput: number;
  // true: Durchschnitt nur aus Aufrufen mit dem aktuellen Modell (gemessen);
  // false: aus allen Aufrufen der Aufgabe (Prognose, z.B. nach einem Wechsel).
  measured: boolean;
};

export type RecommendationKind = "pflicht" | "upgrade" | "qualitaet" | "sparen";

export type Recommendation = {
  kind: RecommendationKind;
  targetModel: string;
  reason: string;
  // Kosten pro Monat mit dem Ziel-Modell und Delta zum aktuellen (null, wenn
  // ein Preis fehlt oder die Aufgabe keine Aufrufe hatte).
  targetCostPerMonth: number | null;
  deltaPct: number | null;
  deltaUsdPerMonth: number | null;
  // Vor dem Wechsel an echten Beispielen pruefen (Sparen/Qualitaet).
  needsComparison: boolean;
};

export type TaskReport = {
  task: AiTask;
  currentModel: string | null;
  stats: TaskStats | null;
  costPerMonth: number | null;
  recommendations: Recommendation[];
};

export type Finding = {
  // Stabiler Schluessel fuer den Vergleich zwischen Laeufen (Mail nur bei Neuem).
  key: string;
  level: "warn" | "info";
  message: string;
};

export const USAGE_WINDOW_DAYS = 60;
// Unter diesem Ø-Output gilt eine Aufgabe als «kurz» (Regel Sparen).
export const SHORT_OUTPUT_TOKENS = 100;
// Ab so vielen Aufrufen mit dem aktuellen Modell gilt der Schnitt als gemessen.
export const MIN_MEASURED_CALLS = 3;

// Urteilsintensive Aufgaben: laufen sie auf Haiku, schlaegt die Regel
// «Qualitaet» eine Klasse hoeher vor. Bewusst nicht dabei: News-Ticker
// (Haiku 5.5 gewollt), Hero-Vorschlaege (Haiku wegen 30-s-Timeout).
export const JUDGMENT_TASKS: readonly AiTask[] = ["seo_pipeline", "seo_review", "highlight_suggestions", "tone_check"];
// Aufgaben mit Bild-Input: nur Modelle mit Vision vorschlagen.
export const VISION_TASKS: readonly AiTask[] = ["image_alt"];

const CLASS_ORDER: ModelClass[] = ["haiku", "sonnet", "opus", "fable"];

// Datums-Suffix der Models API abschneiden (claude-haiku-4-5-20251001 →
// claude-haiku-4-5), damit API-IDs auf die Aliase in Katalog und Log passen.
export function normalizeModelId(id: string): string {
  return id.trim().replace(/-\d{8}$/, "");
}

export function classFromModelId(id: string): ModelClass {
  const m = id.match(/claude-(haiku|sonnet|opus|fable)\b/);
  return (m?.[1] as ModelClass | undefined) ?? "other";
}

export function costPerCall(model: CatalogModel | undefined, avgInput: number, avgOutput: number): number | null {
  if (!model || model.inputPerMTok === null || model.outputPerMTok === null) return null;
  const long =
    model.longPromptThreshold !== null && avgInput > model.longPromptThreshold &&
    model.inputPerMTokLong !== null && model.outputPerMTokLong !== null;
  const inP = long ? model.inputPerMTokLong! : model.inputPerMTok;
  const outP = long ? model.outputPerMTokLong! : model.outputPerMTok;
  return (avgInput * inP + avgOutput * outP) / 1_000_000;
}

export function taskStats(rows: UsageRow[], task: string, currentModel: string | null, windowDays = USAGE_WINDOW_DAYS): TaskStats | null {
  // Fehlversuche (0/0 Tokens) kosten nichts und verzerren den Schnitt.
  const all = rows.filter((r) => r.task === task && r.input_tokens + r.output_tokens > 0);
  if (all.length === 0) return null;
  const onCurrent = currentModel ? all.filter((r) => r.model === currentModel) : [];
  const measured = onCurrent.length >= MIN_MEASURED_CALLS;
  const basis = measured ? onCurrent : all;
  const sum = basis.reduce((a, r) => ({ i: a.i + r.input_tokens, o: a.o + r.output_tokens }), { i: 0, o: 0 });
  return {
    calls: all.length,
    callsPerMonth: (all.length * 30) / windowDays,
    avgInput: sum.i / basis.length,
    avgOutput: sum.o / basis.length,
    measured,
  };
}

function newer(a: CatalogModel, b: CatalogModel): boolean {
  return (a.releasedAt ?? "") > (b.releasedAt ?? "");
}

// Neuestes aktives, waehlbares Modell einer Klasse (mit Preis).
function newestInClass(candidates: CatalogModel[], cls: ModelClass): CatalogModel | undefined {
  return candidates
    .filter((m) => m.modelClass === cls)
    .sort((a, b) => (b.releasedAt ?? "").localeCompare(a.releasedAt ?? ""))[0];
}

function withCost(
  base: Omit<Recommendation, "targetCostPerMonth" | "deltaPct" | "deltaUsdPerMonth">,
  target: CatalogModel | undefined,
  stats: TaskStats | null,
  currentCostPerCall: number | null,
): Recommendation {
  const tCall = stats ? costPerCall(target, stats.avgInput, stats.avgOutput) : null;
  const targetCostPerMonth = tCall !== null && stats ? tCall * stats.callsPerMonth : null;
  const deltaPct = tCall !== null && currentCostPerCall ? ((tCall - currentCostPerCall) / currentCostPerCall) * 100 : null;
  const deltaUsdPerMonth = tCall !== null && currentCostPerCall !== null && stats ? (tCall - currentCostPerCall) * stats.callsPerMonth : null;
  return { ...base, targetCostPerMonth, deltaPct, deltaUsdPerMonth };
}

export function recommendForTask(args: {
  task: AiTask;
  currentModel: string | null;
  stats: TaskStats | null;
  catalog: Map<string, CatalogModel>;
  selectable: ReadonlySet<string>;
}): Recommendation[] {
  const { task, currentModel, stats, catalog, selectable } = args;
  if (!currentModel) return [];
  const current = catalog.get(currentModel);
  const vision = VISION_TASKS.includes(task);
  const candidates = [...catalog.values()].filter(
    (m) =>
      m.modelId !== currentModel &&
      selectable.has(m.modelId) &&
      m.status === "active" &&
      m.inputPerMTok !== null &&
      m.outputPerMTok !== null &&
      (!vision || m.vision !== false),
  );
  const curCall = stats ? costPerCall(current, stats.avgInput, stats.avgOutput) : null;
  const recs: Recommendation[] = [];

  // 1. Pflicht: abgekuendigt oder Abschaltdatum bekannt.
  if (current && (current.status !== "active" || current.retirementDate)) {
    const repl =
      (current.replacementModelId && candidates.find((m) => m.modelId === current.replacementModelId)) ||
      newestInClass(candidates, current.modelClass);
    if (repl) {
      const when = current.retirementDate ? ` am ${formatDate(current.retirementDate)}` : "";
      const what = current.status === "retired" ? "ist abgeschaltet" : `wird${when} abgeschaltet`;
      recs.push(withCost({ kind: "pflicht", targetModel: repl.modelId, reason: `${current.label || current.modelId} ${what}.`, needsComparison: false }, repl, stats, curCall));
    }
  }

  // 2. Gratis-Upgrade: neueres Modell derselben Klasse, Kosten gleich oder tiefer.
  if (current && current.status === "active") {
    const up = candidates
      .filter((m) => m.modelClass === current.modelClass && newer(m, current))
      .filter((m) => {
        if (stats) {
          const c = costPerCall(m, stats.avgInput, stats.avgOutput);
          return c !== null && curCall !== null && c <= curCall;
        }
        // Ohne Aufrufe: Listenpreise vergleichen.
        return current.inputPerMTok !== null && current.outputPerMTok !== null &&
          m.inputPerMTok! <= current.inputPerMTok && m.outputPerMTok! <= current.outputPerMTok;
      })
      .sort((a, b) => (b.releasedAt ?? "").localeCompare(a.releasedAt ?? ""))[0];
    if (up) {
      recs.push(withCost({ kind: "upgrade", targetModel: up.modelId, reason: `Neueres Modell derselben Klasse, nicht teurer.`, needsComparison: false }, up, stats, curCall));
    }
  }

  // 3. Qualitaet: urteilsintensive Aufgabe auf Haiku → eine Klasse hoeher.
  if (current && current.modelClass === "haiku" && JUDGMENT_TASKS.includes(task)) {
    const next = newestInClass(candidates, "sonnet");
    if (next) {
      recs.push(withCost({ kind: "qualitaet", targetModel: next.modelId, reason: "Urteilsintensive Aufgabe läuft auf Haiku.", needsComparison: true }, next, stats, curCall));
    }
  }

  // 4. Sparen: kurzer Output auf Sonnet, Opus oder Fable → Haiku.
  if (current && stats && stats.avgOutput < SHORT_OUTPUT_TOKENS && CLASS_ORDER.indexOf(current.modelClass) > 0) {
    const haiku = newestInClass(candidates, "haiku");
    if (haiku) {
      recs.push(withCost({ kind: "sparen", targetModel: haiku.modelId, reason: `Kurze Antworten (Ø ${Math.round(stats.avgOutput)} Output-Tokens) auf ${labelOf(current)}.`, needsComparison: true }, haiku, stats, curCall));
    }
  }

  return recs;
}

function labelOf(m: CatalogModel): string {
  return m.label || m.modelId;
}

export function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

export function buildReport(args: {
  catalog: CatalogModel[];
  usage: UsageRow[];
  defaultModel: string | undefined;
  overrides: Record<string, unknown>;
  selectable: ReadonlySet<string>;
}): { tasks: TaskReport[]; findings: Finding[] } {
  const catalog = new Map(args.catalog.map((m) => [m.modelId, m]));
  const tasks: TaskReport[] = AI_TASKS.map((task) => {
    const currentModel = resolveTaskModel(task, args.overrides[task], args.defaultModel) ?? null;
    const stats = taskStats(args.usage, task, currentModel);
    const perCall = stats && currentModel ? costPerCall(catalog.get(currentModel), stats.avgInput, stats.avgOutput) : null;
    return {
      task,
      currentModel,
      stats,
      costPerMonth: perCall !== null && stats ? perCall * stats.callsPerMonth : null,
      recommendations: recommendForTask({ task, currentModel, stats, catalog, selectable: args.selectable }),
    };
  });

  const findings: Finding[] = [];
  const inUse = new Set(tasks.map((t) => t.currentModel).filter((m): m is string => !!m));
  for (const id of inUse) {
    const m = catalog.get(id);
    if (m && (m.status !== "active" || m.retirementDate)) {
      const when = m.retirementDate ? ` (Abschaltung ${formatDate(m.retirementDate)})` : "";
      findings.push({ key: `deprecated:${id}`, level: "warn", message: `${labelOf(m)} ist ${m.status === "retired" ? "abgeschaltet" : "abgekündigt"}${when} und noch im Einsatz.` });
    }
  }
  for (const id of new Set([...args.selectable, ...inUse])) {
    const m = catalog.get(id);
    if (!m) {
      findings.push({ key: `missing:${id}`, level: "warn", message: `${id} fehlt im Katalog, Kosten unbekannt.` });
    } else if (m.inputPerMTok === null || m.outputPerMTok === null) {
      findings.push({ key: `price:${id}`, level: "warn", message: `Preis fehlt für ${labelOf(m)} (unten im Katalog eintragen).` });
    }
  }
  // Neuere Modelle, die (noch) nicht waehlbar sind: Aufnahme in models.ts ist
  // eine Code-Aenderung, darum nur Hinweis.
  const newestSelectable = new Map<ModelClass, string>();
  for (const id of args.selectable) {
    const m = catalog.get(id);
    if (m?.releasedAt && (newestSelectable.get(m.modelClass) ?? "") < m.releasedAt) {
      newestSelectable.set(m.modelClass, m.releasedAt);
    }
  }
  for (const m of catalog.values()) {
    if (args.selectable.has(m.modelId) || m.status !== "active" || !m.releasedAt) continue;
    const top = newestSelectable.get(m.modelClass);
    if (top && m.releasedAt > top) {
      const price = m.inputPerMTok === null || m.outputPerMTok === null ? " Preis fehlt noch." : "";
      findings.push({
        key: `newer:${m.modelId}`,
        level: "info",
        message: `${labelOf(m)} ist neuer als die Modelle in der Auswahl und noch nicht wählbar (src/lib/ai/models.ts).${price}`,
      });
    }
  }
  return { tasks, findings };
}

// Hinweise zum selben Modell nur einmal: «new:X» (aus dem API-Abgleich)
// entfaellt, wenn der Bericht schon einen Hinweis zu X hat (z.B. «newer:X»).
export function dedupeFindings<T extends { key: string }>(items: T[]): T[] {
  const idOf = (k: string) => k.slice(k.indexOf(":") + 1);
  const covered = new Set(items.filter((i) => !i.key.startsWith("new:") && !i.key.startsWith("rec:")).map((i) => idOf(i.key)));
  return items.filter((i) => !(i.key.startsWith("new:") && covered.has(idOf(i.key))));
}

// Schluessel aller Empfehlungen eines Berichts (Mail nur bei neuen).
export function recommendationKeys(tasks: TaskReport[]): string[] {
  return tasks.flatMap((t) => t.recommendations.map((r) => `rec:${t.task}:${r.kind}:${r.targetModel}`));
}

export function formatUsd(v: number): string {
  if (v === 0) return "0.00 USD";
  const abs = Math.abs(v);
  const s = abs < 0.01 ? "< 0.01" : abs.toFixed(2);
  return `${v < 0 && abs >= 0.01 ? "−" : ""}${s} USD`;
}

// «−95 % = −0.12 USD/Monat»; null-Teile entfallen.
export function formatDelta(r: Pick<Recommendation, "deltaPct" | "deltaUsdPerMonth">): string | null {
  if (r.deltaPct === null) return null;
  const pct = `${r.deltaPct > 0 ? "+" : r.deltaPct < 0 ? "−" : "±"}${Math.abs(Math.round(r.deltaPct))} %`;
  if (r.deltaUsdPerMonth === null) return `ca. ${pct}`;
  const usd = Math.abs(r.deltaUsdPerMonth) < 0.01
    ? "unter 0.01 USD/Monat"
    : `${r.deltaUsdPerMonth > 0 ? "+" : "−"}${Math.abs(r.deltaUsdPerMonth).toFixed(2)} USD/Monat`;
  return `ca. ${pct} = ${usd}`;
}
