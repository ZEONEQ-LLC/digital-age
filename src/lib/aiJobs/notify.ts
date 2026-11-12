import "server-only";
import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { Resend } from "resend";

// Hinweis-Mail der Hintergrund-Jobs an die Redaktion (NEWSLETTER_REPLY_TO).
export async function notifyEditor(subject: string, element: ReactElement): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL;
  const to = process.env.NEWSLETTER_REPLY_TO;
  if (!key || !from || !to) {
    console.error("[ai-jobs] Hinweis-Mail nicht konfiguriert (RESEND_API_KEY, NEWSLETTER_FROM_EMAIL, NEWSLETTER_REPLY_TO).");
    return false;
  }
  try {
    const html = await render(element);
    const res = await new Resend(key).emails.send({ from, to, subject, html });
    if (res.error) {
      console.error("[ai-jobs] Hinweis-Mail fehlgeschlagen:", res.error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[ai-jobs] Hinweis-Mail fehlgeschlagen:", err);
    return false;
  }
}
