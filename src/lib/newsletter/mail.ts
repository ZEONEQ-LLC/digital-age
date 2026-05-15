import "server-only";

import type { ReactElement } from "react";
import { Resend } from "resend";
import { render } from "@react-email/render";
import NewsletterConfirmation, {
  SUBJECT as CONFIRMATION_SUBJECT,
} from "@/emails/NewsletterConfirmation";
import NewsletterWelcome, {
  SUBJECT as WELCOME_SUBJECT,
} from "@/emails/NewsletterWelcome";
import AuthorInvite, {
  SUBJECT as INVITE_SUBJECT,
} from "@/emails/AuthorInvite";

// SITE_URL aus Env, sonst Vercel-Preview-Fallback. Wird im Resend-Mailing
// für absolute Links genutzt (Confirmation, Unsubscribe, Invite, CTA).
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://digital-age-v2-eight.vercel.app";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFromEmail(): string | null {
  return process.env.NEWSLETTER_FROM_EMAIL ?? null;
}

function getReplyTo(): string | undefined {
  return process.env.NEWSLETTER_REPLY_TO ?? undefined;
}

type SendResult = { ok: true } | { ok: false; error: string };

// Gemeinsamer Send-Pfad: rendert das Template via React-Email, schickt
// via Resend SDK, und fängt SOWOHL Render- als auch Send-Errors in
// einem Try/Catch — sonst würden React-Email-Render-Exceptions (z.B.
// Tailwind-Klassen-Scan ohne <Head>) den ganzen Server-Action-Call
// in die nicht-ok-Region treiben.
async function renderAndSend(args: {
  to: string;
  subject: string;
  element: ReactElement;
  context: string;
}): Promise<SendResult> {
  const resend = getResend();
  const from = getFromEmail();
  if (!resend || !from) {
    console.error(
      `[newsletter:${args.context}] RESEND_API_KEY oder NEWSLETTER_FROM_EMAIL fehlt`,
    );
    return { ok: false, error: "mail provider not configured" };
  }
  try {
    const html = await render(args.element);
    const result = await resend.emails.send({
      from,
      replyTo: getReplyTo(),
      to: args.to,
      subject: args.subject,
      html,
    });
    if (result.error) {
      console.error(`[newsletter:${args.context}] resend error:`, result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error(
      `[newsletter:${args.context}] mail render or send failed:`,
      err,
    );
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function sendConfirmationMail(args: {
  email: string;
  token: string;
}): Promise<SendResult> {
  const confirmationUrl = `${SITE_URL}/newsletter/confirm/${args.token}`;
  return renderAndSend({
    to: args.email,
    subject: CONFIRMATION_SUBJECT,
    element: NewsletterConfirmation({ confirmationUrl }),
    context: "confirmation",
  });
}

export async function sendWelcomeMail(args: {
  email: string;
  token: string;
}): Promise<SendResult> {
  const unsubscribeUrl = `${SITE_URL}/newsletter/abmelden/${args.token}`;
  return renderAndSend({
    to: args.email,
    subject: WELCOME_SUBJECT,
    element: NewsletterWelcome({ unsubscribeUrl }),
    context: "welcome",
  });
}

export async function sendInviteMail(args: {
  email: string;
  token: string;
  displayName?: string | null;
  intendedRole?: "author" | "editor";
}): Promise<SendResult> {
  const inviteUrl = `${SITE_URL}/onboarding?token=${args.token}`;
  return renderAndSend({
    to: args.email,
    subject: INVITE_SUBJECT,
    element: AuthorInvite({
      inviteUrl,
      displayName: args.displayName ?? null,
      intendedRole: args.intendedRole,
    }),
    context: "invite",
  });
}
