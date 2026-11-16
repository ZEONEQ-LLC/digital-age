import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SITE_URL } from "@/lib/newsletter/mail";
import { showcaseShareUrl } from "@/lib/showcase/draft";
import { sendShowcaseOnlineMail } from "@/lib/showcase/mail";
import { firstName } from "@/lib/showcase/questionnaire";

// Showcase S3b: «Beitrag ist online» an das Unternehmen, einmal beim ersten
// Publizieren eines Beitrags, der aus einer Einreichung entstanden ist.
// Aufgerufen von publishArticle (Sitzung der Redaktion, RLS: Editor liest
// showcase_submissions). true = das Unternehmen ist benachrichtigt (jetzt oder
// frueher); der Aufrufer schickt dann nicht noch die allgemeine Autoren-Mail.
export async function sendShowcaseOnlineNotice(
  supabase: SupabaseClient<Database>,
  article: { id: string; title: string; slug: string },
  startup: { name: string; slug: string } | null,
): Promise<boolean> {
  const { data: sub, error } = await supabase
    .from("showcase_submissions")
    .select("id, contact_name, contact_email, linkedin_texts, online_sent_at")
    .eq("article_id", article.id)
    .maybeSingle();
  if (error) {
    console.error("[showcase:online] Einreichung nicht lesbar:", error.message);
    return false;
  }
  if (!sub || !sub.contact_email) return false;
  if (sub.online_sent_at) return true;

  const linkedin = Array.isArray(sub.linkedin_texts)
    ? (sub.linkedin_texts as unknown[]).filter((t): t is string => typeof t === "string" && t.trim() !== "").slice(0, 3)
    : [];
  const sent = await sendShowcaseOnlineMail(sub.contact_email, {
    firstName: firstName(sub.contact_name),
    company: startup?.name ?? "eurem Unternehmen",
    title: article.title,
    url: `${SITE_URL}/showcase/${article.slug}`,
    shareUrl: showcaseShareUrl(SITE_URL, article.slug),
    profileUrl: startup ? `${SITE_URL}/swiss-ai/${startup.slug}` : `${SITE_URL}/swiss-ai`,
    linkedin,
  });
  if (!sent.ok) {
    console.error("[showcase:online] Mail nicht versandt:", sent.error);
    return false;
  }
  const { error: markErr } = await supabase
    .from("showcase_submissions")
    .update({ online_sent_at: new Date().toISOString() })
    .eq("id", sub.id);
  if (markErr) console.error("[showcase:online] Versand nicht vermerkt:", markErr.message);
  return true;
}
