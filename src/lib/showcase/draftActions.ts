"use server";

import { revalidatePath } from "next/cache";

import { FormError, runAction, type ActionResult } from "@/lib/actionResult";
import { callLLM } from "@/lib/ai/client";
import { getPromptOverride } from "@/lib/ai/promptOverrides";
import { isArticleSlugConflict, slugFromTitle } from "@/lib/articleSlug";
import { PREVIEW_VALID_DAYS, previewLinkPath, previewLinkState } from "@/lib/articles/preview";
import { getActivePreviewLink } from "@/lib/articles/previewApi";
import { renderBlockDocumentToMarkdown } from "@/lib/blockDocumentMarkdown";
import { SHOWCASE_CATEGORY_SLUG } from "@/lib/contentType";
import type { Json } from "@/lib/database.types";
import { findOrCreateGuestAuthor } from "@/lib/guestAuthor";
import { SITE_URL } from "@/lib/newsletter/mail";
import { pitchToDocument } from "@/lib/pitch/draftFromPitch";
import {
  answersToMarkdown,
  buildShowcaseDraftPrompt,
  draftNotes,
  enforceAllowedLinks,
  fallbackTitle,
  ownTextToMarkdown,
  parseShowcaseDraft,
  type DraftMode,
  type ShowcaseDraftOutput,
} from "@/lib/showcase/draft";
import { mediaPublicUrl } from "@/lib/showcase/inviteApi";
import { sendShowcaseDraftReadyMail } from "@/lib/showcase/mail";
import { firstName, formatLongDate, type AnswerKey } from "@/lib/showcase/questionnaire";
import { createClient } from "@/lib/supabase/server";

// Showcase S3b: Entwurf aus dem Fragebogen erzeugen und dem Unternehmen zur
// Freigabe schicken. Sitzungs-Client: RLS laesst nur Editor:innen an
// showcase_submissions, articles (fremder Autor) und article_preview_links.
//
// Kein Weg ueber den Tiptap-Paste-Pfad: Der Markdown-Text geht durch dieselbe
// Pipeline wie «Pitch -> Entwurf» (pitchToDocument, MD-Cleanup).

const ADMIN_PATH = "/autor/admin/startups";

async function requireEditor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new FormError("Nicht eingeloggt.");
  const { data: me } = await supabase.from("authors").select("id, role, email").eq("user_id", user.id).maybeSingle();
  if (!me) throw new FormError("Author-Profil nicht gefunden.");
  if (me.role !== "editor") throw new FormError("Nur Editor:innen.");
  return { supabase, me };
}

type StartupForDraft = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  industry: string;
  city: string;
  founded_year: number | null;
  status: string;
  affiliation_note: string | null;
};

export type ShowcaseDraftResult = {
  articleId: string;
  // false = es gab schon einen Entwurf, es wurde nichts erzeugt.
  created: boolean;
  authorCreated: boolean;
  // false = die KI war nicht erreichbar oder ihre Antwort unbrauchbar; der
  // Entwurf enthaelt dann die Antworten bzw. den eigenen Text ohne Titel und
  // LinkedIn-Texte.
  aiOk: boolean;
  notes: string[];
};

// Entwurf erzeugen. Pro Einreichung gibt es einen Entwurf: Besteht er schon,
// kommt er zurueck (kein zweiter KI-Aufruf). Zum Neuerzeugen den Entwurf im
// Editor loeschen, dann hier nochmals klicken.
export async function createShowcaseDraft(submissionId: string): Promise<ActionResult<ShowcaseDraftResult>> {
  return runAction("showcase.createDraft", async () => {
    const { supabase } = await requireEditor();

    const { data: sub } = await supabase
      .from("showcase_submissions")
      .select(
        "id, status, startup_id, article_id, contact_name, contact_role, contact_email, answers, own_text, links, image_path, consent_media_rights, startup:ai_startups(id, name, slug, tagline, industry, city, founded_year, status, affiliation_note)",
      )
      .eq("id", submissionId)
      .maybeSingle();
    if (!sub) throw new FormError("Einreichung nicht gefunden.");
    if (sub.status !== "submitted") throw new FormError("Der Fragebogen ist noch nicht abgeschickt.");
    const startup = sub.startup as StartupForDraft | null;
    if (!startup) throw new FormError("Unternehmen nicht gefunden.");
    if (startup.status !== "published" && startup.status !== "featured") {
      throw new FormError("Das Unternehmen ist nicht mehr im Verzeichnis sichtbar. Ein Beitrag liesse sich nicht publizieren.");
    }
    if (!sub.contact_name || !sub.contact_email) throw new FormError("In der Einreichung fehlt die Kontaktperson.");

    if (sub.article_id) {
      const { data: existing } = await supabase.from("articles").select("id").eq("id", sub.article_id).maybeSingle();
      if (existing) return { articleId: existing.id, created: false, authorCreated: false, aiOk: true, notes: [] };
    }

    const answers = (sub.answers ?? {}) as Record<string, string>;
    const links = Array.isArray(sub.links) ? (sub.links as unknown[]).filter((l): l is string => typeof l === "string") : [];
    const mode: DraftMode = sub.own_text ? "own_text" : "questions";
    const quote = answers.quote ?? "";
    const quoteBy = answers.quote_by ?? "";

    const { data: category } = await supabase.from("categories").select("id").eq("slug", SHOWCASE_CATEGORY_SLUG).maybeSingle();
    if (!category) throw new FormError("Die Kategorie «Showcase» fehlt in der Datenbank.");

    // KI: Kosten und Stundenlimit beim Editor (callLLM). Name und E-Mail der
    // Kontaktperson gehen nicht an die KI, nur die Antworten und das Zitat.
    const strategy = await getPromptOverride("showcase_draft", supabase);
    const { system, prompt } = buildShowcaseDraftPrompt(
      {
        mode,
        company: { name: startup.name, tagline: startup.tagline, industry: startup.industry, city: startup.city, foundedYear: startup.founded_year },
        answers: answers as Partial<Record<AnswerKey, string>>,
        quote,
        quoteBy,
        ownText: sub.own_text ?? "",
        links,
      },
      strategy,
    );
    const res = await callLLM({ system, prompt, maxTokens: mode === "questions" ? 4500 : 1500, task: "showcase_draft", timeoutMs: 150_000 });
    let parsed: ShowcaseDraftOutput | null = null;
    const warnings: string[] = [];
    if (res.ok) {
      parsed = parseShowcaseDraft(res.text, mode);
      if (!parsed) warnings.push("Die Antwort der KI war unbrauchbar. Der Entwurf enthält die Angaben des Unternehmens ohne Bearbeitung.");
    } else if (res.kind === "rate_limit") {
      throw new FormError("Das Stundenlimit für KI-Aufrufe ist erreicht. Bitte später nochmals versuchen.");
    } else {
      console.error(`[showcase:draft] KI fehlgeschlagen (${res.kind}): ${res.message}`);
      warnings.push(`Die KI war nicht erreichbar (${res.kind}). Der Entwurf enthält die Angaben des Unternehmens ohne Bearbeitung.`);
    }

    // Text: eigener Text bleibt woertlich; sonst der Entwurf der KI, im
    // Notfall die Antworten als Abschnitte.
    const rawBody =
      mode === "own_text"
        ? ownTextToMarkdown(sub.own_text ?? "")
        : parsed?.body || answersToMarkdown(answers as Partial<Record<AnswerKey, string>>, quote, quoteBy);
    const linked = enforceAllowedLinks(rawBody, links);
    const title = parsed?.title || fallbackTitle(startup.name);
    const { doc, warnings: docWarnings } = pitchToDocument(linked.md, title);
    const bodyMd = renderBlockDocumentToMarkdown(doc);

    const author = await findOrCreateGuestAuthor(supabase, {
      name: sub.contact_name,
      email: sub.contact_email,
      jobTitle: sub.contact_role ? `${sub.contact_role}, ${startup.name}` : startup.name,
    });

    const imageUrl = sub.consent_media_rights ? mediaPublicUrl(sub.image_path) : null;
    const notes = draftNotes({
      mode,
      body: bodyMd,
      quote,
      removedLinks: linked.removed,
      bareLinks: linked.bare,
      aiNotes: parsed?.notes ?? [],
      affiliated: !!startup.affiliation_note,
      hasImage: !!imageUrl,
      parserWarnings: [...warnings, ...docWarnings],
      linkedin: parsed?.linkedin ?? [],
    });

    const baseSlug = slugFromTitle(title) || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const insertWith = (slug: string) =>
      supabase
        .from("articles")
        .insert({
          title,
          slug,
          excerpt: parsed?.excerpt || null,
          category_id: category.id,
          author_id: author.id,
          status: "draft",
          body_md: bodyMd,
          body_blocks: doc as unknown as Json,
          content_type: "company",
          startup_id: startup.id,
          is_paid: false,
          cover_image_url: imageUrl,
          cover_image_source: imageUrl ? startup.name : null,
        })
        .select("id")
        .single();
    let inserted = await insertWith(baseSlug);
    for (let n = 2; n <= 20 && isArticleSlugConflict(inserted.error); n++) {
      inserted = await insertWith(`${baseSlug}-${n}`);
    }
    if (inserted.error) throw inserted.error;
    const articleId = inserted.data.id;

    const { error: linkErr } = await supabase
      .from("showcase_submissions")
      .update({
        article_id: articleId,
        draft_created_at: new Date().toISOString(),
        draft_notes: notes,
        linkedin_texts: parsed?.linkedin ?? [],
        draft_ready_sent_at: null,
      })
      .eq("id", submissionId);
    if (linkErr) {
      // Der Entwurf existiert, haengt aber nicht an der Einreichung: sichtbar
      // machen statt still einen zweiten zu erzeugen.
      console.error("[showcase:draft] Entwurf nicht verknuepft:", linkErr.message);
      throw new FormError("Der Entwurf wurde angelegt, liess sich aber nicht mit der Einreichung verknüpfen. Er steht unter «Alle Artikel».");
    }

    revalidatePath(ADMIN_PATH);
    revalidatePath("/autor/artikel");
    return { articleId, created: true, authorCreated: author.created, aiOk: parsed !== null, notes };
  });
}

// Entwurf dem Unternehmen zur Freigabe schicken (oder als Test an die eigene
// Adresse). Nutzt den Vorschau-Link des Beitrags (PR 212): Ein gueltiger Link
// bleibt, sonst entsteht ein neuer. Die Rueckmeldung (Freigabe oder
// Aenderungswunsch) kommt ueber dieselbe Seite und per Mail an die Redaktion.
export async function sendShowcaseDraftReady(
  submissionId: string,
  mode: "send" | "test",
): Promise<ActionResult<{ to: string }>> {
  return runAction("showcase.sendDraftReady", async () => {
    const { supabase, me } = await requireEditor();
    const { data: sub } = await supabase
      .from("showcase_submissions")
      .select("id, status, article_id, contact_name, contact_email, own_text, draft_ready_sent_at, startup:ai_startups(name)")
      .eq("id", submissionId)
      .maybeSingle();
    if (!sub) throw new FormError("Einreichung nicht gefunden.");
    if (!sub.article_id) throw new FormError("Zu dieser Einreichung gibt es noch keinen Entwurf.");
    const { data: article } = await supabase
      .from("articles")
      .select("id, title, status, excerpt, cover_image_url, cover_image_alt")
      .eq("id", sub.article_id)
      .maybeSingle();
    if (!article) throw new FormError("Der Entwurf wurde gelöscht. Bitte neu erzeugen.");
    if (article.status === "published") throw new FormError("Der Beitrag ist bereits veröffentlicht.");
    if (article.status === "archived") throw new FormError("Der Beitrag ist archiviert.");
    // Abstract und Bildbeschreibung gehoeren zur Fassung, die das Unternehmen
    // freigibt, und sind Pflicht beim Publizieren. Fehlen sie jetzt, gilt die
    // Freigabe nach dem Ergaenzen nicht mehr fuer die aktuelle Fassung.
    if (mode === "send") {
      const missing: string[] = [];
      if (!article.excerpt?.trim()) missing.push("Abstract");
      if (article.cover_image_url?.trim() && !article.cover_image_alt?.trim()) missing.push("Bildbeschreibung (Alt-Text) zum Titelbild");
      if (missing.length > 0) {
        throw new FormError(`Bitte zuerst im Editor ergänzen: ${missing.join(", ")}. Sonst gilt die Freigabe danach nicht mehr für die fertige Fassung.`);
      }
    }

    const to = mode === "test" ? me.email : sub.contact_email;
    if (!to) throw new FormError(mode === "test" ? "In deinem Profil fehlt die E-Mail-Adresse." : "In der Einreichung fehlt die E-Mail-Adresse.");

    // Vorschau-Link: bestehenden nehmen, solange er gilt (eine fruehere
    // Rueckmeldung bleibt daran sichtbar), sonst einen neuen anlegen.
    let link = await getActivePreviewLink(supabase, article.id);
    const now = new Date();
    if (!link || previewLinkState(link, now.getTime()) !== "active") {
      if (link) {
        const { error: revokeErr } = await supabase
          .from("article_preview_links")
          .update({ revoked_at: now.toISOString() })
          .eq("id", link.id);
        if (revokeErr) throw new FormError("Der bisherige Vorschau-Link liess sich nicht ersetzen.");
      }
      const expires = new Date(now.getTime() + PREVIEW_VALID_DAYS * 24 * 60 * 60 * 1000);
      const { data: created, error } = await supabase
        .from("article_preview_links")
        .insert({ article_id: article.id, created_by: me.id, expires_at: expires.toISOString() })
        .select("*")
        .single();
      if (error || !created) throw new FormError("Der Vorschau-Link liess sich nicht erstellen.");
      link = created;
    }

    const sent = await sendShowcaseDraftReadyMail(
      to,
      {
        firstName: firstName(sub.contact_name),
        company: (sub.startup as { name: string } | null)?.name ?? "euer Unternehmen",
        title: article.title,
        link: `${SITE_URL}${previewLinkPath(link.token)}`,
        // Der Tag vor dem Ablauf (Zuercher Kalender): An dem gilt der Link sicher noch ganz.
        validUntil: formatLongDate(
          new Date(new Date(link.expires_at).getTime() - 24 * 60 * 60 * 1000).toLocaleDateString("sv-SE", { timeZone: "Europe/Zurich" }),
        ),
        again: !!sub.draft_ready_sent_at,
        aiDrafted: !sub.own_text,
      },
      { test: mode === "test" },
    );
    if (!sent.ok) throw new FormError("Die Mail konnte nicht gesendet werden. Bitte später nochmals versuchen.");

    if (mode === "send") {
      const { error } = await supabase
        .from("showcase_submissions")
        .update({ draft_ready_sent_at: now.toISOString() })
        .eq("id", submissionId);
      if (error) throw error;
      revalidatePath(ADMIN_PATH);
    }
    return { to };
  });
}
