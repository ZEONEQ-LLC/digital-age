import Link from "next/link";
import PageTitle from "@/components/author/PageTitle";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_COVER_URL } from "@/lib/coverImage";
import { isIssueStatus, sanitizeItems, sanitizeSections, type IssueItem } from "@/lib/newsletter/issue";
import {
  NEWS_SELECT,
  PODCAST_SELECT,
  PROMPT_SELECT,
  newsToSection,
  podcastToPick,
  promptToPick,
  rankNews,
  type NewsRow,
  type PodcastRow,
  type PromptRow,
} from "@/lib/newsletter/sections";
import NewsletterIssuesClient, { type IssueView, type NewsCandidate } from "./NewsletterIssuesClient";

// Newsletter-Ausgaben (PR 195, Entscheid Ali 12.11.2026: Entwurf + Freigabe).
// Server-Teil: offene Ausgabe, Verlauf, Zahl der bestaetigten Abonnenten und
// Kandidaten fuer «Artikel hinzufuegen» sowie (PR 203) fuer die Rubriken:
// News der letzten 21 Tage (nach Einordnung), Prompts und Podcasts. Editor-
// Gate ueber das Admin-Layout, RLS (newsletter_issues_editor_*) zusaetzlich.

export const dynamic = "force-dynamic";

const linkStyle = {
  color: "var(--da-green)",
  border: "1px solid var(--da-green)",
  borderRadius: 4,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 700,
  textDecoration: "none",
  whiteSpace: "nowrap" as const,
};

function siteUrl(): string {
  const raw = process.env.NEWSLETTER_SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://digital-age.ch";
  return (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).replace(/\/+$/, "");
}

// Kandidaten fuer «Artikel hinzufuegen»: publiziert in den letzten 60 Tagen.
function candidatesSince(days = 60): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", timeZone: "Europe/Zurich" });
}

export default async function NewsletterIssuesPage() {
  const supabase = await createClient();
  const since = candidatesSince();
  const [{ data: issues, error }, { count: confirmed }, { data: recent }, { data: newsData }, { data: promptData }, { data: podcastData }] = await Promise.all([
    supabase.from("newsletter_issues").select("*").neq("status", "discarded").order("created_at", { ascending: false }).limit(30),
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
    supabase
      .from("articles")
      .select("id, slug, title, excerpt, cover_image_url, published_at, category:categories(name_de)")
      .eq("status", "published")
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(30),
    supabase.from("news_items").select(NEWS_SELECT).eq("status", "approved").gte("generated_at", candidatesSince(21))
      .order("generated_at", { ascending: false }).limit(150),
    supabase.from("ai_prompts").select(PROMPT_SELECT).in("status", ["published", "featured"])
      .order("published_at", { ascending: false }).limit(40),
    supabase.from("podcasts").select(PODCAST_SELECT).eq("is_published", true)
      .order("recommended_at", { ascending: false }).limit(40),
  ]);

  const views: IssueView[] = (issues ?? []).map((r) => ({
    id: r.id,
    status: isIssueStatus(r.status) ? r.status : "draft",
    subject: r.subject,
    intro: r.intro,
    items: sanitizeItems(r.items),
    sections: sanitizeSections(r.sections),
    periodFrom: r.period_from,
    periodTo: r.period_to,
    source: r.source === "manual" ? "manual" : "cron",
    aiNote: r.ai_note,
    editedAt: r.edited_at,
    testSentAt: r.test_sent_at,
    sendStartedAt: r.send_started_at,
    sentAt: r.sent_at,
    recipients: r.recipients_count,
    delivered: r.delivered_count,
    failed: r.failed_count,
    lastError: r.last_error,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  const base = siteUrl();
  type RecentRow = { id: string; slug: string; title: string; excerpt: string | null; cover_image_url: string | null; category: { name_de: string } | null };
  const candidates: IssueItem[] = ((recent ?? []) as unknown as RecentRow[]).map((a) => {
    const cover = a.cover_image_url?.trim() || DEFAULT_COVER_URL;
    return {
      articleId: a.id,
      slug: a.slug,
      title: a.title,
      teaser: (a.excerpt ?? "").replace(/\s+/g, " ").trim().slice(0, 220),
      category: a.category?.name_de ?? "",
      coverUrl: cover.startsWith("/") ? `${base}${cover}` : cover,
    };
  });

  const newsCandidates: NewsCandidate[] = rankNews((newsData ?? []) as NewsRow[]).map((r) => ({
    ...newsToSection(r),
    date: shortDate(r.generated_at),
    importance: r.importance,
  }));
  const promptCandidates = ((promptData ?? []) as PromptRow[]).map((r) => promptToPick(r));
  const podcastCandidates = ((podcastData ?? []) as PodcastRow[]).map((r) => podcastToPick(r, base));

  return (
    <>
      <PageTitle
        title="Newsletter-Ausgaben"
        subtitle={`${confirmed ?? 0} bestätigte Abonnent:innen · Entwurf montags 06:30 automatisch, Versand nur nach Freigabe`}
        right={<Link href="/autor/admin/newsletter" style={linkStyle}>Abonnent:innen →</Link>}
      />
      {error ? (
        <p role="alert" style={{ color: "#ff8e8e", fontSize: 14 }}>Ausgaben konnten nicht geladen werden: {error.message}</p>
      ) : (
        <NewsletterIssuesClient
          issues={views}
          confirmedCount={confirmed ?? 0}
          candidates={candidates}
          newsCandidates={newsCandidates}
          promptCandidates={promptCandidates}
          podcastCandidates={podcastCandidates}
        />
      )}
    </>
  );
}
