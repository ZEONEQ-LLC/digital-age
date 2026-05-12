"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type InviteRow = Database["public"]["Tables"]["invites"]["Row"];
type AuthorRow = Database["public"]["Tables"]["authors"]["Row"];
type IntendedRole = "author" | "editor";

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
  if (me.role !== "editor") throw new Error("Nur Editor:innen dürfen Author-Management nutzen.");
  return { id: me.id };
}

function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "user";
}

function validateEmail(email: string): void {
  const trimmed = email.trim();
  if (!trimmed) throw new Error("E-Mail ist erforderlich.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("E-Mail-Format ungültig.");
  }
}

function validateDisplayName(name: string): void {
  if (!name.trim()) throw new Error("Anzeigename ist erforderlich.");
}

function validateRole(role: string): IntendedRole {
  if (role !== "author" && role !== "editor") {
    throw new Error("Rolle muss 'author' oder 'editor' sein.");
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
    throw new Error("Es existiert bereits ein aktiver Author mit dieser E-Mail.");
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
    throw new Error("Es existiert bereits eine aktive Einladung für diese E-Mail.");
  }
}

async function insertAuthorPlaceholder(args: {
  email: string;
  display_name: string;
  intended_role: IntendedRole;
}): Promise<AuthorRow> {
  const supabase = await createClient();
  const baseSlug = slugify(args.display_name || args.email.split("@")[0]);

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
}): Promise<InviteRow> {
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
  revalidateAdminPaths();
  return invite;
}

export async function createAuthorWithInvite(input: {
  email: string;
  display_name: string;
  intended_role: string;
}): Promise<{ author: AuthorRow; invite: InviteRow }> {
  const me = await requireEditor();
  validateEmail(input.email);
  validateDisplayName(input.display_name);
  const role = validateRole(input.intended_role);
  await assertEmailFree(input.email);

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
  revalidateAdminPaths();
  return { author, invite };
}

export async function createAuthorPlaceholder(input: {
  email: string;
  display_name: string;
  intended_role: string;
}): Promise<AuthorRow> {
  await requireEditor();
  validateEmail(input.email);
  validateDisplayName(input.display_name);
  const role = validateRole(input.intended_role);
  await assertEmailFree(input.email);

  const author = await insertAuthorPlaceholder({
    email: input.email,
    display_name: input.display_name,
    intended_role: role,
  });
  revalidateAdminPaths();
  return author;
}

export async function revokeInvite(id: string): Promise<void> {
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

export async function resendInvite(id: string): Promise<InviteRow> {
  await requireEditor();
  const supabase = await createClient();

  const { data: existing, error: readErr } = await supabase
    .from("invites")
    .select("*, created_author:authors!created_author_id(user_id)")
    .eq("id", id)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!existing) throw new Error("Einladung nicht gefunden.");

  const createdAuthor = (existing as unknown as { created_author: { user_id: string | null } | null }).created_author;
  if (existing.accepted_at && createdAuthor?.user_id) {
    throw new Error("Einladung wurde bereits eingelöst — der Author ist aktiv und kann nicht erneut eingeladen werden.");
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
  revalidateAdminPaths();
  return data;
}

export async function generateInviteForExistingPlaceholder(authorId: string): Promise<InviteRow> {
  const me = await requireEditor();
  const supabase = await createClient();

  const { data: author, error: readErr } = await supabase
    .from("authors")
    .select("id, email, display_name, role, user_id")
    .eq("id", authorId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!author) throw new Error("Author nicht gefunden.");
  if (author.user_id) throw new Error("Author ist bereits aktiv — keine Einladung mehr nötig.");
  if (author.role !== "author" && author.role !== "editor") {
    throw new Error("Externe Authors können nicht eingeladen werden (Rolle muss author oder editor sein).");
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
    throw new Error("Für diese E-Mail existiert bereits eine aktive Einladung.");
  }

  const invite = await insertInvite({
    email: author.email,
    display_name: author.display_name,
    intended_role: author.role,
    invited_by_id: me.id,
  });
  revalidateAdminPaths();
  return invite;
}

async function generateToken(): Promise<string> {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
