import "server-only";

import { createHash } from "node:crypto";
import { render } from "@react-email/render";
import { Resend } from "resend";
import NewsletterIssue from "@/emails/NewsletterIssue";
import {
  UNSUBSCRIBE_PLACEHOLDER,
  formatIssueDate,
  issueCampaign,
  personalize,
  sanitizeItems,
  validateForSend,
  type IssueItem,
} from "@/lib/newsletter/issue";
import { SITE_URL } from "@/lib/newsletter/mail";
import { createServiceClient } from "@/lib/supabase/service";

// Versand einer Newsletter-Ausgabe (PR 195). Service-Client, der Aufrufer
// (Server Action) prueft vorher den Editor.
//
// Ablauf: Momentaufnahme der bestaetigten Abonnenten als newsletter_deliveries
// (einmal, beim Start), dann in Paketen zu 100 ueber die Resend-Batch-API.
// Jede Mail hat ihren eigenen Abmeldelink (Fusszeile + List-Unsubscribe mit
// One-Click-POST, RFC 8058). Zugestellt = sent_at. Voruebergehende Fehler
// (Resend) halten die Ausgabe auf «sending», der Editor setzt fort; endgueltig
// ausgelassen («skip: …») werden nur seit dem Start Abgemeldete. Laeuft die
// Zeit ab, bleibt die Ausgabe ebenfalls auf «sending».

export type SendSummary = { ok: true; sent: number; failed: number; pending: number; done: boolean } | { ok: false; error: string };

const BATCH_SIZE = 100;
const SKIP_PREFIX = "skip:";
const TIME_BUDGET_MS = 40_000;

type IssueRow = {
  id: string;
  status: string;
  subject: string;
  intro: string;
  items: unknown;
  send_started_at: string | null;
};

function sender(): { resend: Resend; from: string; replyTo: string | undefined } | null {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL;
  if (!key || !from) return null;
  return { resend: new Resend(key), from, replyTo: process.env.NEWSLETTER_REPLY_TO ?? undefined };
}

export function unsubscribePageUrl(token: string): string {
  return `${SITE_URL}/newsletter/abmelden/${token}`;
}

export function oneClickUnsubscribeUrl(token: string): string {
  return `${SITE_URL}/api/newsletter/unsubscribe/${token}`;
}

// HTML einmal rendern; der Abmeldelink enthaelt den Platzhalter.
export async function renderIssueHtml(
  issue: { subject: string; intro: string; items: IssueItem[] },
  opts: { date: Date; test?: boolean },
): Promise<string> {
  return render(
    NewsletterIssue({
      subject: issue.subject,
      intro: issue.intro,
      items: issue.items,
      dateText: formatIssueDate(opts.date),
      campaign: issueCampaign(opts.date),
      siteUrl: SITE_URL,
      unsubscribeUrl: unsubscribePageUrl(UNSUBSCRIBE_PLACEHOLDER),
      test: opts.test,
    }),
  );
}

export async function sendIssueTest(issueId: string, to: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const s = sender();
  if (!s) return { ok: false, error: "Mailversand ist nicht konfiguriert (RESEND_API_KEY / NEWSLETTER_FROM_EMAIL)." };
  const svc = createServiceClient();
  const { data, error } = await svc.from("newsletter_issues").select("id, status, subject, intro, items, send_started_at").eq("id", issueId).maybeSingle();
  if (error || !data) return { ok: false, error: "Ausgabe nicht gefunden." };
  const issue = data as IssueRow;
  const items = sanitizeItems(issue.items);
  try {
    const html = personalize(await renderIssueHtml({ subject: issue.subject, intro: issue.intro, items }, { date: new Date(), test: true }), "test");
    const res = await s.resend.emails.send({ from: s.from, replyTo: s.replyTo, to, subject: `[Test] ${issue.subject}`, html });
    if (res.error) return { ok: false, error: res.error.message };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  await svc.from("newsletter_issues").update({ test_sent_at: new Date().toISOString() }).eq("id", issueId);
  return { ok: true };
}

export async function sendIssueToSubscribers(issueId: string, editorId: string): Promise<SendSummary> {
  const s = sender();
  if (!s) return { ok: false, error: "Mailversand ist nicht konfiguriert (RESEND_API_KEY / NEWSLETTER_FROM_EMAIL)." };
  const svc = createServiceClient();
  const started = Date.now();

  const { data, error } = await svc.from("newsletter_issues").select("id, status, subject, intro, items, send_started_at").eq("id", issueId).maybeSingle();
  if (error || !data) return { ok: false, error: "Ausgabe nicht gefunden." };
  const issue = data as IssueRow;
  const items = sanitizeItems(issue.items);
  if (issue.status !== "draft" && issue.status !== "sending") return { ok: false, error: "Diese Ausgabe ist nicht mehr offen." };

  let startedAt = issue.send_started_at ? new Date(issue.send_started_at) : new Date();
  if (issue.status === "draft") {
    const v = validateForSend({ subject: issue.subject, items });
    if (!v.ok) return { ok: false, error: v.error };
    const { count: confirmed, error: cntErr } = await svc
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed");
    if (cntErr) return { ok: false, error: cntErr.message };
    if (!confirmed) return { ok: false, error: "Es gibt keine bestätigten Abonnenten." };
    // Status zuerst (nur aus draft): Ein zweiter Klick findet «sending» und setzt fort.
    startedAt = new Date();
    const { data: moved, error: moveErr } = await svc
      .from("newsletter_issues")
      .update({ status: "sending", send_started_at: startedAt.toISOString(), sent_by: editorId, last_error: null })
      .eq("id", issueId)
      .eq("status", "draft")
      .select("id");
    if (moveErr) return { ok: false, error: moveErr.message };
    if (!moved || moved.length === 0) return { ok: false, error: "Die Ausgabe wurde gerade anderweitig geändert. Bitte neu laden." };
    const { data: subs, error: subErr } = await svc.from("newsletter_subscribers").select("id").eq("status", "confirmed");
    if (subErr) return { ok: false, error: subErr.message };
    const rows = (subs ?? []).map((r) => ({ issue_id: issueId, subscriber_id: r.id }));
    if (rows.length > 0) {
      const { error: insErr } = await svc.from("newsletter_deliveries").upsert(rows, { onConflict: "issue_id,subscriber_id", ignoreDuplicates: true });
      if (insErr) return { ok: false, error: insErr.message };
    }
    await svc.from("newsletter_issues").update({ recipients_count: rows.length }).eq("id", issueId);
  }

  // Fortsetzen: voruebergehende Fehler des letzten Versuchs wieder freigeben.
  // Endgueltige («skip: …», abgemeldet oder ohne Token) bleiben.
  if (issue.status === "sending") {
    await svc
      .from("newsletter_deliveries")
      .update({ error: null })
      .eq("issue_id", issueId)
      .is("sent_at", null)
      .not("error", "is", null)
      .not("error", "like", `${SKIP_PREFIX}%`);
  }

  const baseHtml = await renderIssueHtml({ subject: issue.subject, intro: issue.intro, items }, { date: startedAt });

  let sent = 0;
  let failed = 0;
  for (;;) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    const { data: pending, error: pErr } = await svc
      .from("newsletter_deliveries")
      .select("subscriber_id, subscriber:newsletter_subscribers!inner(email, status, confirmation_token)")
      .eq("issue_id", issueId)
      .is("sent_at", null)
      .is("error", null)
      .limit(BATCH_SIZE);
    if (pErr) return { ok: false, error: pErr.message };
    type P = { subscriber_id: string; subscriber: { email: string; status: string; confirmation_token: string | null } };
    const list = (pending ?? []) as unknown as P[];
    if (list.length === 0) break;

    // Seit dem Start abgemeldet oder ohne Token: endgueltig ausgelassen.
    const skip = list.filter((p) => p.subscriber.status !== "confirmed" || !p.subscriber.confirmation_token);
    if (skip.length > 0) {
      const { error: skipErr } = await svc.from("newsletter_deliveries").upsert(
        skip.map((p) => ({
          issue_id: issueId,
          subscriber_id: p.subscriber_id,
          error: p.subscriber.status !== "confirmed" ? `${SKIP_PREFIX} abgemeldet vor Versand` : `${SKIP_PREFIX} kein Abmelde-Token`,
        })),
        { onConflict: "issue_id,subscriber_id" },
      );
      if (skipErr) return { ok: false, error: skipErr.message };
      failed += skip.length;
    }
    const batch = list.filter((p) => !skip.includes(p));
    if (batch.length === 0) continue;

    // Gleiche Empfaenger = gleicher Schluessel: Resend verschickt bei einer
    // Wiederholung (z. B. nach Zeitueberschreitung) nicht doppelt.
    const ids = batch.map((p) => p.subscriber_id).sort();
    const idempotencyKey = `nl-${issueId}-${createHash("sha1").update(ids.join(",")).digest("hex").slice(0, 24)}`;
    const emails = batch.map((p) => {
      const token = p.subscriber.confirmation_token as string;
      return {
        from: s.from,
        replyTo: s.replyTo,
        to: p.subscriber.email,
        subject: issue.subject,
        html: personalize(baseHtml, token),
        headers: {
          "List-Unsubscribe": `<${oneClickUnsubscribeUrl(token)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      };
    });
    let errorMessage: string | null = null;
    let returned: { id: string }[] = [];
    try {
      const res = await s.resend.batch.send(emails, { idempotencyKey });
      if (res.error || !res.data) errorMessage = res.error?.message ?? "Versand fehlgeschlagen";
      else returned = res.data.data ?? [];
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }
    if (errorMessage) {
      const msg = errorMessage.slice(0, 300);
      await svc.from("newsletter_deliveries").upsert(
        batch.map((p) => ({ issue_id: issueId, subscriber_id: p.subscriber_id, error: msg })),
        { onConflict: "issue_id,subscriber_id" },
      );
      await svc.from("newsletter_issues").update({ last_error: msg }).eq("id", issueId);
      failed += batch.length;
      break;
    }
    const now = new Date().toISOString();
    const { error: markErr } = await svc.from("newsletter_deliveries").upsert(
      batch.map((p, i) => ({ issue_id: issueId, subscriber_id: p.subscriber_id, sent_at: now, error: null, provider_id: returned[i]?.id ?? null })),
      { onConflict: "issue_id,subscriber_id" },
    );
    if (markErr) return { ok: false, error: `Versendet, aber nicht vermerkt: ${markErr.message}` };
    sent += batch.length;
  }

  // Stand zaehlen und ggf. abschliessen: fertig, wenn niemand mehr offen ist
  // und kein voruebergehender Fehler wartet.
  const base = () => svc.from("newsletter_deliveries").select("subscriber_id", { count: "exact", head: true }).eq("issue_id", issueId);
  const [{ count: delivered }, { count: skipped }, { count: retryable }, { count: open }] = await Promise.all([
    base().not("sent_at", "is", null),
    base().is("sent_at", null).like("error", `${SKIP_PREFIX}%`),
    base().is("sent_at", null).not("error", "is", null).not("error", "like", `${SKIP_PREFIX}%`),
    base().is("sent_at", null).is("error", null),
  ]);
  const waiting = (open ?? 0) + (retryable ?? 0);
  const done = waiting === 0;
  await svc
    .from("newsletter_issues")
    .update({
      delivered_count: delivered ?? 0,
      failed_count: (skipped ?? 0) + (retryable ?? 0),
      ...(done ? { status: "sent", sent_at: new Date().toISOString(), last_error: null } : {}),
    })
    .eq("id", issueId);
  return { ok: true, sent, failed, pending: waiting, done };
}
