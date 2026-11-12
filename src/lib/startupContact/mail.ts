import "server-only";

import { Resend } from "resend";
import { render } from "@react-email/render";
import StartupContactRequest, {
  buildStartupContactSubject,
  type StartupContactMailProps,
} from "@/emails/StartupContactRequest";

// Versand der weitergeleiteten Anfrage. Reply-To = Absender, damit das
// Startup direkt antwortet. Fehlende Env = ok:false, nie ein Throw.
export async function sendStartupContactMail(
  to: string,
  props: StartupContactMailProps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL;
  if (!key || !from) return { ok: false, error: "RESEND_API_KEY oder NEWSLETTER_FROM_EMAIL fehlt" };
  try {
    const html = await render(StartupContactRequest(props));
    const result = await new Resend(key).emails.send({
      from,
      to,
      replyTo: props.senderEmail,
      subject: buildStartupContactSubject(props),
      html,
    });
    if (result.error) {
      console.error("[startup-contact:mail] resend error:", result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[startup-contact:mail] render or send failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
