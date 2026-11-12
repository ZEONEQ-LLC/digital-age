import "server-only";

import { buildNewsletterDraftPrompt, parseNewsletterDraft, type NewsletterDraftArticle } from "@/lib/ai/newsletterPrompts";
import { getPromptOverride } from "@/lib/ai/promptOverrides";
import { callLLMForAuthor } from "@/lib/ai/systemCall";
import { resolveSystemAuthorId } from "@/lib/ai/systemAuthor";
import { DEFAULT_COVER_URL } from "@/lib/coverImage";
import { MAX_ITEMS, nextPeriod, sanitizeItems, type IssueItem } from "@/lib/newsletter/issue";
import { SITE_URL } from "@/lib/newsletter/mail";
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
// Editor verlangt es ausdruecklich (replaceEdited). Ohne neue Artikel bleibt
// alles, wie es ist.

export type DraftResult =
  | { kind: "created"; issueId: string; items: number; aiOk: boolean }
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

function shorten(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:.\s]+$/, "")} …`;
}

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
  // Von Hand ohne neue Artikel (z. B. die erste Ausgabe): die neuesten
  // Artikel als Startpunkt, der Editor kuerzt oder ergaenzt. Der Cron
  // erstellt in dem Fall nichts.
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
  if (articles.length === 0) return { kind: "no_articles", since: period.from.toISOString() };

  // KI: Kosten beim Editor (Knopf) bzw. System-Author (Cron).
  const authorId = opts.authorId ?? (await resolveSystemAuthorId(svc, "NEWSLETTER_AUTHOR_ID"));
  const input: NewsletterDraftArticle[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category?.name_de ?? "",
    abstract: stripAllMarkup(a.excerpt ?? ""),
    bodyStart: stripAllMarkup(a.body_md ?? "").slice(0, 1200),
  }));
  let aiNote: string | null = null;
  let parsed: ReturnType<typeof parseNewsletterDraft> = null;
  if (!authorId) {
    aiNote = "Kein Editor für die KI-Kosten gefunden. Betreff, Einleitung und Kurztexte stammen aus den Abstracts.";
  } else {
    const strategy = await getPromptOverride("newsletter_draft", svc);
    const { system, prompt } = buildNewsletterDraftPrompt(input, strategy);
    const res = await callLLMForAuthor(authorId, { system, prompt, maxTokens: 1600, task: "newsletter_draft" });
    if (res.ok) {
      parsed = parseNewsletterDraft(res.text, input.map((a) => a.id));
      if (!parsed) aiNote = "Die KI-Antwort war unbrauchbar. Betreff, Einleitung und Kurztexte stammen aus den Abstracts.";
    } else {
      console.error(`[newsletter:draft] KI fehlgeschlagen (${res.kind}): ${res.message}`);
      aiNote = `KI nicht erreichbar (${res.kind}). Betreff, Einleitung und Kurztexte stammen aus den Abstracts.`;
    }
  }

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
  const subject = parsed?.subject ?? shorten(`Neu auf digital age: ${articles[0].title}`, 120);
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
      period_from: period.from.toISOString(),
      period_to: period.to.toISOString(),
      source: opts.source,
      ai_note: aiNote,
      created_by: opts.source === "manual" ? opts.authorId : null,
    })
    .select("id")
    .single();
  if (insErr || !created) return { kind: "error", message: insErr?.message ?? "Entwurf nicht gespeichert." };
  return { kind: "created", issueId: created.id, items: items.length, aiOk: parsed !== null };
}
