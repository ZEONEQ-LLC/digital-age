"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendInviteMail } from "@/lib/newsletter/mail";
import type { Database } from "@/lib/database.types";
import { authorSlugFromName, escapeIlike } from "@/lib/authorSlug";
import { FormError, actionFailure, runAction, type ActionResult } from "@/lib/actionResult";

type InviteRow = Database["public"]["Tables"]["invites"]["Row"];
type AuthorRow = Database["public"]["Tables"]["authors"]["Row"];
type IntendedRole = "author" | "editor";

// Erwartete Fehler (Validierung, E-Mail schon vergeben) kommen als Wert
// zurueck, Muster und Begruendung in src/lib/actionResult.ts.
export type AuthorFormResult<T> = ActionResult<T>;

const DUPLICATE_AUTHOR_EMAIL = "Es existiert bereits ein Autor mit dieser E-Mail.";

// Mail-Versand fire-and-forget: bei Failure bleibt das Invite gültig
// (Token+Expiry in DB), `mailSent: false` triggert im Admin-UI den
// Clipboard-Fallback-Hinweis.
async function dispatchInviteMail(invite: InviteRow): Promise<boolean> {
  try {
    const result = await sendInviteMail({
      email: invite.email,
      token: invite.token,
      displayName: invite.display_name,
      intendedRole: invite.intended_role as IntendedRole,
    });
    return result.ok;
  } catch (e) {
    console.error("[invite] mail dispatch failed:", e);
    return false;
  }
}

async function requireEditor(): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new FormError("Nicht eingeloggt.");
  const { data: me } = await supabase
    .from("authors")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) throw new FormError("Author-Profil nicht gefunden.");
  if (me.role !== "editor") throw new FormError("Nur Editor:innen dürfen Author-Management nutzen.");
  return { id: me.id };
}

function validateEmail(email: string): void {
  const trimmed = email.trim();
  if (!trimmed) throw new FormError("E-Mail ist erforderlich.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new FormError("E-Mail-Format ungültig.");
  }
}

function validateDisplayName(name: string): void {
  if (!name.trim()) throw new FormError("Anzeigename ist erforderlich.");
}

function validateRole(role: string): IntendedRole {
  if (role !== "author" && role !== "editor") {
    throw new FormError("Rolle muss 'author' oder 'editor' sein.");
  }
  return role;
}

async function assertEmailFree(email: string): Promise<void> {
  const supabase = await createClient();
  const lower = email.toLowerCase().trim();

  const { data: activeAuthor } = await supabase
    .from("authors")
    .select("id")
    .ilike("email", lower)
    .not("user_id", "is", null)
    .maybeSingle();
  if (activeAuthor) {
    throw new FormError(DUPLICATE_AUTHOR_EMAIL);
  }

  const { data: activeInvite } = await supabase
    .from("invites")
    .select("id")
    .ilike("email", lower)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (activeInvite) {
    throw new FormError("Es existiert bereits eine aktive Einladung für diese E-Mail.");
  }
}

// Fuer die Actions, die eine neue authors-Zeile anlegen: auch ein Platzhalter
// ohne Login blockiert (UNIQUE authors.email, gross/klein egal).
async function assertNoAuthorWithEmail(email: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("authors")
    .select("id")
    .ilike("email", escapeIlike(email.trim()))
    .limit(1)
    .maybeSingle();
  if (data) throw new FormError(DUPLICATE_AUTHOR_EMAIL);
}

async function insertAuthorPlaceholder(args: {
  email: string;
  display_name: string;
  intended_role: IntendedRole;
}): Promise<AuthorRow> {
  const supabase = await createClient();
  const baseSlug = authorSlugFromName(args.display_name || args.email.split("@")[0]);

  let attemptSlug = baseSlug;
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase
      .from("authors")
      .insert({
        email: args.email.trim(),
        display_name: args.display_name.trim(),
        slug: attemptSlug,
        role: args.intended_role,
      })
      .select("*")
      .single();
    if (!error && data) return data;
    if (error?.code !== "23505") throw error;
    if (error.message.includes("authors_email_key")) throw new FormError(DUPLICATE_AUTHOR_EMAIL);
    attemptSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }
  throw new Error("Konnte keinen freien Slug für den Author finden.");
}

async function insertInvite(args: {
  email: string;
  display_name: string;
  intended_role: IntendedRole;
  invited_by_id: string;
}): Promise<InviteRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invites")
    .insert({
      email: args.email.trim(),
      display_name: args.display_name.trim(),
      intended_role: args.intended_role,
      invited_by_id: args.invited_by_id,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

function revalidateAdminPaths(): void {
  revalidatePath("/autor/admin/autoren");
  revalidatePath("/autor/admin/einladungen");
  revalidatePath("/autor/dashboard");
}

export async function createInvite(input: {
  email: string;
  display_name: string;
  intended_role: string;
}): Promise<InviteRow & { mailSent: boolean }> {
  const me = await requireEditor();
  validateEmail(input.email);
  validateDisplayName(input.display_name);
  const role = validateRole(input.intended_role);
  await assertEmailFree(input.email);

  const invite = await insertInvite({
    email: input.email,
    display_name: input.display_name,
    intended_role: role,
    invited_by_id: me.id,
  });
  const mailSent = await dispatchInviteMail(invite);
  revalidateAdminPaths();
  return { ...invite, mailSent };
}

export async function createAuthorWithInvite(input: {
  email: string;
  display_name: string;
  intended_role: string;
}): Promise<AuthorFormResult<{ author: AuthorRow; invite: InviteRow; mailSent: boolean }>> {
  try {
    const me = await requireEditor();
    validateEmail(input.email);
    validateDisplayName(input.display_name);
    const role = validateRole(input.intended_role);
    await assertEmailFree(input.email);
    await assertNoAuthorWithEmail(input.email);

    const author = await insertAuthorPlaceholder({
      email: input.email,
      display_name: input.display_name,
      intended_role: role,
    });
    const invite = await insertInvite({
      email: input.email,
      display_name: input.display_name,
      intended_role: role,
      invited_by_id: me.id,
    });
    const mailSent = await dispatchInviteMail(invite);
    revalidateAdminPaths();
    return { ok: true, value: { author, invite, mailSent } };
  } catch (e) {
    return actionFailure(e, "invite");
  }
}

export async function createAuthorPlaceholder(input: {
  email: string;
  display_name: string;
  intended_role: string;
}): Promise<AuthorFormResult<AuthorRow>> {
  try {
    await requireEditor();
    validateEmail(input.email);
    validateDisplayName(input.display_name);
    const role = validateRole(input.intended_role);
    await assertEmailFree(input.email);
    await assertNoAuthorWithEmail(input.email);

    const author = await insertAuthorPlaceholder({
      email: input.email,
      display_name: input.display_name,
      intended_role: role,
    });
    revalidateAdminPaths();
    return { ok: true, value: author };
  } catch (e) {
    return actionFailure(e, "invite");
  }
}

export type PitchInviteOutcome = "sent" | "mail_failed" | "has_login" | "already_invited";

// Einladung fuer den Gast-Autor eines Pitches. Anders als
// generateInviteForExistingPlaceholder auch fuer role=external: die Einladung
// lautet auf «author», der Auth-Trigger hebt die Rolle beim ersten Login an.
export async function inviteAuthorFromPitch(authorId: string): Promise<PitchInviteOutcome> {
  const me = await requireEditor();
  const supabase = await createClient();
  const { data: author, error } = await supabase
    .from("authors")
    .select("id, email, display_name, role, user_id")
    .eq("id", authorId)
    .single();
  if (error) throw error;
  if (author.user_id) return "has_login";

  const { data: active } = await supabase
    .from("invites")
    .select("id")
    .ilike("email", escapeIlike(author.email))
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  if (active) return "already_invited";

  const invite = await insertInvite({
    email: author.email,
    display_name: author.display_name,
    intended_role: author.role === "editor" ? "editor" : "author",
    invited_by_id: me.id,
  });
  const mailSent = await dispatchInviteMail(invite);
  revalidateAdminPaths();
  return mailSent ? "sent" : "mail_failed";
}

export async function revokeInvite(id: string): Promise<ActionResult<void>> {
  return runAction("revokeInvite", () => revokeInviteInner(id));
}

async function revokeInviteInner(id: string): Promise<void> {
  await requireEditor();
  const supabase = await createClient();
  const { error } = await supabase
    .from("invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("accepted_at", null);
  if (error) throw error;
  revalidateAdminPaths();
}

export async function resendInvite(id: string): Promise<ActionResult<InviteRow & { mailSent: boolean }>> {
  return runAction("resendInvite", () => resendInviteInner(id));
}

async function resendInviteInner(id: string): Promise<InviteRow & { mailSent: boolean }> {
  await requireEditor();
  const supabase = await createClient();

  const { data: existing, error: readErr } = await supabase
    .from("invites")
    .select("*, created_author:authors!created_author_id(user_id)")
    .eq("id", id)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!existing) throw new FormError("Einladung nicht gefunden.");

  const createdAuthor = (existing as unknown as { created_author: { user_id: string | null } | null }).created_author;
  if (existing.accepted_at && createdAuthor?.user_id) {
    throw new FormError("Einladung wurde bereits eingelöst — der Author ist aktiv und kann nicht erneut eingeladen werden.");
  }

  const newExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const newToken = await generateToken();

  const { data, error } = await supabase
    .from("invites")
    .update({
      token: newToken,
      expires_at: newExpiresAt,
      accepted_at: null,
      revoked_at: null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  const mailSent = await dispatchInviteMail(data);
  revalidateAdminPaths();
  return { ...data, mailSent };
}

export async function generateInviteForExistingPlaceholder(
  authorId: string,
): Promise<ActionResult<InviteRow & { mailSent: boolean }>> {
  return runAction("generateInviteForExistingPlaceholder", () => generateInviteForExistingPlaceholderInner(authorId));
}

async function generateInviteForExistingPlaceholderInner(
  authorId: string,
): Promise<InviteRow & { mailSent: boolean }> {
  const me = await requireEditor();
  const supabase = await createClient();

  const { data: author, error: readErr } = await supabase
    .from("authors")
    .select("id, email, display_name, role, user_id")
    .eq("id", authorId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!author) throw new FormError("Author nicht gefunden.");
  if (author.user_id) throw new FormError("Author ist bereits aktiv — keine Einladung mehr nötig.");
  if (author.role !== "author" && author.role !== "editor") {
    throw new FormError("Externe Authors können nicht eingeladen werden (Rolle muss author oder editor sein).");
  }

  const { data: existingActive } = await supabase
    .from("invites")
    .select("id")
    .ilike("email", author.email.toLowerCase())
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (existingActive) {
    throw new FormError("Für diese E-Mail existiert bereits eine aktive Einladung.");
  }

  const invite = await insertInvite({
    email: author.email,
    display_name: author.display_name,
    intended_role: author.role,
    invited_by_id: me.id,
  });
  const mailSent = await dispatchInviteMail(invite);
  revalidateAdminPaths();
  return { ...invite, mailSent };
}

async function generateToken(): Promise<string> {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
