import "server-only";

import { previewDecisionStatus, previewFingerprint, previewLinkState, type PreviewDecisionStatus } from "@/lib/articles/preview";
import { articlePath } from "@/lib/contentType";
import type { Database } from "@/lib/database.types";
import { MEDIA_BUCKET, SHOWCASE_TOKEN_RE, inviteState, type InviteState } from "@/lib/showcase/questionnaire";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Showcase S3a: Einladungen und Einreichungen lesen.
//
// Zwei Wege, wie bei der Beitragsvorschau:
//   * Unternehmen: nur mit dem Token, ueber die Service-Role (kein Login,
//     anon hat kein Recht auf showcase_submissions).
//   * Redaktion: Sitzungs-Client, RLS showcase_submissions_editor_all.

export type SubmissionRow = Database["public"]["Tables"]["showcase_submissions"]["Row"];
type StartupRow = Database["public"]["Tables"]["ai_startups"]["Row"];

// Was der Fragebogen vom Unternehmen braucht (Profil zum Bestaetigen).
export type InviteStartup = Pick<
  StartupRow,
  | "id"
  | "name"
  | "slug"
  | "tagline"
  | "city"
  | "industry"
  | "founded_year"
  | "employee_range"
  | "swiss_status"
  | "funding_stage"
  | "last_round_at"
  | "open_to_investment"
  | "logo_url"
  | "website"
  | "status"
>;

export const INVITE_STARTUP_COLUMNS =
  "id, name, slug, tagline, city, industry, founded_year, employee_range, swiss_status, funding_stage, last_round_at, open_to_investment, logo_url, website, status";

export type Invite = { row: SubmissionRow; state: InviteState; startup: InviteStartup };

// Oeffentliche Adresse einer Datei im Bucket (ohne Anfrage an Supabase).
export function mediaPublicUrl(path: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

// Einladung zum Token. null = unbekannt (auch bei kaputtem Token: kein
// Datenbankzugriff). Wirft, wenn der Service-Schluessel fehlt.
export async function getInviteByToken(token: string): Promise<Invite | null> {
  if (!SHOWCASE_TOKEN_RE.test(token)) return null;
  const supabase = createServiceClient();
  const { data: row } = await supabase.from("showcase_submissions").select("*").eq("token", token).maybeSingle();
  if (!row) return null;
  const { data: startup } = await supabase
    .from("ai_startups")
    .select(INVITE_STARTUP_COLUMNS)
    .eq("id", row.startup_id)
    .maybeSingle();
  if (!startup) return null;
  return { row, state: inviteState(row, Date.now()), startup: startup as InviteStartup };
}

// --- Redaktion ---------------------------------------------------------------

// Stand des Beitrags zu einer Einreichung (S3b): Entwurf, Freigabe durch das
// Unternehmen, Publikation.
export type SubmissionDraft = {
  articleId: string;
  title: string;
  status: string;
  // Oeffentlicher Pfad, sobald publiziert.
  path: string | null;
  publishedAt: string | null;
  approval: PreviewDecisionStatus;
  // Der Vorschau-Link ist abgelaufen (eine Freigabe bleibt gueltig).
  linkExpired: boolean;
  // Was vor dem Senden zur Freigabe noch fehlt (Abstract, Bildbeschreibung).
  missing: string[];
};

export type AdminSubmission = SubmissionRow & {
  state: InviteState;
  startup: InviteStartup | null;
  logoUrl: string | null;
  imageUrl: string | null;
  draft: SubmissionDraft | null;
};

export type InvitableStartup = { id: string; name: string; hasOwnInterest: boolean };

// Alle Einladungen, neueste zuerst, plus die Unternehmen, die sich einladen
// lassen (sichtbar im Verzeichnis). RLS: nur Editor:innen bekommen Zeilen.
export async function getShowcaseAdminData(): Promise<{ submissions: AdminSubmission[]; startups: InvitableStartup[] }> {
  const supabase = await createClient();
  const [subs, startups] = await Promise.all([
    supabase
      .from("showcase_submissions")
      .select(`*, startup:ai_startups(${INVITE_STARTUP_COLUMNS})`)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ai_startups")
      .select("id, name, affiliation_note")
      .in("status", ["published", "featured"])
      .order("name", { ascending: true }),
  ]);
  if (subs.error) console.error("[showcase] submissions failed:", subs.error.message);
  const now = Date.now();
  const rows = (subs.data as (SubmissionRow & { startup: InviteStartup | null })[] | null) ?? [];

  // Beitraege und ihre Vorschau-Links (Freigabe) zu den Einreichungen.
  const articleIds = rows.map((r) => r.article_id).filter((id): id is string => !!id);
  const drafts = new Map<string, SubmissionDraft>();
  if (articleIds.length > 0) {
    const [articles, links] = await Promise.all([
      supabase.from("articles").select("*").in("id", articleIds),
      supabase.from("article_preview_links").select("*").in("article_id", articleIds).is("revoked_at", null),
    ]);
    if (articles.error) console.error("[showcase] drafts failed:", articles.error.message);
    const linkByArticle = new Map((links.data ?? []).map((l) => [l.article_id, l]));
    for (const a of articles.data ?? []) {
      const link = linkByArticle.get(a.id);
      const missing: string[] = [];
      if (!a.excerpt?.trim()) missing.push("Abstract");
      if (a.cover_image_url?.trim() && !a.cover_image_alt?.trim()) missing.push("Bildbeschreibung");
      drafts.set(a.id, {
        articleId: a.id,
        title: a.title,
        status: a.status,
        path: a.status === "published" ? articlePath(a) : null,
        publishedAt: a.published_at,
        approval: link ? previewDecisionStatus(link, previewFingerprint(a)) : { kind: "none" },
        linkExpired: link ? previewLinkState(link, now) === "expired" : false,
        missing,
      });
    }
  }

  return {
    submissions: rows.map((r) => ({
      ...r,
      state: inviteState(r, now),
      logoUrl: mediaPublicUrl(r.logo_path),
      imageUrl: mediaPublicUrl(r.image_path),
      draft: r.article_id ? drafts.get(r.article_id) ?? null : null,
    })),
    startups: (startups.data ?? []).map((s) => ({ id: s.id, name: s.name, hasOwnInterest: !!s.affiliation_note })),
  };
}
