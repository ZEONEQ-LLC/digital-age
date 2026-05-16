import "server-only";

import type { ReactElement } from "react";
import { Resend } from "resend";
import { render } from "@react-email/render";
import ContactNotification, {
  SUBJECT_PREFIX as CONTACT_SUBJECT_PREFIX,
} from "@/emails/ContactNotification";
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
  // Editor-Notifications gehen an dieselbe Adresse wie der Reply-To-
  // Newsletter-Header. Pragmatische Wiederverwendung — bei Bedarf später
  // auf eigene Env-Var EDITOR_NOTIFICATION_EMAIL umschalten.
  return process.env.NEWSLETTER_REPLY_TO ?? null;
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
      `[contact:${args.context}] RESEND_API_KEY oder NEWSLETTER_FROM_EMAIL fehlt`,
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
      console.error(`[contact:${args.context}] resend error:`, result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error(
      `[contact:${args.context}] mail render or send failed:`,
      err,
    );
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function sendContactNotification(args: {
  id: string;
  name: string;
  email: string;
  topic: string;
  organization?: string | null;
  message: string;
}): Promise<SendResult> {
  const editor = getEditorEmail();
  if (!editor) {
    console.error("[contact] NEWSLETTER_REPLY_TO env not set");
    return { ok: false, error: "editor recipient not configured" };
  }
  return renderAndSend({
    to: editor,
    replyTo: args.email,
    subject: `${CONTACT_SUBJECT_PREFIX}: ${args.topic}`,
    element: ContactNotification({
      id: args.id,
      name: args.name,
      email: args.email,
      topic: args.topic,
      organization: args.organization,
      message: args.message,
      siteUrl: SITE_URL,
    }),
    context: "notification",
  });
}
