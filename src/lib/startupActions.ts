"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  sendSubmissionApproved,
  sendSubmissionConfirmation,
  sendSubmissionNotification,
  sendSubmissionRejected,
} from "@/lib/submissions/mail";
import type { Database } from "@/lib/database.types";

type StartupRow = Database["public"]["Tables"]["ai_startups"]["Row"];
type StartupUpdate = Database["public"]["Tables"]["ai_startups"]["Update"];
type SwissStatusCode = Database["public"]["Enums"]["swiss_status"];
type EmployeeRangeCode = Database["public"]["Enums"]["employee_range"];
type FundingStageCode = Database["public"]["Enums"]["funding_stage"];

async function requireEditor(): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");
  const { data: me } = await supabase
    .from("authors")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) throw new Error("Author-Profil nicht gefunden.");
  if (me.role !== "editor") throw new Error("Nur Editor:innen.");
  return { id: me.id };
}

function revalidateAll(): void {
  revalidatePath("/swiss-ai");
  revalidatePath("/swiss-ai/einreichen");
  revalidatePath("/autor/admin/startups");
  revalidatePath("/");
}

function wrapSpotlightError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Spotlight limit reached")) {
    throw new Error(
      "Maximum 3 Spotlight-Startups erreicht. Bitte zuerst einen anderen entfernen.",
    );
  }
  throw err;
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isUrl(s: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(s);
}

export type ExternalStartupSubmitInput = {
  name: string;
  tagline: string;
  description: string;
  website: string;
  logo_url?: string | null;
  swiss_status: SwissStatusCode;
  industry: string;
  city: string;
  employee_range: EmployeeRangeCode;
  founded_year: number;
  funding_stage?: FundingStageCode | null;
  total_funding_range?: string | null;
  last_round_at?: string | null;
  open_to_investment?: boolean;
  pitch_deck_url?: string | null;
  founder_names?: string[] | null;
  submitter_name: string;
  submitter_email: string;
  submitter_role?: string | null;
};

export async function submitStartupExternal(input: ExternalStartupSubmitInput): Promise<void> {
  const name = input.name.trim();
  const tagline = input.tagline.trim();
  const description = input.description.trim();
  const website = input.website.trim();
  const city = input.city.trim();
  const industry = input.industry.trim();
  const submitterName = input.submitter_name.trim();
  const submitterEmail = input.submitter_email.trim();

  if (!name) throw new Error("Name ist erforderlich.");
  if (name.length > 80) throw new Error("Name zu lang (max 80 Zeichen).");
  if (!tagline) throw new Error("Tagline ist erforderlich.");
  if (tagline.length > 100) throw new Error("Tagline zu lang (max 100 Zeichen).");
  if (!description) throw new Error("Beschreibung ist erforderlich.");
  if (!website) throw new Error("Website ist erforderlich.");
  if (!isUrl(website)) throw new Error("Website muss eine gültige URL sein (https://…).");
  if (!industry) throw new Error("Branche ist erforderlich.");
  if (!city) throw new Error("Stadt ist erforderlich.");
  if (!Number.isInteger(input.founded_year) || input.founded_year < 1990 || input.founded_year > 2030) {
    throw new Error("Gründungsjahr muss zwischen 1990 und 2030 liegen.");
  }
  if (!submitterName) throw new Error("Name ist erforderlich.");
  if (!isEmail(submitterEmail)) throw new Error("E-Mail-Format ungültig.");

  const supabase = await createClient();

  const { data: slug, error: slugError } = await supabase.rpc("suggest_startup_slug", { p_name: name });
  if (slugError) throw slugError;
  if (!slug) throw new Error("Slug-Generierung fehlgeschlagen.");

  // Bewusst KEIN .select().single() hier: anon hat keine SELECT-Policy für
  // status='pending'-Rows, der Return-Representation würde via RLS-Filter
  // einen 42501 erzeugen obwohl der Insert-Check selbst durchgegangen wäre.
  const { error } = await supabase
    .from("ai_startups")
    .insert({
      slug,
      name,
      tagline,
      description,
      website,
      logo_url: input.logo_url?.trim() || null,
      swiss_status: input.swiss_status,
      industry,
      city,
      employee_range: input.employee_range,
      founded_year: input.founded_year,
      funding_stage: input.funding_stage ?? null,
      total_funding_range: input.total_funding_range?.trim() || null,
      last_round_at: input.last_round_at || null,
      open_to_investment: input.open_to_investment ?? false,
      pitch_deck_url: input.pitch_deck_url?.trim() || null,
      founder_names: input.founder_names && input.founder_names.length > 0 ? input.founder_names : null,
      submitter_name: submitterName,
      submitter_email: submitterEmail,
      submitter_role: input.submitter_role?.trim() || null,
      status: "pending",
    });
  if (error) throw error;

  // Mail-Versand parallel — Failure ist nicht-kritisch (Editor sieht im
  // Admin). Editor-Notification verlinkt auf Listing-Page; konkrete
  // Detail-Row braucht keinen Slug (Admin filtert nach pending).
  await Promise.allSettled([
    sendSubmissionConfirmation({
      type: "startup",
      email: submitterEmail,
      name: submitterName,
      title: name,
    }),
    sendSubmissionNotification({
      type: "startup",
      title: name,
      submitterName,
      submitterEmail,
    }),
  ]);

  revalidatePath("/autor/admin/startups");
}

export async function approveStartup(id: string, opts?: { feature?: boolean }): Promise<void> {
  const me = await requireEditor();
  const supabase = await createClient();

  // Idempotenz: aktuellen Status + Submitter-Daten + Slug VOR dem Update
  // lesen. Slug brauchen wir für die Live-URL in der Approval-Mail.
  const { data: current } = await supabase
    .from("ai_startups")
    .select("status, submitter_email, submitter_name, name, slug")
    .eq("id", id)
    .maybeSingle();
  const alreadyApproved =
    current?.status === "published" || current?.status === "featured";

  const now = new Date().toISOString();
  try {
    const { error } = await supabase
      .from("ai_startups")
      .update({
        status: opts?.feature ? "featured" : "published",
        reviewed_by_id: me.id,
        reviewed_at: now,
        published_at: now,
        rejection_reason: null,
      })
      .eq("id", id);
    if (error) throw error;
  } catch (err) {
    wrapSpotlightError(err);
  }

  if (
    !alreadyApproved &&
    current?.submitter_email &&
    current?.submitter_name &&
    current?.name &&
    current?.slug
  ) {
    await sendSubmissionApproved({
      type: "startup",
      email: current.submitter_email,
      name: current.submitter_name,
      title: current.name,
      liveUrl: `/swiss-ai/${current.slug}`,
    });
  }

  revalidateAll();
}

export async function rejectStartup(
  id: string,
  reason?: string | null,
): Promise<void> {
  const me = await requireEditor();
  // Reason ist jetzt optional (Spec): leer/null → null in DB, Submitter
  // bekommt generic-Mail-Text statt eingebetteten Grund.
  const r = (reason ?? "").trim();
  const reasonValue = r === "" ? null : r;
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("ai_startups")
    .select("status, submitter_email, submitter_name, name")
    .eq("id", id)
    .maybeSingle();
  const alreadyRejected = current?.status === "rejected";
  const { error } = await supabase
    .from("ai_startups")
    .update({
      status: "rejected",
      reviewed_by_id: me.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reasonValue,
    })
    .eq("id", id);
  if (error) throw error;

  if (
    !alreadyRejected &&
    current?.submitter_email &&
    current?.submitter_name &&
    current?.name
  ) {
    await sendSubmissionRejected({
      type: "startup",
      email: current.submitter_email,
      name: current.submitter_name,
      title: current.name,
      reason: reasonValue,
    });
  }

  revalidateAll();
}

export async function toggleStartupFeatured(id: string): Promise<void> {
  await requireEditor();
  const supabase = await createClient();
  const { data: cur } = await supabase
    .from("ai_startups")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (!cur) throw new Error("Startup nicht gefunden.");
  const next = cur.status === "featured" ? "published" : "featured";
  try {
    const { error } = await supabase
      .from("ai_startups")
      .update({ status: next })
      .eq("id", id);
    if (error) throw error;
  } catch (err) {
    wrapSpotlightError(err);
  }
  revalidateAll();
}

export async function toggleInvestorReady(id: string): Promise<void> {
  await requireEditor();
  const supabase = await createClient();
  const { data: cur } = await supabase
    .from("ai_startups")
    .select("open_to_investment")
    .eq("id", id)
    .maybeSingle();
  if (!cur) throw new Error("Startup nicht gefunden.");
  const { error } = await supabase
    .from("ai_startups")
    .update({ open_to_investment: !cur.open_to_investment })
    .eq("id", id);
  if (error) throw error;
  revalidateAll();
}

export type UpdateStartupPatch = Partial<{
  slug: string;
  name: string;
  tagline: string;
  description: string;
  website: string;
  logo_url: string | null;
  swiss_status: SwissStatusCode;
  industry: string;
  city: string;
  employee_range: EmployeeRangeCode;
  founded_year: number;
  funding_stage: FundingStageCode | null;
  total_funding_range: string | null;
  last_round_at: string | null;
  open_to_investment: boolean;
  pitch_deck_url: string | null;
  founder_names: string[] | null;
}>;

export async function updateStartup(id: string, patch: UpdateStartupPatch): Promise<StartupRow> {
  await requireEditor();
  const update: StartupUpdate = {};

  if (patch.slug !== undefined) {
    const s = patch.slug.trim();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)) {
      throw new Error("Slug muss kleingeschrieben, Zahlen und Bindestriche sein (z.B. deepjudge).");
    }
    update.slug = s;
  }
  if (patch.name !== undefined) {
    const n = patch.name.trim();
    if (!n) throw new Error("Name ist erforderlich.");
    if (n.length > 80) throw new Error("Name zu lang (max 80 Zeichen).");
    update.name = n;
  }
  if (patch.tagline !== undefined) {
    const t = patch.tagline.trim();
    if (!t) throw new Error("Tagline ist erforderlich.");
    if (t.length > 100) throw new Error("Tagline zu lang (max 100 Zeichen).");
    update.tagline = t;
  }
  if (patch.description !== undefined) {
    const d = patch.description.trim();
    if (!d) throw new Error("Beschreibung ist erforderlich.");
    update.description = d;
  }
  if (patch.website !== undefined) {
    const w = patch.website.trim();
    if (!isUrl(w)) throw new Error("Website muss eine gültige URL sein.");
    update.website = w;
  }
  if (patch.logo_url !== undefined) update.logo_url = patch.logo_url?.trim() || null;
  if (patch.swiss_status !== undefined) update.swiss_status = patch.swiss_status;
  if (patch.industry !== undefined) {
    const i = patch.industry.trim();
    if (!i) throw new Error("Branche ist erforderlich.");
    update.industry = i;
  }
  if (patch.city !== undefined) {
    const c = patch.city.trim();
    if (!c) throw new Error("Stadt ist erforderlich.");
    update.city = c;
  }
  if (patch.employee_range !== undefined) update.employee_range = patch.employee_range;
  if (patch.founded_year !== undefined) {
    if (!Number.isInteger(patch.founded_year) || patch.founded_year < 1990 || patch.founded_year > 2030) {
      throw new Error("Gründungsjahr muss zwischen 1990 und 2030 liegen.");
    }
    update.founded_year = patch.founded_year;
  }
  if (patch.funding_stage !== undefined) update.funding_stage = patch.funding_stage;
  if (patch.total_funding_range !== undefined) update.total_funding_range = patch.total_funding_range?.trim() || null;
  if (patch.last_round_at !== undefined) update.last_round_at = patch.last_round_at || null;
  if (patch.open_to_investment !== undefined) update.open_to_investment = patch.open_to_investment;
  if (patch.pitch_deck_url !== undefined) update.pitch_deck_url = patch.pitch_deck_url?.trim() || null;
  if (patch.founder_names !== undefined) {
    update.founder_names = patch.founder_names && patch.founder_names.length > 0 ? patch.founder_names : null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_startups")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("ai_startups_slug_key") || msg.includes("duplicate key") && msg.includes("slug")) {
      throw new Error("Slug ist bereits vergeben. Bitte einen anderen wählen.");
    }
    throw error;
  }
  revalidateAll();
  return data;
}

export async function archiveStartup(id: string): Promise<void> {
  await requireEditor();
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_startups")
    .update({ status: "archived" })
    .eq("id", id);
  if (error) throw error;
  revalidateAll();
}

export async function restoreStartupToPending(id: string): Promise<void> {
  await requireEditor();
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_startups")
    .update({
      status: "pending",
      rejection_reason: null,
      reviewed_by_id: null,
      reviewed_at: null,
      published_at: null,
    })
    .eq("id", id);
  if (error) throw error;
  revalidateAll();
}

export async function restoreStartupToPublished(id: string): Promise<void> {
  const me = await requireEditor();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("ai_startups")
    .update({
      status: "published",
      reviewed_by_id: me.id,
      reviewed_at: now,
      published_at: now,
    })
    .eq("id", id);
  if (error) throw error;
  revalidateAll();
}

export async function deleteStartup(id: string): Promise<void> {
  await requireEditor();
  const supabase = await createClient();
  const { error } = await supabase.from("ai_startups").delete().eq("id", id);
  if (error) throw error;
  revalidateAll();
}
