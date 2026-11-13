"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { FormError, runAction, type ActionResult } from "@/lib/actionResult";

type NewsSourceRow = Database["public"]["Tables"]["news_sources"]["Row"];
type NewsSourceInsert = Database["public"]["Tables"]["news_sources"]["Insert"];
type NewsSourceUpdate = Database["public"]["Tables"]["news_sources"]["Update"];

// Gibt die Author-ID des Editors zurueck (traegt beim Refresh die KI-Kosten).
async function requireEditor(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new FormError("Nicht eingeloggt.");
  const { data: me } = await supabase
    .from("authors")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) throw new FormError("Author-Profil nicht gefunden.");
  if (me.role !== "editor") throw new FormError("Nur Editor:innen dürfen den News-Ticker verwalten.");
  return me.id;
}

const URL_RE = /^https?:\/\/[^\s]+$/i;
const LANGUAGES = ["de", "en", "fr", "it"] as const;
const COUNTRIES = ["CH", "DE", "AT", "INT"] as const;
const SOURCE_TYPES = ["rss", "atom", "html"] as const;

export type SourcePatch = {
  name: string;
  url: string;
  source_type: (typeof SOURCE_TYPES)[number];
  language: (typeof LANGUAGES)[number];
  country: (typeof COUNTRIES)[number] | null;
  default_category: string | null;
  is_active: boolean;
};

function validatePatch(p: SourcePatch): string | null {
  // Trim vor jedem Check: Copy-Paste aus Browser-Address-Bar oder Feed-
  // Discovery-Snippets schleppt oft führendes Whitespace, NBSP oder BOM mit.
  // Die URL_RE ist `^https?…`-anker-strikt, ein einziges unsichtbares Zeichen
  // davor kippt das Match.
  const name = p.name.trim();
  const url = p.url.trim();

  if (!name || name.length > 100) {
    return "Name muss zwischen 1 und 100 Zeichen sein.";
  }
  if (!URL_RE.test(url)) {
    return "URL muss mit http:// oder https:// beginnen.";
  }
  if (!SOURCE_TYPES.includes(p.source_type)) {
    return "Ungültiger Quellen-Typ.";
  }
  if (!LANGUAGES.includes(p.language)) {
    return "Ungültige Sprache.";
  }
  if (p.country !== null && !COUNTRIES.includes(p.country)) {
    return "Ungültiges Land.";
  }
  return null;
}

export async function createSource(patch: SourcePatch): Promise<ActionResult<{ id: string }>> {
  return runAction("newsTicker.createSource", () => createSourceInner(patch));
}

async function createSourceInner(patch: SourcePatch): Promise<{ id: string }> {
  await requireEditor();
  const err = validatePatch(patch);
  if (err) throw new FormError(err);

  const supabase = await createClient();
  const insert: NewsSourceInsert = {
    name: patch.name.trim(),
    url: patch.url.trim(),
    source_type: patch.source_type,
    language: patch.language,
    country: patch.country,
    default_category: patch.default_category,
    is_active: patch.is_active,
  };

  const { data, error } = await supabase
    .from("news_sources")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") throw new FormError("Diese URL ist bereits als Quelle angelegt.");
    throw error;
  }
  revalidatePath("/autor/news-ticker");
  return { id: data.id };
}

export async function updateSource(
  id: string,
  patch: SourcePatch,
): Promise<ActionResult<NewsSourceRow>> {
  return runAction("newsTicker.updateSource", () => updateSourceInner(id, patch));
}

async function updateSourceInner(
  id: string,
  patch: SourcePatch,
): Promise<NewsSourceRow> {
  await requireEditor();
  const err = validatePatch(patch);
  if (err) throw new FormError(err);

  const supabase = await createClient();
  const update: NewsSourceUpdate = {
    name: patch.name.trim(),
    url: patch.url.trim(),
    source_type: patch.source_type,
    language: patch.language,
    country: patch.country,
    default_category: patch.default_category,
    is_active: patch.is_active,
  };

  const { data, error } = await supabase
    .from("news_sources")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new FormError("Diese URL ist bereits als Quelle angelegt.");
    throw error;
  }
  revalidatePath("/autor/news-ticker");
  return data;
}

export async function deleteSource(id: string): Promise<ActionResult<void>> {
  return runAction("newsTicker.deleteSource", () => deleteSourceInner(id));
}

async function deleteSourceInner(id: string): Promise<void> {
  await requireEditor();
  const supabase = await createClient();
  const { error } = await supabase.from("news_sources").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/autor/news-ticker");
}

export async function saveGenerationPrompt(prompt: string): Promise<ActionResult<void>> {
  return runAction("newsTicker.saveGenerationPrompt", () => saveGenerationPromptInner(prompt));
}

async function saveGenerationPromptInner(prompt: string): Promise<void> {
  await requireEditor();
  if (!prompt.trim()) throw new FormError("Der Prompt darf nicht leer sein.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("news_ticker_config")
    .update({ generation_prompt: prompt })
    .eq("id", 1);

  if (error) throw error;
  revalidatePath("/autor/news-ticker");
}

export async function triggerRefresh(): Promise<ActionResult<import("./newsTicker/refresh").RefreshStats>> {
  return runAction("newsTicker.triggerRefresh", () => triggerRefreshInner());
}

async function triggerRefreshInner(): Promise<
  import("./newsTicker/refresh").RefreshStats
> {
  const authorId = await requireEditor();
  // Dynamic import: refresh.ts ist `server-only` und importiert Anthropic
  // SDK + Service-Role-Client. Hier nur on-demand laden, damit der
  // Module-Graph der Suite-Page schlank bleibt.
  const { runRefresh } = await import("./newsTicker/refresh");
  const stats = await runRefresh({ authorId });
  revalidatePath("/autor/news-ticker");
  // Der Ticker sitzt im Root-Layout und steckt auch in statisch
  // vorgerenderten Seiten (/kontakt, /mediadaten, ...). "layout" erneuert
  // alle Seiten beim naechsten Aufruf, nicht nur die Startseite.
  revalidatePath("/", "layout");
  return stats;
}

const TICKER_SPEEDS = ["slow", "normal", "fast"] as const;

export type TickerSettings = {
  ticker_speed: (typeof TICKER_SPEEDS)[number];
  items_per_source: number;
  is_paused: boolean;
  scheduler_enabled: boolean;
  scheduled_hour_cet: number;
};

export async function saveTickerSettings(s: TickerSettings): Promise<ActionResult<void>> {
  return runAction("newsTicker.saveTickerSettings", () => saveTickerSettingsInner(s));
}

async function saveTickerSettingsInner(s: TickerSettings): Promise<void> {
  await requireEditor();
  if (!TICKER_SPEEDS.includes(s.ticker_speed)) {
    throw new FormError("Ungültige Geschwindigkeit.");
  }
  if (!Number.isInteger(s.items_per_source) || s.items_per_source < 1 || s.items_per_source > 30) {
    throw new FormError("Items pro Quelle muss zwischen 1 und 30 liegen.");
  }
  if (
    !Number.isInteger(s.scheduled_hour_cet) ||
    s.scheduled_hour_cet < 0 ||
    s.scheduled_hour_cet > 23
  ) {
    throw new FormError("Scheduler-Stunde muss zwischen 0 und 23 liegen.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("news_ticker_config")
    .update({
      ticker_speed: s.ticker_speed,
      items_per_source: s.items_per_source,
      is_paused: s.is_paused,
      scheduler_enabled: s.scheduler_enabled,
      scheduled_hour_cet: s.scheduled_hour_cet,
    })
    .eq("id", 1);

  if (error) throw error;
  revalidatePath("/autor/news-ticker");
  // Der Ticker sitzt im Root-Layout und steckt auch in statisch
  // vorgerenderten Seiten (/kontakt, /mediadaten, ...). "layout" erneuert
  // alle Seiten beim naechsten Aufruf, nicht nur die Startseite.
  revalidatePath("/", "layout");
}

export type NewsItemReview = {
  status: "approved" | "rejected";
  wirtschaft: number;
  gesellschaft: number;
  umwelt: number;
  dringlichkeit: number;
  importance: number;
  warum: string;
  kehrseite: string;
};

// Meldung im Admin pruefen (PR 199): Einordnung von Hand setzen (by = editor)
// und/oder ausblenden. RLS news_items_editor_all.
export async function saveNewsItemReview(id: string, r: NewsItemReview): Promise<ActionResult<void>> {
  return runAction("newsTicker.saveNewsItemReview", async () => {
    await requireEditor();
    if (r.status !== "approved" && r.status !== "rejected") throw new FormError("Unbekannter Status.");
    const { parseAssessment } = await import("@/lib/newsTicker/assessment");
    const rated = parseAssessment(
      { wirtschaft: r.wirtschaft, gesellschaft: r.gesellschaft, umwelt: r.umwelt, dringlichkeit: r.dringlichkeit, wichtigkeit: r.importance, warum: r.warum, kehrseite: r.kehrseite },
      "editor",
    );
    if (!rated) throw new FormError("Einordnung unvollständig: alle Stufen wählen und einen Satz «Warum wichtig» (mind. 10 Zeichen) schreiben.");
    const supabase = await createClient();
    const { error } = await supabase
      .from("news_items")
      .update({
        status: r.status,
        assessment: rated.assessment as unknown as Database["public"]["Tables"]["news_items"]["Update"]["assessment"],
        importance: rated.importance,
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/autor/news-ticker");
    revalidatePath("/news");
    revalidatePath("/");
  });
}

// Einordnung verwerfen: Der stuendliche Nachtrag (Cron) ordnet die Meldung
// innerhalb einer Stunde neu ein, «Jetzt aktualisieren» sofort.
export async function resetNewsItemAssessment(id: string): Promise<ActionResult<void>> {
  return runAction("newsTicker.resetNewsItemAssessment", async () => {
    await requireEditor();
    const supabase = await createClient();
    const { error } = await supabase.from("news_items").update({ assessment: null, importance: null }).eq("id", id);
    if (error) throw error;
    revalidatePath("/autor/news-ticker");
    revalidatePath("/news");
    revalidatePath("/");
  });
}

// Meldung aus- oder wieder einblenden, ohne die Einordnung anzufassen.
export async function setNewsItemStatus(id: string, status: "approved" | "rejected"): Promise<ActionResult<void>> {
  return runAction("newsTicker.setNewsItemStatus", async () => {
    await requireEditor();
    if (status !== "approved" && status !== "rejected") throw new FormError("Unbekannter Status.");
    const supabase = await createClient();
    const { error } = await supabase.from("news_items").update({ status }).eq("id", id);
    if (error) throw error;
    revalidatePath("/autor/news-ticker");
    revalidatePath("/news");
    revalidatePath("/");
  });
}

