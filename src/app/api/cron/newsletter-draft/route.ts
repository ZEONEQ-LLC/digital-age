import { NextResponse } from "next/server";
import { render } from "@react-email/render";
import { Resend } from "resend";
import NewsletterDraftReady, { draftReadySubject } from "@/emails/NewsletterDraftReady";
import { createNewsletterDraft } from "@/lib/newsletter/draftJob";
import { sanitizeSections } from "@/lib/newsletter/issue";
import { SITE_URL } from "@/lib/newsletter/mail";
import { createServiceClient } from "@/lib/supabase/service";

// Newsletter-Entwurf (vercel.json "30 5 * * 1", Montag frueh, PR 195): neue
// Artikel und Rubriken (News, Hype-Check, Prompt, Podcast; PR 203) seit der
// letzten Ausgabe, KI-Texte, danach ein Hinweis an die Redaktion
// (NEWSLETTER_REPLY_TO). Versendet wird nie automatisch, nur nach Freigabe im
// Admin. Ohne neue Artikel und mit weniger als drei News: nichts, keine Mail.
// Schutz wie die anderen Crons: CRON_SECRET als Bearer, ohne Secret 503.
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const NO_STORE = { "Cache-Control": "no-store" };
const ADMIN_PATH = "/autor/admin/newsletter/ausgaben";

async function notifyEditor(p: { kind: "created" | "waiting"; issueId: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL;
  const to = process.env.NEWSLETTER_REPLY_TO;
  if (!key || !from || !to) {
    console.error("[newsletter:cron] Hinweis-Mail nicht konfiguriert (RESEND_API_KEY, NEWSLETTER_FROM_EMAIL, NEWSLETTER_REPLY_TO).");
    return false;
  }
  const { data } = await createServiceClient()
    .from("newsletter_issues")
    .select("subject, items, sections, ai_note")
    .eq("id", p.issueId)
    .maybeSingle();
  if (!data) return false;
  const items = Array.isArray(data.items) ? data.items.length : 0;
  const news = sanitizeSections(data.sections).news.length;
  try {
    const html = await render(
      NewsletterDraftReady({ kind: p.kind, subject: data.subject, items, news, adminUrl: `${SITE_URL}${ADMIN_PATH}`, aiNote: data.ai_note }),
    );
    const res = await new Resend(key).emails.send({ from, to, subject: draftReadySubject({ kind: p.kind, items, news }), html });
    if (res.error) {
      console.error("[newsletter:cron] Hinweis-Mail fehlgeschlagen:", res.error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[newsletter:cron] Hinweis-Mail fehlgeschlagen:", err);
    return false;
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "cron secret missing" }, { status: 503, headers: NO_STORE });
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  try {
    const res = await createNewsletterDraft({ source: "cron", authorId: null });
    if (res.kind === "error") {
      console.error("[newsletter:cron] Entwurf fehlgeschlagen:", res.message);
      return NextResponse.json({ ok: false, error: res.message }, { status: 500, headers: NO_STORE });
    }
    let notified = false;
    if (res.kind === "created") notified = await notifyEditor({ kind: "created", issueId: res.issueId });
    if (res.kind === "kept_edited") notified = await notifyEditor({ kind: "waiting", issueId: res.issueId });
    return NextResponse.json({ ok: true, result: res.kind, notified }, { headers: NO_STORE });
  } catch (err) {
    console.error("[newsletter:cron] run failed:", err);
    return NextResponse.json({ ok: false, error: "run failed" }, { status: 500, headers: NO_STORE });
  }
}
