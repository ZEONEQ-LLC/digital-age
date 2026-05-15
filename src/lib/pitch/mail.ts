import "server-only";

import type { ReactElement } from "react";
import { Resend } from "resend";
import { render } from "@react-email/render";
import PitchNotification, {
  SUBJECT_PREFIX as PITCH_SUBJECT_PREFIX,
} from "@/emails/PitchNotification";
import PitchConfirmation, {
  SUBJECT as PITCH_CONFIRMATION_SUBJECT,
} from "@/emails/PitchConfirmation";
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
      `[pitch:${args.context}] RESEND_API_KEY oder NEWSLETTER_FROM_EMAIL fehlt`,
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
      console.error(`[pitch:${args.context}] resend error:`, result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[pitch:${args.context}] mail render or send failed:`, err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function sendPitchNotification(args: {
  id: string;
  title: string;
  excerpt: string;
  bodyMd: string;
  category?: string | null;
  authorName: string;
  authorEmail: string;
  authorRole?: string | null;
  authorBio: string;
  authorWebsite?: string | null;
}): Promise<SendResult> {
  const editor = getEditorEmail();
  if (!editor) {
    console.error("[pitch] NEWSLETTER_REPLY_TO env not set");
    return { ok: false, error: "editor recipient not configured" };
  }
  return renderAndSend({
    to: editor,
    replyTo: args.authorEmail,
    subject: `${PITCH_SUBJECT_PREFIX}: ${args.title}`,
    element: PitchNotification({
      id: args.id,
      title: args.title,
      excerpt: args.excerpt,
      bodyMd: args.bodyMd,
      category: args.category,
      authorName: args.authorName,
      authorEmail: args.authorEmail,
      authorRole: args.authorRole,
      authorBio: args.authorBio,
      authorWebsite: args.authorWebsite,
      siteUrl: SITE_URL,
    }),
    context: "notification",
  });
}

export async function sendPitchConfirmation(args: {
  authorName: string;
  authorEmail: string;
  title: string;
}): Promise<SendResult> {
  return renderAndSend({
    to: args.authorEmail,
    replyTo: getReplyToDefault(),
    subject: PITCH_CONFIRMATION_SUBJECT,
    element: PitchConfirmation({
      authorName: args.authorName,
      title: args.title,
    }),
    context: "confirmation",
  });
}
