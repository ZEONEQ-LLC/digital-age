import "server-only";

import { Resend } from "resend";
import { render } from "@react-email/render";
import ModelCheckReport, { buildModelCheckSubject, type ModelCheckMailItem } from "@/emails/ModelCheckReport";
import { SITE_URL } from "@/lib/newsletter/mail";

// Wochenmail des Modell-Checks an die Redaktion (NEWSLETTER_REPLY_TO, wie
// die Ablaufwarnungen der Werbung). Fehlende Env = ok:false, nie ein Throw.

export const MODEL_CHECK_URL = `${SITE_URL}/autor/admin/ai-config/modell-check`;

export async function sendModelCheckMail(args: {
  newItems: ModelCheckMailItem[];
  errors: string[];
  totalItems: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL;
  const to = process.env.NEWSLETTER_REPLY_TO;
  if (!key || !from || !to) return { ok: false, error: "RESEND_API_KEY, NEWSLETTER_FROM_EMAIL oder NEWSLETTER_REPLY_TO fehlt" };
  try {
    const props = { items: args.newItems, errors: args.errors, totalItems: args.totalItems, adminUrl: MODEL_CHECK_URL };
    const html = await render(ModelCheckReport(props));
    const result = await new Resend(key).emails.send({ from, to, subject: buildModelCheckSubject(props), html });
    if (result.error) {
      console.error("[model-check:mail] resend error:", result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[model-check:mail] render or send failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
