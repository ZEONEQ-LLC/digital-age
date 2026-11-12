import "server-only";
import type { ReactElement } from "react";
import { Resend } from "resend";
import { render } from "@react-email/render";

// Versand der Kundenmails der Werbung (Ablaufwarnung, Abschlussbericht).
// Absender wie der Newsletter, Antworten gehen an die Redaktion. Render- und
// Sendefehler kommen als Wert zurueck; der Job entscheidet (nicht markieren).
export type AdMailResult = { ok: true } | { ok: false; error: string };

export function getEditorEmail(): string | null {
  return process.env.NEWSLETTER_REPLY_TO ?? null;
}

// Kunde plus Kopie an die Redaktion (ohne Dublette).
export function recipientsWithEditorCopy(customer: string): string[] {
  const editor = getEditorEmail();
  return editor && editor !== customer ? [customer, editor] : [customer];
}

export async function sendAdMail(args: { to: string[]; subject: string; element: ReactElement }): Promise<AdMailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL;
  if (!key || !from) return { ok: false, error: "RESEND_API_KEY oder NEWSLETTER_FROM_EMAIL fehlt" };
  try {
    const html = await render(args.element);
    const result = await new Resend(key).emails.send({
      from,
      replyTo: process.env.NEWSLETTER_REPLY_TO ?? undefined,
      to: args.to,
      subject: args.subject,
      html,
    });
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
