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
  ARENA_SOURCE_URL,
  AUDIO_SOURCE_URL,
  appleChartUrl,
  fetchPage,
  fetchSources,
  urlExists,
} from "@/lib/platforms/fetchSources";
import {
  MAX_ADDITIONS,
  buildAdditionPrompt,
  buildAppFilterPrompt,
  buildPageCheckPrompt,
  parseAdditions,
  parseAppFilter,
  parsePageCheck,
  slugifyPlatform,
  type AdditionCandidate,
  type PlatformFields,
  type PlatformForResearch,
} from "@/lib/platforms/research";
import { digestHash, isCovered, normalizeKey, priceDigest, type SourceCandidate } from "@/lib/platforms/sources";
import type { Json } from "@/lib/database.types";
import { createServiceClient } from "@/lib/supabase/service";

// Woechentliche Pruefung der KI-Plattformen (Wunsch Ali 12.11.2026:
// automatisch, ohne Freigabe, mit Mail und «Rückgängig»). Seit PR 206 aus
// festen Quellen statt Websuche (Wunsch Ali 13.11.2026, Kosten):
//
//   A. Updates: Jede aktive, nicht gesperrte Plattform – ihre offizielle
//      Preisseite (pricing_url, sonst url) wird selbst abgerufen. Nur wenn
//      sich die Zeilen mit Preisangaben geaendert haben (page_hash), liest
//      Haiku den Auszug. Gesperrte Seiten (Bot-Sperre, nur JavaScript) stehen
//      in der Mail als «nicht automatisch pruefbar».
//   B. Neuaufnahmen (automatisch, Entscheid Ali): App-Store-Charts CH/DE/AT,
//      Arena-Ranglisten und (mit Schluessel) Artificial Analysis fuer Audio.
//      Was dort weit oben steht und im Verzeichnis fehlt, wird Kandidat; neue
//      Apps ordnet Haiku einmal ein (ai_platform_source_seen merkt sich das).
//      Hoechstens MAX_ADDITIONS pro Lauf, der Link muss erreichbar sein.
//
// Jede Aenderung landet mit Vorher/Nachher in ai_platform_changes (Rückgängig
// im Admin). Gesperrte Eintraege fasst der Job nicht an; archivierte zaehlen
// beim Abgleich mit, damit Zurueckgenommenes nicht wiederkommt.

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
// Obergrenze fuer KI-Aufrufe an Preisseiten pro Lauf (der Rest kommt naechste
// Woche dran, weil der Hash dann noch alt ist).
const MAX_PAGE_AI_CALLS = 6;
const APP_FILTER_MAX = 150;
const FETCH_CONCURRENCY = 4;

type Row = PlatformForResearch & {
  id: string;
  pricing_url: string | null;
  page_hash: string | null;
  page_checked_at: string | null;
  source_keys: string[] | null;
};

function snapshot(r: Row): { [key: string]: Json } {
  return { name: r.name, category: r.category, tagline: r.tagline, hosting: r.hosting, pricing: r.pricing, url: r.url, status: r.status };
}

async function inBatches<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

const STATUS_TEXT: Record<string, string> = { blocked: "sperrt Bots", script: "Inhalt nur per JavaScript", missing: "Seite nicht gefunden", error: "nicht erreichbar" };

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

  const { data: rows, error } = await svc
    .from("ai_platforms")
    .select("id, slug, name, category, tagline, hosting, pricing, url, status, locked, pricing_url, page_hash, page_checked_at, source_keys");
  if (error || !rows) return fail(`Plattformen nicht lesbar: ${error?.message ?? "leer"}`);
  const current = rows as unknown as Row[];

  const author = authorId ?? (await resolveSystemAuthorId(svc, "AI_JOBS_AUTHOR_ID"));
  if (!author) return fail("Kein Editor für die KI-Kosten gefunden.");
  const strategy = await getPromptOverride("platform_research", svc);
  const now = new Date().toISOString();
  const lines: { updates: AiJobReportLine[]; additions: AiJobReportLine[]; archived: AiJobReportLine[]; unreadable: AiJobReportLine[] } = {
    updates: [], additions: [], archived: [], unreadable: [],
  };
  let checked = 0;
  let aiCalls = 0;

  // ---------- A. Preisseiten ----------
  const todo = current
    .filter((r) => r.status === "active" && !r.locked && (r.pricing_url || r.url))
    .sort((a, b) => (a.page_checked_at ?? "").localeCompare(b.page_checked_at ?? ""));
  const pages = await inBatches(todo, FETCH_CONCURRENCY, async (r) => ({ r, url: (r.pricing_url || r.url) as string, page: await fetchPage((r.pricing_url || r.url) as string) }));
  let pageCalls = 0;
  for (const { r, url, page } of pages) {
    if (!page.ok) {
      await svc.from("ai_platforms").update({ page_status: page.status, page_checked_at: now }).eq("id", r.id);
      lines.unreadable.push({ title: r.name, detail: `${STATUS_TEXT[page.status] ?? page.detail} (${url}). Bitte von Hand prüfen oder im Admin eine andere Preisseite eintragen.` });
      continue;
    }
    const digest = priceDigest(page.lines);
    const hash = digestHash(digest);
    if (hash === r.page_hash) {
      await svc.from("ai_platforms").update({ page_status: "unchanged", page_checked_at: now, verified_at: now }).eq("id", r.id);
      checked++;
      continue;
    }
    if (!digest) {
      await svc.from("ai_platforms").update({ page_status: "script", page_checked_at: now }).eq("id", r.id);
      lines.unreadable.push({ title: r.name, detail: `Keine Preisangaben auf ${url} gefunden. Bitte im Admin die Preisseite eintragen.` });
      continue;
    }
    if (pageCalls >= MAX_PAGE_AI_CALLS) continue; // naechste Woche, Hash bleibt alt
    pageCalls++;
    aiCalls++;
    const { system, prompt } = buildPageCheckPrompt(r, url, digest, strategy);
    const res = await callLLMForAuthor(author, { system, prompt, maxTokens: 400, task: "platform_research", timeoutMs: 60_000 });
    if (!res.ok) { errors.push(`${r.name}: KI nicht erreichbar (${res.kind}).`); continue; }
    const result = parsePageCheck(res.text, r, url);
    if (!result) { errors.push(`${r.name}: Antwort der KI war kein gültiges JSON.`); continue; }
    for (const u of result.updates) {
      const { error: upErr } = await svc.from("ai_platforms")
        .update({ ...u.fields, source: "ai", ai_note: u.reason, verified_at: now, page_hash: hash, page_status: "ok", page_checked_at: now })
        .eq("id", r.id).eq("locked", false);
      if (upErr) { errors.push(`${r.name}: ${upErr.message}`); continue; }
      await svc.from("ai_platform_changes").insert({
        run_id: runId, platform_id: r.id, action: "update", before: snapshot(r), after: { ...snapshot(r), ...u.fields }, reason: u.reason, sources: u.sources,
      });
      const what = (Object.keys(u.fields) as (keyof PlatformFields)[]).map((k) => `${FIELD_LABEL[k]}: ${String(u.fields[k])}`).join("; ");
      lines.updates.push({ title: r.name, detail: `${what}. ${u.reason}`, href: url });
    }
    for (const a of result.archive) {
      const { error: arErr } = await svc.from("ai_platforms").update({ status: "archived", source: "ai", ai_note: a.reason, page_hash: hash, page_checked_at: now }).eq("id", r.id).eq("locked", false);
      if (arErr) { errors.push(`${r.name}: ${arErr.message}`); continue; }
      await svc.from("ai_platform_changes").insert({
        run_id: runId, platform_id: r.id, action: "archive", before: snapshot(r), after: { ...snapshot(r), status: "archived" }, reason: a.reason, sources: a.sources,
      });
      lines.archived.push({ title: r.name, detail: a.reason, href: url });
    }
    if (result.updates.length === 0 && result.archive.length === 0) {
      await svc.from("ai_platforms").update({ page_hash: hash, page_status: "ok", page_checked_at: now, verified_at: now }).eq("id", r.id);
      checked++;
    }
  }

  // ---------- B. Neue Plattformen ----------
  const sources = await fetchSources();
  errors.push(...sources.errors);
  const { data: seenRows } = await svc.from("ai_platform_source_seen").select("key, verdict");
  const seen = new Map((seenRows ?? []).map((s) => [s.key, s.verdict]));
  const remember = async (c: SourceCandidate, verdict: "ai" | "other" | "covered" | "added" | "failed") => {
    await svc.from("ai_platform_source_seen").upsert({ key: c.key, source: c.source, label: c.label.slice(0, 200), verdict, last_seen_at: now }, { onConflict: "key" });
    seen.set(c.key, verdict);
  };

  // Apps: Bekanntes faellt weg, neue ordnet Haiku einmal ein.
  const freshApps = sources.apps.filter((a) => !seen.has(a.key) && !isCovered(a.names, current));
  const appCategory = new Map<string, SourceCandidate["category"]>();
  if (freshApps.length > 0) {
    const batch = freshApps.slice(0, APP_FILTER_MAX);
    aiCalls++;
    const { system, prompt } = buildAppFilterPrompt(batch);
    const res = await callLLMForAuthor(author, { system, prompt, maxTokens: 1200, task: "platform_research", timeoutMs: 90_000 });
    const verdicts = res.ok ? parseAppFilter(res.text, batch.map((a) => a.key)) : null;
    if (!verdicts) {
      errors.push(res.ok ? "App-Einordnung: Antwort der KI war kein gültiges JSON." : `App-Einordnung: KI nicht erreichbar (${res.kind}).`);
    } else {
      const ai = new Map(verdicts.map((v) => [v.key, v.category]));
      for (const a of batch) {
        if (ai.has(a.key)) appCategory.set(a.key, ai.get(a.key) ?? null);
        await remember(a, ai.has(a.key) ? "ai" : "other");
      }
    }
  }
  const pool: SourceCandidate[] = [
    ...sources.apps
      .filter((a) => seen.get(a.key) === "ai" && !isCovered(a.names, current))
      .map((a) => ({ ...a, category: appCategory.get(a.key) ?? a.category })),
    ...sources.ranked.filter((c) => {
      const v = seen.get(c.key);
      if (v === "added" || v === "failed" || v === "other") return false;
      return !isCovered(c.names, current);
    }),
  ].sort((a, b) => a.priority - b.priority);

  const picked = pool.slice(0, MAX_ADDITIONS);
  if (picked.length > 0) {
    aiCalls++;
    const sourceUrl = (c: SourceCandidate) =>
      c.source === "apple" ? appleChartUrl((c.hint.match(/App Store (\w{2})/)?.[1] ?? "ch").toLowerCase()) : c.source === "arena" ? ARENA_SOURCE_URL : AUDIO_SOURCE_URL;
    const cands: AdditionCandidate[] = picked.map((c) => ({ key: c.key, label: c.label, hint: c.hint, category: c.category }));
    const { system, prompt } = buildAdditionPrompt(cands, current.map((r) => r.name), strategy);
    const res = await callLLMForAuthor(author, { system, prompt, maxTokens: 1500, task: "platform_research", timeoutMs: 90_000 });
    const adds = res.ok ? parseAdditions(res.text, current, picked.map((c) => ({ key: c.key, sourceUrl: sourceUrl(c) }))) : null;
    if (!adds) {
      errors.push(res.ok ? "Neuaufnahmen: Antwort der KI war kein gültiges JSON." : `Neuaufnahmen: KI nicht erreichbar (${res.kind}).`);
    } else {
      for (const c of picked) {
        const a = adds.find((x) => x.key === c.key);
        // Von der KI weggelassen (schon vorhanden, kein Endkunden-Produkt,
        // unsicher): als «covered» merken, nicht jede Woche neu fragen.
        if (!a) { await remember(c, "covered"); continue; }
        if (!(await urlExists(a.url as string))) { await remember(c, "failed"); errors.push(`${a.name}: Link ${a.url} nicht erreichbar, nicht aufgenommen.`); continue; }
        const pricingUrl = a.pricingUrl && (await urlExists(a.pricingUrl)) ? a.pricingUrl : null;
        const keys = Array.from(new Set([...c.names, a.name].map(normalizeKey).filter((k) => k.length >= 3))).slice(0, 8);
        const { data: ins, error: insErr } = await svc.from("ai_platforms").insert({
          slug: slugifyPlatform(a.name), name: a.name, category: a.category, tagline: a.tagline, hosting: a.hosting, pricing: a.pricing,
          url: a.url, pricing_url: pricingUrl, source_keys: keys, source: "ai", ai_note: a.reason, verified_at: now,
        }).select("id").single();
        if (insErr || !ins) { await remember(c, "failed"); errors.push(`${a.name}: ${insErr?.message ?? "nicht angelegt"}`); continue; }
        await svc.from("ai_platform_changes").insert({
          run_id: runId, platform_id: ins.id, action: "add", before: null,
          after: { name: a.name, category: a.category, tagline: a.tagline, hosting: a.hosting, pricing: a.pricing, url: a.url, status: "active" },
          reason: `${a.reason} Quelle: ${c.hint}.`, sources: a.sources,
        });
        await remember(c, "added");
        current.push({ ...(a as unknown as Row), id: ins.id, slug: slugifyPlatform(a.name), status: "active", locked: false, source_keys: keys, pricing_url: pricingUrl, page_hash: null, page_checked_at: null });
        lines.additions.push({ title: a.name, detail: `${a.category}, ${a.hosting}, ${a.pricing}. ${c.hint}.`, href: a.url ?? undefined });
      }
    }
  }

  const summary = {
    updates: lines.updates.length, additions: lines.additions.length, archived: lines.archived.length, checked,
    unreadable: lines.unreadable.length, ai_calls: aiCalls, candidates_waiting: Math.max(0, pool.length - picked.length),
    audio_skipped: sources.audioSkipped,
  };
  await finish(errors.length > 0 ? "partial" : "ok", summary);
  try { revalidatePath("/ki-plattformen"); } catch { /* ausserhalb eines Requests (Test) */ }

  const changed = summary.updates + summary.additions + summary.archived;
  if (changed > 0 || errors.length > 0 || (trigger === "cron" && lines.unreadable.length > 0)) {
    await notifyEditor(
      changed > 0 ? `KI-Plattformen: ${changed} Änderung${changed === 1 ? "" : "en"} veröffentlicht` : "KI-Plattformen: Prüfung mit Hinweisen",
      AiJobReport({
        heading: "Das Verzeichnis «KI-Plattformen» ist geprüft.",
        intro: `${checked} Einträge stimmen. Quellen: offizielle Preisseiten, App-Store-Charts CH/DE/AT, Arena-Ranglisten${sources.audioSkipped ? "" : ", Artificial Analysis"}. Änderungen sind bereits live; im Admin kannst du jede einzeln zurücknehmen oder einen Eintrag für die KI sperren.`,
        sections: [
          { title: "Neu aufgenommen", lines: lines.additions },
          { title: "Aktualisiert", lines: lines.updates },
          { title: "Archiviert", lines: lines.archived },
          { title: "Nicht automatisch prüfbar", lines: lines.unreadable },
        ],
        errors,
        adminUrl: `${SITE_URL}${ADMIN_PATH}`,
        adminLabel: "Änderungen prüfen →",
      }),
    );
  }
  return { runId, updates: summary.updates, additions: summary.additions, archived: summary.archived, checked, errors };
}
