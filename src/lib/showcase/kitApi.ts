import "server-only";

import { isKitToken, type KitStatsRow } from "@/lib/showcase/kit";
import { createServiceClient } from "@/lib/supabase/service";

// Showcase S4: Daten fuer das Teil-Kit (/showcase/teilen/<kit_token>) und den
// 30-Tage-Bericht. Service-Role: Das Unternehmen hat kein Login, der Token
// ist der Zugang (wie beim Fragebogen). Gelesen wird nur, was zur Einreichung
// gehoert: ihr Beitrag und dessen Tageszahlen.

export const KIT_STATS_COLUMNS =
  "day, views, reads, seconds, website_clicks, src_search, src_social, src_mail, src_ai, src_internal, src_direct, src_other";

export type KitArticle = {
  id: string;
  slug: string;
  title: string;
  status: string;
  published_at: string | null;
  content_type: string;
  is_paid: boolean;
};

export type Kit = {
  submissionId: string;
  company: { name: string; slug: string; website: string | null };
  contactName: string | null;
  linkedin: string[];
  reportSentAt: string | null;
  article: KitArticle | null;
  stats: KitStatsRow[];
};

export function linkedinTexts(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter((t): t is string => typeof t === "string" && t.trim() !== "").slice(0, 3)
    : [];
}

export async function getKitStats(articleId: string): Promise<KitStatsRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("article_stats_daily")
    .select(KIT_STATS_COLUMNS)
    .eq("article_id", articleId)
    .order("day", { ascending: true })
    .limit(400);
  if (error) {
    console.error("[showcase:kit] Zahlen nicht lesbar:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getKitByToken(token: string): Promise<Kit | null> {
  if (!isKitToken(token)) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("showcase_submissions")
    .select(
      "id, status, contact_name, linkedin_texts, report_sent_at, startup:ai_startups(name, slug, website), article:articles(id, slug, title, status, published_at, content_type, is_paid)",
    )
    .eq("kit_token", token)
    .maybeSingle();
  if (error) {
    console.error("[showcase:kit] Einreichung nicht lesbar:", error.message);
    return null;
  }
  if (!data || data.status === "withdrawn" || !data.startup) return null;
  const article = data.article && data.article.content_type === "company" ? data.article : null;
  return {
    submissionId: data.id,
    company: data.startup,
    contactName: data.contact_name,
    linkedin: linkedinTexts(data.linkedin_texts),
    reportSentAt: data.report_sent_at,
    article,
    stats: article && article.status === "published" ? await getKitStats(article.id) : [],
  };
}
