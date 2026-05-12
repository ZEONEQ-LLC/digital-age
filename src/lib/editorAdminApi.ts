import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type AuthorRow = Database["public"]["Tables"]["authors"]["Row"];
export type InviteRow = Database["public"]["Tables"]["invites"]["Row"];
export type AuthorRole = Database["public"]["Enums"]["author_role"];

export type AuthorWithCount = AuthorRow & {
  article_count: number;
};

export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

export type InviteWithInviter = InviteRow & {
  invited_by: Pick<AuthorRow, "id" | "display_name" | "slug"> | null;
  status: InviteStatus;
};

export type EditorPerformanceStats = {
  totalAuthors: number;
  activeAuthors: number;
  placeholderAuthors: number;
  totalArticles: number;
  draftCount: number;
  inReviewCount: number;
  publishedCount: number;
  archivedCount: number;
  totalWordCount: number;
  pendingInviteCount: number;
  acceptedLast7d: number;
  topAuthors: Array<{
    id: string;
    display_name: string;
    slug: string;
    avatar_url: string | null;
    article_count: number;
  }>;
};

function deriveStatus(row: Pick<InviteRow, "accepted_at" | "revoked_at" | "expires_at">): InviteStatus {
  if (row.accepted_at) return "accepted";
  if (row.revoked_at) return "revoked";
  if (new Date(row.expires_at) < new Date()) return "expired";
  return "pending";
}

export async function getAllAuthors(): Promise<AuthorWithCount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("authors")
    .select("*, articles(count)")
    .order("display_name", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []).map((row) => {
    const articles = row.articles as unknown as Array<{ count: number }> | null;
    const article_count = articles?.[0]?.count ?? 0;
    const { articles: _drop, ...author } = row as typeof row & { articles?: unknown };
    void _drop;
    return { ...(author as AuthorRow), article_count };
  });

  rows.sort((a, b) => {
    const aActive = a.user_id ? 0 : 1;
    const bActive = b.user_id ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return a.display_name.localeCompare(b.display_name, "de");
  });

  return rows;
}

export async function getAuthorById(id: string): Promise<AuthorRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("authors")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAllInvites(): Promise<InviteWithInviter[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invites")
    .select("*, invited_by:authors!invited_by_id(id, display_name, slug)")
    .order("invited_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...(row as InviteRow),
    invited_by: (row as unknown as { invited_by: InviteWithInviter["invited_by"] }).invited_by,
    status: deriveStatus(row as InviteRow),
  }));
}

export async function getEditorPerformanceStats(): Promise<EditorPerformanceStats> {
  const supabase = await createClient();

  const [authorsRes, articlesRes, invitesRes] = await Promise.all([
    supabase.from("authors").select("id, display_name, slug, avatar_url, user_id"),
    supabase.from("articles").select("id, author_id, status, word_count"),
    supabase.from("invites").select("accepted_at, revoked_at, expires_at"),
  ]);

  if (authorsRes.error) throw authorsRes.error;
  if (articlesRes.error) throw articlesRes.error;
  if (invitesRes.error) throw invitesRes.error;

  const authors = authorsRes.data ?? [];
  const articles = articlesRes.data ?? [];
  const invites = invitesRes.data ?? [];

  const articlesByAuthor = new Map<string, number>();
  let draftCount = 0;
  let inReviewCount = 0;
  let publishedCount = 0;
  let archivedCount = 0;
  let totalWordCount = 0;

  for (const a of articles) {
    if (a.author_id) {
      articlesByAuthor.set(a.author_id, (articlesByAuthor.get(a.author_id) ?? 0) + 1);
    }
    if (a.status === "draft") draftCount++;
    else if (a.status === "in_review") inReviewCount++;
    else if (a.status === "published") publishedCount++;
    else if (a.status === "archived") archivedCount++;
    totalWordCount += a.word_count ?? 0;
  }

  const topAuthors = authors
    .map((a) => ({
      id: a.id,
      display_name: a.display_name,
      slug: a.slug,
      avatar_url: a.avatar_url,
      article_count: articlesByAuthor.get(a.id) ?? 0,
    }))
    .sort((a, b) => b.article_count - a.article_count)
    .slice(0, 5);

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  let pendingInviteCount = 0;
  let acceptedLast7d = 0;
  for (const i of invites) {
    if (!i.accepted_at && !i.revoked_at && new Date(i.expires_at).getTime() > now) {
      pendingInviteCount++;
    }
    if (i.accepted_at && new Date(i.accepted_at).getTime() > sevenDaysAgo) {
      acceptedLast7d++;
    }
  }

  return {
    totalAuthors: authors.length,
    activeAuthors: authors.filter((a) => a.user_id).length,
    placeholderAuthors: authors.filter((a) => !a.user_id).length,
    totalArticles: articles.length,
    draftCount,
    inReviewCount,
    publishedCount,
    archivedCount,
    totalWordCount,
    pendingInviteCount,
    acceptedLast7d,
    topAuthors,
  };
}
