import "server-only";

import { render } from "@react-email/render";
import { Resend } from "resend";

import ShowcaseInvite, { showcaseInviteSubject, type ShowcaseInviteProps } from "@/emails/ShowcaseInvite";
import ShowcaseReceived, { SHOWCASE_RECEIVED_SUBJECT, type ShowcaseReceivedProps } from "@/emails/ShowcaseReceived";
import ShowcaseSubmitted, { showcaseSubmittedSubject, type ShowcaseSubmittedProps } from "@/emails/ShowcaseSubmitted";

// Mails des Showcase-Fragebogens. Fehlende Env = ok:false, nie ein Throw
// (Muster startupContact/mail.ts). Antworten gehen an die Redaktion.

type SendResult = { ok: true } | { ok: false; error: string };

async function send(args: { to: string; subject: string; html: string; context: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL;
  if (!key || !from) return { ok: false, error: "RESEND_API_KEY oder NEWSLETTER_FROM_EMAIL fehlt" };
  try {
    const replyTo = process.env.NEWSLETTER_REPLY_TO?.trim();
    const result = await new Resend(key).emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      ...(replyTo ? { replyTo } : {}),
    });
    if (result.error) {
      console.error(`[showcase:${args.context}] resend error:`, result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[showcase:${args.context}] send failed:`, err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

// Einladung oder Erinnerung an das Unternehmen. test = an die eigene Adresse
// der Redaktion, Betreff mit «[Test]».
export async function sendShowcaseInviteMail(
  to: string,
  props: ShowcaseInviteProps,
  opts: { test?: boolean } = {},
): Promise<SendResult> {
  try {
    const html = await render(ShowcaseInvite(props));
    return await send({ to, subject: showcaseInviteSubject(props.reminder === true, opts.test === true), html, context: "invite" });
  } catch (err) {
    console.error("[showcase:invite] render failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function sendShowcaseReceivedMail(to: string, props: ShowcaseReceivedProps): Promise<SendResult> {
  try {
    const html = await render(ShowcaseReceived(props));
    return await send({ to, subject: SHOWCASE_RECEIVED_SUBJECT, html, context: "received" });
  } catch (err) {
    console.error("[showcase:received] render failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

// An die Redaktion (NEWSLETTER_REPLY_TO, wie bei den anderen Meldungen).
export async function sendShowcaseSubmittedMail(props: ShowcaseSubmittedProps): Promise<SendResult> {
  const to = process.env.NEWSLETTER_REPLY_TO?.trim();
  if (!to) return { ok: false, error: "NEWSLETTER_REPLY_TO fehlt" };
  try {
    const html = await render(ShowcaseSubmitted(props));
    return await send({ to, subject: showcaseSubmittedSubject(props.company), html, context: "submitted" });
  } catch (err) {
    console.error("[showcase:submitted] render failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
