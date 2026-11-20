import "server-only";

import { SITE_URL } from "@/lib/newsletter/mail";
import { formatDuration, kitUrl, reportDue, reportUntil, sumFigures } from "@/lib/showcase/kit";
import { getKitStats } from "@/lib/showcase/kitApi";
import { sendShowcaseReportMail } from "@/lib/showcase/mail";
import { firstName } from "@/lib/showcase/questionnaire";
import { createServiceClient } from "@/lib/supabase/service";

// Showcase S4: Bericht nach 30 Tagen. Laeuft im taeglichen Cron
// (/api/module/daily, 05:00 UTC) nach den Werbe-Berichten. Einmal pro
// Einreichung: report_sent_at wird erst nach erfolgreichem Versand gesetzt,
// ein Fehler wird am naechsten Tag erneut versucht (bis REPORT_LATEST_DAYS).

export type ShowcaseReportRun = { checked: number; sent: number; failed: number };

export async function runShowcaseReports(now = new Date()): Promise<ShowcaseReportRun> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("showcase_submissions")
    .select("id, contact_name, contact_email, kit_token, startup:ai_startups(name), article:articles(id, slug, title, status, published_at, content_type)")
    .is("report_sent_at", null)
    .not("article_id", "is", null)
    .not("contact_email", "is", null)
    .limit(100);
  if (error) {
    console.error("[showcase:report] Einreichungen nicht lesbar:", error.message);
    return { checked: 0, sent: 0, failed: 1 };
  }
  const run: ShowcaseReportRun = { checked: 0, sent: 0, failed: 0 };
  for (const sub of data ?? []) {
    const a = sub.article;
    if (!a || a.status !== "published" || a.content_type !== "company" || !sub.contact_email) continue;
    if (!reportDue(a.published_at, now)) continue;
    run.checked += 1;
    const figures = sumFigures(await getKitStats(a.id), reportUntil(a.published_at as string));
    const sent = await sendShowcaseReportMail(sub.contact_email, {
      firstName: firstName(sub.contact_name),
      company: sub.startup?.name ?? "eurem Unternehmen",
      title: a.title,
      url: `${SITE_URL}/showcase/${a.slug}`,
      kitUrl: kitUrl(SITE_URL, sub.kit_token),
      views: figures.views,
      reads: figures.reads,
      websiteClicks: figures.websiteClicks,
      avgDuration: formatDuration(figures.avgSeconds),
      sources: figures.sources.map((s) => ({ label: s.label, views: s.views })),
    });
    if (!sent.ok) {
      console.error("[showcase:report] Versand fehlgeschlagen:", sub.id, sent.error);
      run.failed += 1;
      continue;
    }
    const { error: markErr } = await supabase
      .from("showcase_submissions")
      .update({ report_sent_at: new Date().toISOString() })
      .eq("id", sub.id);
    if (markErr) console.error("[showcase:report] Versand nicht vermerkt:", sub.id, markErr.message);
    run.sent += 1;
  }
  return run;
}

