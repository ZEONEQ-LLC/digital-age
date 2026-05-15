import "server-only";

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

async function sendOrLog(args: {
  to: string;
  subject: string;
  html: string;
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
  const result = await resend.emails.send({
    from,
    replyTo: getReplyTo(),
    to: args.to,
    subject: args.subject,
    html: args.html,
  });
  if (result.error) {
    console.error(`[newsletter:${args.context}] resend error:`, result.error);
    return { ok: false, error: result.error.message };
  }
  return { ok: true };
}

export async function sendConfirmationMail(args: {
  email: string;
  token: string;
}): Promise<SendResult> {
  const confirmationUrl = `${SITE_URL}/newsletter/confirm/${args.token}`;
  const html = await render(NewsletterConfirmation({ confirmationUrl }));
  return sendOrLog({
    to: args.email,
    subject: CONFIRMATION_SUBJECT,
    html,
    context: "confirmation",
  });
}

export async function sendWelcomeMail(args: {
  email: string;
  token: string;
}): Promise<SendResult> {
  const unsubscribeUrl = `${SITE_URL}/newsletter/abmelden/${args.token}`;
  const html = await render(NewsletterWelcome({ unsubscribeUrl }));
  return sendOrLog({
    to: args.email,
    subject: WELCOME_SUBJECT,
    html,
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
  const html = await render(
    AuthorInvite({
      inviteUrl,
      displayName: args.displayName ?? null,
      intendedRole: args.intendedRole,
    }),
  );
  return sendOrLog({
    to: args.email,
    subject: INVITE_SUBJECT,
    html,
    context: "invite",
  });
}
