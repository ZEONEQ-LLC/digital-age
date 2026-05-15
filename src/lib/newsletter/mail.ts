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

// SITE_URL für Mails. Robust gegen die Fallstricke:
//   - `??` greift nur bei undefined; ein leer-gesetztes Env-Var (`""`)
//     würde durchschlagen und zu relativen Pfaden in der Mail führen,
//     die der Mail-Client mit `x-webdoc://` prefixed.
//   - Ein Wert ohne Scheme (z.B. `digital-age.ch`) erzeugt im
//     Mail-Client ebenfalls einen kaputten Link. Wir prependen `https://`
//     wenn das Scheme fehlt.
//   - Trailing-Slash entfernen, sonst werden Pfade `//newsletter/...`
//     zusammengesetzt.
//
// Reihenfolge:
//   1. NEWSLETTER_SITE_URL (server-only Override, kein NEXT_PUBLIC-Inlining)
//   2. NEXT_PUBLIC_SITE_URL (wird beim Build inlined, server+client)
//   3. Production-Fallback
function resolveSiteUrl(): string {
  const raw =
    process.env.NEWSLETTER_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://digital-age-v2-eight.vercel.app";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

export const SITE_URL = resolveSiteUrl();

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
  // Temporäres Debug-Log — kann wieder raus sobald Bug verifiziert behoben.
  console.log("[newsletter] NEWSLETTER_SITE_URL env:", JSON.stringify(process.env.NEWSLETTER_SITE_URL));
  console.log("[newsletter] NEXT_PUBLIC_SITE_URL env:", JSON.stringify(process.env.NEXT_PUBLIC_SITE_URL));
  console.log("[newsletter] resolved SITE_URL:", SITE_URL);
  console.log("[newsletter] confirmationUrl:", confirmationUrl);
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
  console.log("[newsletter] unsubscribeUrl:", unsubscribeUrl);
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
  console.log("[newsletter] inviteUrl:", inviteUrl);
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
