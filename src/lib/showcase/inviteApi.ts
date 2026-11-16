import "server-only";

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

export type AdminSubmission = SubmissionRow & {
  state: InviteState;
  startup: InviteStartup | null;
  logoUrl: string | null;
  imageUrl: string | null;
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
  return {
    submissions: ((subs.data as (SubmissionRow & { startup: InviteStartup | null })[] | null) ?? []).map((r) => ({
      ...r,
      state: inviteState(r, now),
      logoUrl: mediaPublicUrl(r.logo_path),
      imageUrl: mediaPublicUrl(r.image_path),
    })),
    startups: (startups.data ?? []).map((s) => ({ id: s.id, name: s.name, hasOwnInterest: !!s.affiliation_note })),
  };
}
