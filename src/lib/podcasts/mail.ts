import "server-only";

import { Resend } from "resend";
import { render } from "@react-email/render";
import PodcastDraftReady, { buildSubject, type PodcastDraftMailProps } from "@/emails/PodcastDraftReady";
import { SITE_URL } from "@/lib/newsletter/mail";

// Mail an den Empfehler nach der Anreicherung (Ingest per Kurzbefehl).
// Gleiches Muster wie src/lib/articles/mail.ts: fehlende Env = Log + ok:false,
// nie ein Throw, damit der Ingest-Status davon unberuehrt bleibt.

type SendResult = { ok: true } | { ok: false; error: string };

export const REVIEW_URL = `${SITE_URL}/autor/freigaben`;

export async function sendPodcastDraftNotification(args: {
  to: string;
  props: Omit<PodcastDraftMailProps, "reviewUrl">;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL;
  if (!key || !from) {
    console.error("[podcast-ingest:mail] RESEND_API_KEY oder NEWSLETTER_FROM_EMAIL fehlt");
    return { ok: false, error: "mail provider not configured" };
  }
  try {
    const props: PodcastDraftMailProps = { ...args.props, reviewUrl: REVIEW_URL };
    const html = await render(PodcastDraftReady(props));
    const result = await new Resend(key).emails.send({
      from,
      to: args.to,
      replyTo: process.env.NEWSLETTER_REPLY_TO ?? undefined,
      subject: buildSubject(props),
      html,
    });
    if (result.error) {
      console.error("[podcast-ingest:mail] resend error:", result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[podcast-ingest:mail] render or send failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
