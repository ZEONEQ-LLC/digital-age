import "server-only";

import {
  DRAFT_MAX_NEWS,
  NEWS_INPUT_MAX,
  buildNewsletterDraftPrompt,
  parseNewsletterDraft,
  type NewsletterDraftArticle,
  type NewsletterDraftInput,
} from "@/lib/ai/newsletterPrompts";
import { getPromptOverride } from "@/lib/ai/promptOverrides";
import { callLLMForAuthor } from "@/lib/ai/systemCall";
import { resolveSystemAuthorId } from "@/lib/ai/systemAuthor";
import { DEFAULT_COVER_URL } from "@/lib/coverImage";
import { MAX_ITEMS, nextPeriod, sanitizeItems, sanitizeSections, type IssueItem, type IssueSections } from "@/lib/newsletter/issue";
import { SITE_URL } from "@/lib/newsletter/mail";
import {
  NEWS_SELECT,
  PODCAST_SELECT,
  PROMPT_SELECT,
  defaultPrompt,
  levelsForPrompt,
  newsToHype,
  newsToSection,
  podcastToPick,
  promptToPick,
  rankNews,
  shortenText,
  type NewsRow,
  type PodcastRow,
  type PromptRow,
} from "@/lib/newsletter/sections";
import { readAssessment, readImportance } from "@/lib/newsTicker/assessment";
import { createServiceClient } from "@/lib/supabase/service";
import { stripAllMarkup } from "@/lib/tiptap/roundtripGuard";

// Newsletter-Entwurf (PR 195): neue Artikel seit der letzten gesendeten
// Ausgabe (sonst 7 Tage), KI schreibt Betreff, Einleitung und Kurztexte.
// Cron montags (System-Author traegt die Kosten) oder Knopf im Admin (der
// Editor). Service-Client: Der Cron hat keine Session, der Knopf prueft den
// Editor vorher selbst.
//
// Von Hand ohne neue Artikel: die neuesten vier als Startpunkt (Hinweis im
// Entwurf); der Cron erstellt dann nichts.
//
// Offener Entwurf: unbearbeitet (edited_at null) wird er ersetzt, damit ein
// liegengebliebener Entwurf nicht veraltet; bearbeitet bleibt er, ausser der
// Editor verlangt es ausdruecklich (replaceEdited). Ohne neuen Inhalt bleibt
// alles, wie es ist.
//
// Rubriken (PR 203): News, die im Zeitraum in den Ticker kamen (nach
// generated_at, eingeordnet), Prompts und Podcasts aus dem Zeitraum. Derselbe
// KI-Aufruf waehlt die wichtigsten News, einen Hype-Check, den Prompt und den
// Podcast. Ohne KI: News nach Einordnung, Prompt featured/neuester, Podcast
// neuester, kein Hype-Check. Der Cron erstellt auch ohne neue Artikel einen
// Entwurf, wenn mindestens MIN_NEWS_WITHOUT_ARTICLES eingeordnete News da sind.

export type DraftResult =
  | { kind: "created"; issueId: string; items: number; news: number; aiOk: boolean }
  | { kind: "no_articles"; since: string }
  | { kind: "kept_edited"; issueId: string }
  | { kind: "sending"; issueId: string }
  | { kind: "error"; message: string };

type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  category: { name_de: string } | null;
};

const TEASER_FALLBACK_CHARS = 200;
const MANUAL_FALLBACK_ITEMS = 4;
const MIN_NEWS_WITHOUT_ARTICLES = 3;
const PROMPT_CANDIDATES = 8;
const PODCAST_CANDIDATES = 6;
const shorten = shortenText;

function absoluteCover(url: string | null): string {
  const v = url?.trim() || DEFAULT_COVER_URL;
  return v.startsWith("/") ? `${SITE_URL}${v}` : v;
}

export async function createNewsletterDraft(opts: {
  source: "cron" | "manual";
  authorId: string | null;
  replaceEdited?: boolean;
  now?: Date;
}): Promise<DraftResult> {
  const now = opts.now ?? new Date();
  let svc;
  try {
    svc = createServiceClient();
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }

  const { data: open, error: openErr } = await svc
    .from("newsletter_issues")
    .select("id, status, edited_at")
    .in("status", ["draft", "sending"])
    .maybeSingle();
  if (openErr) return { kind: "error", message: openErr.message };
  if (open?.status === "sending") return { kind: "sending", issueId: open.id };
  if (open && open.edited_at && !opts.replaceEdited) return { kind: "kept_edited", issueId: open.id };

  const { data: last } = await svc
    .from("newsletter_issues")
    .select("period_to")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const period = nextPeriod(last?.period_to ?? null, now);

  const { data: rows, error: artErr } = await svc
    .from("articles")
    .select("id, slug, title, excerpt, body_md, cover_image_url, published_at, category:categories(name_de)")
    .eq("status", "published")
    .gt("published_at", period.from.toISOString())
    .lte("published_at", period.to.toISOString())
    .order("published_at", { ascending: false })
    .limit(MAX_ITEMS);
  if (artErr) return { kind: "error", message: artErr.message };
  let articles = (rows ?? []) as unknown as ArticleRow[];

  // Rubriken: News nach Eingang im Ticker (generated_at; published_at der
  // Quellen ist teils in der Zukunft), nur eingeordnete.
  const fromIso = period.from.toISOString();
  const toIso = period.to.toISOString();
  const [newsRes, promptRes, podcastRes] = await Promise.all([
    svc.from("news_items").select(NEWS_SELECT).eq("status", "approved").not("assessment", "is", null)
      .gt("generated_at", fromIso).lte("generated_at", toIso).order("generated_at", { ascending: false }).limit(150),
    svc.from("ai_prompts").select(PROMPT_SELECT).in("status", ["published", "featured"])
      .gt("published_at", fromIso).lte("published_at", toIso).order("published_at", { ascending: false }).limit(PROMPT_CANDIDATES),
    svc.from("podcasts").select(PODCAST_SELECT).eq("is_published", true)
      .gt("recommended_at", fromIso).lte("recommended_at", toIso).order("recommended_at", { ascending: false }).limit(PODCAST_CANDIDATES),
  ]);
  if (newsRes.error) return { kind: "error", message: newsRes.error.message };
  if (promptRes.error) return { kind: "error", message: promptRes.error.message };
  if (podcastRes.error) return { kind: "error", message: podcastRes.error.message };
  const newsRows = rankNews((newsRes.data ?? []) as NewsRow[]).slice(0, NEWS_INPUT_MAX);
  const promptRows = (promptRes.data ?? []) as PromptRow[];
  const podcastRows = (podcastRes.data ?? []) as PodcastRow[];
  // Von Hand ohne neue Artikel (z. B. die erste Ausgabe): die neuesten
  // Artikel als Startpunkt, der Editor kuerzt oder ergaenzt. Der Cron nimmt
  // keine alten Artikel; er erstellt den Entwurf dann nur mit genug News.
  let fallbackLatest = false;
  if (articles.length === 0 && opts.source === "manual") {
    const { data: latest, error: latestErr } = await svc
      .from("articles")
      .select("id, slug, title, excerpt, body_md, cover_image_url, published_at, category:categories(name_de)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(MANUAL_FALLBACK_ITEMS);
    if (latestErr) return { kind: "error", message: latestErr.message };
    articles = (latest ?? []) as unknown as ArticleRow[];
    fallbackLatest = articles.length > 0;
  }
  if (articles.length === 0 && newsRows.length < MIN_NEWS_WITHOUT_ARTICLES) {
    return { kind: "no_articles", since: period.from.toISOString() };
  }

  // KI: Kosten beim Editor (Knopf) bzw. System-Author (Cron).
  const authorId = opts.authorId ?? (await resolveSystemAuthorId(svc, "NEWSLETTER_AUTHOR_ID"));
  const input: NewsletterDraftArticle[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category?.name_de ?? "",
    abstract: stripAllMarkup(a.excerpt ?? ""),
    bodyStart: stripAllMarkup(a.body_md ?? "").slice(0, 1200),
  }));
  // Kurze IDs fuer die KI (n1, p1, c1), zurueck ueber die Maps.
  const newsById = new Map(newsRows.map((r, i) => [`n${i + 1}`, r]));
  const promptById = new Map(promptRows.map((r, i) => [`p${i + 1}`, r]));
  const podcastById = new Map(podcastRows.map((r, i) => [`c${i + 1}`, r]));
  const draftInput: NewsletterDraftInput = {
    articles: input,
    news: [...newsById].map(([id, r]) => {
      const a = readAssessment(r.assessment);
      return {
        id,
        title: r.title,
        teaser: r.teaser ?? "",
        source: r.source_name ?? "",
        importance: readImportance(r.importance),
        levels: levelsForPrompt(a),
        warum: a?.warum ?? "",
        kehrseite: a?.kehrseite ?? "",
      };
    }),
    prompts: [...promptById].map(([id, r]) => ({ id, title: r.title, label: promptToPick(r).label, text: r.context })),
    podcasts: [...podcastById].map(([id, r]) => ({ id, title: r.title, label: podcastToPick(r, SITE_URL).label, text: r.description ?? "" })),
  };

  let aiNote: string | null = null;
  let parsed: ReturnType<typeof parseNewsletterDraft> = null;
  if (!authorId) {
    aiNote = "Kein Editor für die KI-Kosten gefunden. Betreff, Einleitung und Kurztexte stammen aus den Abstracts, die News aus der Einordnung, ohne Hype-Check.";
  } else {
    const strategy = await getPromptOverride("newsletter_draft", svc);
    const { system, prompt } = buildNewsletterDraftPrompt(draftInput, strategy);
    // Mehr Ausgabe als vor PR 203 (Rubriken), darum mehr Tokens und Zeit.
    const res = await callLLMForAuthor(authorId, { system, prompt, maxTokens: 2800, task: "newsletter_draft", timeoutMs: 90_000 });
    if (res.ok) {
      parsed = parseNewsletterDraft(res.text, {
        articles: input.map((a) => a.id),
        news: [...newsById.keys()],
        prompts: [...promptById.keys()],
        podcasts: [...podcastById.keys()],
      });
      if (!parsed) aiNote = "Die KI-Antwort war unbrauchbar. Betreff, Einleitung und Kurztexte stammen aus den Abstracts, die News aus der Einordnung, ohne Hype-Check.";
    } else {
      console.error(`[newsletter:draft] KI fehlgeschlagen (${res.kind}): ${res.message}`);
      aiNote = `KI nicht erreichbar (${res.kind}). Betreff, Einleitung und Kurztexte stammen aus den Abstracts, die News aus der Einordnung, ohne Hype-Check.`;
    }
  }

  // Rubriken: Auswahl der KI, sonst Rangfolge bzw. neuester Eintrag.
  const pickedNews = parsed && parsed.news.length > 0
    ? parsed.news.map((id) => newsById.get(id)).filter((r): r is NewsRow => !!r)
    : newsRows.slice(0, DRAFT_MAX_NEWS);
  // Hype-Check nie zugleich unter den wichtigsten News (auch nicht im Fallback).
  const hypeCandidate = parsed?.hype ? newsById.get(parsed.hype.id) : undefined;
  const hypeRow = hypeCandidate && !pickedNews.some((r) => r.id === hypeCandidate.id) ? hypeCandidate : undefined;
  // Prompt und Podcast: Laesst die KI das Feld leer, obwohl es Kandidaten
  // gibt, gilt die Regel ohne KI (der Editor kann die Rubrik entfernen).
  const promptRow = (parsed?.prompt ? promptById.get(parsed.prompt.id) : undefined) ?? defaultPrompt(promptRows) ?? undefined;
  const podcastRow = (parsed?.podcast ? podcastById.get(parsed.podcast.id) : undefined) ?? podcastRows[0];
  const sections: IssueSections = sanitizeSections({
    news: pickedNews.map(newsToSection),
    hype: hypeRow && parsed?.hype ? newsToHype(hypeRow, parsed.hype.text) : null,
    prompt: promptRow ? promptToPick(promptRow, parsed?.prompt?.teaser) : null,
    podcast: podcastRow ? podcastToPick(podcastRow, SITE_URL, parsed?.podcast?.teaser) : null,
  });

  const items: IssueItem[] = sanitizeItems(
    articles.map((a) => ({
      articleId: a.id,
      slug: a.slug,
      title: a.title,
      teaser: parsed?.teasers[a.id] ?? shorten(stripAllMarkup(a.excerpt ?? ""), TEASER_FALLBACK_CHARS),
      category: a.category?.name_de ?? "",
      coverUrl: absoluteCover(a.cover_image_url),
    })),
  );
  const missingTeasers = parsed ? articles.filter((a) => !parsed?.teasers[a.id]).length : 0;
  if (parsed && missingTeasers > 0) {
    aiNote = `Für ${missingTeasers} Artikel kam kein Kurztext von der KI, dort steht der Abstract.`;
  }
  if (fallbackLatest) {
    const hint = "Seit der letzten Ausgabe ist kein neuer Artikel erschienen. Der Entwurf enthält die neuesten Artikel als Startpunkt.";
    aiNote = aiNote ? `${hint} ${aiNote}` : hint;
  }
  if (articles.length === 0) {
    const hint = "Seit der letzten Ausgabe ist kein neuer Artikel erschienen. Der Entwurf besteht aus den News der Woche und den übrigen Rubriken.";
    aiNote = aiNote ? `${hint} ${aiNote}` : hint;
  }
  const lead = articles[0]?.title ?? sections.news[0]?.title ?? "";
  const subject = parsed?.subject ?? shorten(articles[0] ? `Neu auf digital age: ${lead}` : `Die Woche in KI-News: ${lead}`, 120);
  const intro = parsed?.intro ?? "Das Wichtigste der letzten Tage auf digital age, kurz zusammengefasst.";

  // Offenen, unbearbeiteten (oder ausdruecklich zu ersetzenden) Entwurf erst
  // jetzt verwerfen: Ohne neue Artikel oder bei Fehlern bleibt er bestehen.
  if (open) {
    const { error: discErr } = await svc
      .from("newsletter_issues")
      .update({ status: "discarded" })
      .eq("id", open.id)
      .eq("status", "draft");
    if (discErr) return { kind: "error", message: discErr.message };
  }

  const { data: created, error: insErr } = await svc
    .from("newsletter_issues")
    .insert({
      status: "draft",
      subject,
      intro,
      items,
      sections,
      period_from: period.from.toISOString(),
      period_to: period.to.toISOString(),
      source: opts.source,
      ai_note: aiNote,
      created_by: opts.source === "manual" ? opts.authorId : null,
    })
    .select("id")
    .single();
  if (insErr || !created) return { kind: "error", message: insErr?.message ?? "Entwurf nicht gespeichert." };
  return { kind: "created", issueId: created.id, items: items.length, news: sections.news.length, aiOk: parsed !== null };
}
