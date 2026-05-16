import "server-only";

import type { ReactElement } from "react";
import { Resend } from "resend";
import { render } from "@react-email/render";
import ArticlePublished, {
  SUBJECT_PREFIX as ARTICLE_PUBLISHED_SUBJECT_PREFIX,
} from "@/emails/ArticlePublished";
import ArticleSubmittedForReview, {
  SUBJECT_PREFIX as ARTICLE_REVIEW_SUBJECT_PREFIX,
} from "@/emails/ArticleSubmittedForReview";
import { SITE_URL } from "@/lib/newsletter/mail";

type SendResult = { ok: true } | { ok: false; error: string };

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFromEmail(): string | null {
  return process.env.NEWSLETTER_FROM_EMAIL ?? null;
}

function getEditorEmail(): string | null {
  return process.env.NEWSLETTER_REPLY_TO ?? null;
}

function getReplyToDefault(): string | undefined {
  return process.env.NEWSLETTER_REPLY_TO ?? undefined;
}

async function renderAndSend(args: {
  to: string;
  replyTo?: string;
  subject: string;
  element: ReactElement;
  context: string;
}): Promise<SendResult> {
  const resend = getResend();
  const from = getFromEmail();
  if (!resend || !from) {
    console.error(
      `[article:${args.context}] RESEND_API_KEY oder NEWSLETTER_FROM_EMAIL fehlt`,
    );
    return { ok: false, error: "mail provider not configured" };
  }
  try {
    const html = await render(args.element);
    const result = await resend.emails.send({
      from,
      replyTo: args.replyTo,
      to: args.to,
      subject: args.subject,
      html,
    });
    if (result.error) {
      console.error(`[article:${args.context}] resend error:`, result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[article:${args.context}] mail render or send failed:`, err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

// Editor-Notification, wenn ein Author einen Artikel zur Review einreicht.
// Reply-To = Author-Email damit der Editor direkt antworten kann.
// Admin-CTA zeigt auf die Listing-Page — Lehre aus PR #55: ID-Detail-Routen
// im Admin sind nicht garantiert anon-RLS-safe, Listing reicht für Inbox-UX.
export async function sendArticleSubmittedForReviewNotification(args: {
  title: string;
  authorName: string;
  authorEmail: string;
}): Promise<SendResult> {
  const editor = getEditorEmail();
  if (!editor) {
    console.error("[article] NEWSLETTER_REPLY_TO env not set");
    return { ok: false, error: "editor recipient not configured" };
  }
  return renderAndSend({
    to: editor,
    replyTo: args.authorEmail,
    subject: `${ARTICLE_REVIEW_SUBJECT_PREFIX}: ${args.title}`,
    element: ArticleSubmittedForReview({
      title: args.title,
      authorName: args.authorName,
      authorEmail: args.authorEmail,
      adminUrl: `${SITE_URL}/autor/admin/artikel`,
    }),
    context: "submitted-for-review",
  });
}

// Author-Notification, wenn der Editor den Artikel auf published setzt.
// Public-URL ist slug-based: /artikel/[slug].
export async function sendArticlePublishedNotification(args: {
  authorEmail: string;
  authorName: string;
  title: string;
  slug: string;
}): Promise<SendResult> {
  return renderAndSend({
    to: args.authorEmail,
    replyTo: getReplyToDefault(),
    subject: `${ARTICLE_PUBLISHED_SUBJECT_PREFIX}: ${args.title}`,
    element: ArticlePublished({
      authorName: args.authorName,
      title: args.title,
      liveUrl: `${SITE_URL}/artikel/${args.slug}`,
    }),
    context: "published",
  });
}
