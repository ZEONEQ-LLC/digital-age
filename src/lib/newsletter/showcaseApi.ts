import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  MAX_SHOWCASE,
  SHOWCASE_ARTICLE_SELECT,
  resolveShowcaseEntries,
  showcaseFromRow,
  type IssueShowcase,
  type ShowcaseArticleRow,
} from "@/lib/newsletter/showcase";

// «Aus dem Showcase» (S4b): Unternehmensbeitraege lesen und in Eintraege der
// Ausgabe uebersetzen. Client wird uebergeben: Sitzung im Admin (Editor),
// Service-Client im Entwurfs-Job und beim Versand.
type Sb = SupabaseClient<Database>;

const CANDIDATE_LIMIT = 30;

function published(sb: Sb) {
  return sb.from("articles").select(SHOWCASE_ARTICLE_SELECT).eq("content_type", "company").eq("status", "published");
}

// Vorschlag fuer einen neuen Entwurf: die im Zeitraum erschienenen, neueste
// zuerst, hoechstens zwei.
export async function proposeShowcase(sb: Sb, fromIso: string, toIso: string): Promise<IssueShowcase[]> {
  const { data, error } = await published(sb)
    .gt("published_at", fromIso)
    .lte("published_at", toIso)
    .order("published_at", { ascending: false })
    .limit(MAX_SHOWCASE * 3);
  if (error) throw error;
  return ((data ?? []) as unknown as ShowcaseArticleRow[])
    .map((r) => showcaseFromRow(r))
    .filter((e): e is IssueShowcase => e !== null)
    .slice(0, MAX_SHOWCASE);
}

// Auswahlliste im Admin: alle publizierten, neueste zuerst.
export async function loadShowcaseCandidates(sb: Sb): Promise<(IssueShowcase & { date: string })[]> {
  const { data, error } = await published(sb).order("published_at", { ascending: false }).limit(CANDIDATE_LIMIT);
  if (error) {
    console.error("[newsletter:showcase] Kandidaten nicht lesbar:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as ShowcaseArticleRow[]).flatMap((r) => {
    const e = showcaseFromRow(r);
    if (!e) return [];
    const date = r.published_at
      ? new Date(r.published_at).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" })
      : "";
    return [{ ...e, date }];
  });
}

// Beim Speichern, in Vorschau und Test und vor dem Versand: Eintraege aus dem
// aktuellen Stand der Artikel neu bauen (Kennzeichnung nie vom Browser).
export async function resolveShowcase(
  sb: Sb,
  wanted: IssueShowcase[],
): Promise<{ entries: IssueShowcase[]; missing: IssueShowcase[] }> {
  if (wanted.length === 0) return { entries: [], missing: [] };
  const { data, error } = await sb
    .from("articles")
    .select(SHOWCASE_ARTICLE_SELECT)
    .in("id", wanted.map((w) => w.articleId));
  if (error) throw error;
  return resolveShowcaseEntries(wanted, (data ?? []) as unknown as ShowcaseArticleRow[]);
}
