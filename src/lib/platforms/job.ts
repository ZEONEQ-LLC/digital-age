import "server-only";

import { revalidatePath } from "next/cache";
import AiJobReport, { type AiJobReportLine } from "@/emails/AiJobReport";
import { getPromptOverride } from "@/lib/ai/promptOverrides";
import { callLLMForAuthor } from "@/lib/ai/systemCall";
import { resolveSystemAuthorId } from "@/lib/ai/systemAuthor";
import { notifyEditor } from "@/lib/aiJobs/notify";
import { finishRun, startRun, type JobSummary, type RunStatus } from "@/lib/aiJobs/runs";
import { SITE_URL } from "@/lib/newsletter/mail";
import {
  buildResearchPrompt,
  parseResearch,
  slugifyPlatform,
  type PlatformFields,
  type PlatformForResearch,
} from "@/lib/platforms/research";
import type { Json } from "@/lib/database.types";
import { createServiceClient } from "@/lib/supabase/service";

// Woechentliche Pruefung der KI-Plattformen (Wunsch Ali 12.11.2026):
// vollstaendig automatisch, ohne Freigabe. Claude prueft per Websuche Links,
// Preise und Hosting, ergaenzt bis zu drei Plattformen und archiviert
// eingestellte. Jede Aenderung landet mit Vorher/Nachher in
// ai_platform_changes (Rueckgaengig im Admin), danach eine Mail an die
// Redaktion. Gesperrte Eintraege (locked) fasst der Job nicht an.

export type PlatformRunResult = {
  runId: string | null;
  busy?: boolean;
  updates: number;
  additions: number;
  archived: number;
  checked: number;
  errors: string[];
};

const ADMIN_PATH = "/autor/admin/ki-plattformen";
const FIELD_LABEL: Record<keyof PlatformFields, string> = { name: "Name", category: "Kategorie", tagline: "Beschreibung", hosting: "Hosting", pricing: "Preis", url: "Link" };

type Row = PlatformForResearch & { id: string };

function snapshot(r: Row): { [key: string]: Json } {
  return { name: r.name, category: r.category, tagline: r.tagline, hosting: r.hosting, pricing: r.pricing, url: r.url, status: r.status };
}

export async function runPlatformResearch(trigger: "cron" | "manual", authorId: string | null): Promise<PlatformRunResult> {
  const svc = createServiceClient();
  const errors: string[] = [];
  const empty = { updates: 0, additions: 0, archived: 0, checked: 0 };
  const started = await startRun(svc, "platform_research", trigger);
  if ("busy" in started) return { runId: null, busy: true, ...empty, errors: ["Ein Lauf ist bereits aktiv."] };
  if ("error" in started) return { runId: null, ...empty, errors: [started.error] };
  const { runId } = started;
  const finish = (status: RunStatus, summary: JobSummary) => finishRun(svc, runId, status, summary, errors);
  // Abbruch ohne Aenderung: Lauf als Fehler speichern, beim Cron Mail an die
  // Redaktion (beim Klick im Admin steht der Fehler direkt auf der Seite).
  const fail = async (message: string, summary: JobSummary = {}): Promise<PlatformRunResult> => {
    errors.push(message);
    await finish("error", summary);
    if (trigger === "cron") {
      await notifyEditor("KI-Plattformen: Prüfung fehlgeschlagen", AiJobReport({
        heading: "Die wöchentliche Prüfung der KI-Plattformen ist fehlgeschlagen.",
        intro: "Es wurde nichts geändert. Der nächste Lauf versucht es erneut; im Admin kannst du sie auch von Hand starten.",
        sections: [], errors, adminUrl: `${SITE_URL}${ADMIN_PATH}`, adminLabel: "Zum Admin →",
      }));
    }
    return { runId, ...empty, errors };
  };

  const { data: rows, error } = await svc.from("ai_platforms").select("id, slug, name, category, tagline, hosting, pricing, url, status, locked");
  if (error || !rows) return fail(`Plattformen nicht lesbar: ${error?.message ?? "leer"}`);
  const current = rows as unknown as Row[];

  const author = authorId ?? (await resolveSystemAuthorId(svc, "AI_JOBS_AUTHOR_ID"));
  if (!author) return fail("Kein Editor für die KI-Kosten gefunden.");
  const strategy = await getPromptOverride("platform_research", svc);
  const { system, prompt } = buildResearchPrompt(current, strategy);
  const res = await callLLMForAuthor(author, {
    system, prompt, maxTokens: 4000, task: "platform_research", webSearch: { maxUses: 12 }, timeoutMs: 240_000,
  });
  if (!res.ok) return fail(`KI nicht erreichbar (${res.kind}).`);
  const result = parseResearch(res.text, current);
  if (!result) return fail("Die KI-Antwort war kein gültiges JSON.", { raw: res.text.slice(0, 2000) });

  const now = new Date().toISOString();
  const bySlug = new Map(current.map((r) => [r.slug, r]));
  const lines: { updates: AiJobReportLine[]; additions: AiJobReportLine[]; archived: AiJobReportLine[] } = { updates: [], additions: [], archived: [] };

  for (const u of result.updates) {
    const row = bySlug.get(u.slug);
    if (!row) continue;
    const { error: upErr } = await svc.from("ai_platforms")
      .update({ ...u.fields, source: "ai", ai_note: u.reason, verified_at: now })
      .eq("id", row.id).eq("locked", false);
    if (upErr) { errors.push(`${row.name}: ${upErr.message}`); continue; }
    await svc.from("ai_platform_changes").insert({
      run_id: runId, platform_id: row.id, action: "update", before: snapshot(row), after: { ...snapshot(row), ...u.fields }, reason: u.reason, sources: u.sources,
    });
    const what = (Object.keys(u.fields) as (keyof PlatformFields)[]).map((k) => `${FIELD_LABEL[k]}: ${String(u.fields[k])}`).join("; ");
    lines.updates.push({ title: row.name, detail: `${what}. ${u.reason}` });
  }

  for (const a of result.additions) {
    const slug = slugifyPlatform(a.name);
    const { data: ins, error: insErr } = await svc.from("ai_platforms").insert({
      slug, name: a.name, category: a.category, tagline: a.tagline, hosting: a.hosting, pricing: a.pricing, url: a.url,
      source: "ai", ai_note: a.reason, verified_at: now,
    }).select("id").single();
    if (insErr || !ins) { errors.push(`${a.name}: ${insErr?.message ?? "nicht angelegt"}`); continue; }
    await svc.from("ai_platform_changes").insert({
      run_id: runId, platform_id: ins.id, action: "add", before: null,
      after: { name: a.name, category: a.category, tagline: a.tagline, hosting: a.hosting, pricing: a.pricing, url: a.url, status: "active" },
      reason: a.reason, sources: a.sources,
    });
    lines.additions.push({ title: a.name, detail: `${a.category}, ${a.hosting}. ${a.reason}`, href: a.url ?? undefined });
  }

  for (const a of result.archive) {
    const row = bySlug.get(a.slug);
    if (!row) continue;
    const { error: arErr } = await svc.from("ai_platforms").update({ status: "archived", source: "ai", ai_note: a.reason }).eq("id", row.id).eq("locked", false);
    if (arErr) { errors.push(`${row.name}: ${arErr.message}`); continue; }
    await svc.from("ai_platform_changes").insert({
      run_id: runId, platform_id: row.id, action: "archive", before: snapshot(row), after: { ...snapshot(row), status: "archived" }, reason: a.reason, sources: a.sources,
    });
    lines.archived.push({ title: row.name, detail: a.reason });
  }

  const changedSlugs = new Set([...result.updates.map((u) => u.slug), ...result.archive.map((a) => a.slug)]);
  const okSlugs = result.checked.filter((s) => !changedSlugs.has(s));
  if (okSlugs.length > 0) {
    await svc.from("ai_platforms").update({ verified_at: now }).in("slug", okSlugs).eq("locked", false);
  }

  const summary = { updates: lines.updates.length, additions: lines.additions.length, archived: lines.archived.length, checked: okSlugs.length };
  await finish(errors.length > 0 ? "partial" : "ok", summary);
  try { revalidatePath("/ki-plattformen"); } catch { /* ausserhalb eines Requests (Test) */ }

  const changed = summary.updates + summary.additions + summary.archived;
  if (changed > 0 || errors.length > 0) {
    await notifyEditor(
      changed > 0 ? `KI-Plattformen: ${changed} Änderung${changed === 1 ? "" : "en"} veröffentlicht` : "KI-Plattformen: Prüfung mit Fehlern",
      AiJobReport({
        heading: "Die KI hat das Verzeichnis «KI-Plattformen» geprüft.",
        intro: `${okSlugs.length} Einträge stimmen. Die Änderungen sind bereits live. Im Admin kannst du jede einzeln zurücknehmen oder einen Eintrag für die KI sperren.`,
        sections: [
          { title: "Neu aufgenommen", lines: lines.additions },
          { title: "Aktualisiert", lines: lines.updates },
          { title: "Archiviert", lines: lines.archived },
        ],
        errors,
        adminUrl: `${SITE_URL}${ADMIN_PATH}`,
        adminLabel: "Änderungen prüfen →",
      }),
    );
  }
  return { runId, ...summary, errors };
}
