"use server";

import { revalidatePath } from "next/cache";

import { FormError, runAction, type ActionResult } from "@/lib/actionResult";
import { SITE_URL } from "@/lib/newsletter/mail";
import { INVITE_STARTUP_COLUMNS, mediaPublicUrl, type InviteStartup } from "@/lib/showcase/inviteApi";
import { sendShowcaseInviteMail } from "@/lib/showcase/mail";
import {
  PROFILE_LABELS,
  SHOWCASE_INVITE_PATH,
  firstName,
  formatLongDate,
  inviteState,
  profileFromStartup,
  profilePatchFromChanges,
  validateInvite,
  type InviteInput,
  type ProfileValues,
} from "@/lib/showcase/questionnaire";
import { addDays, zurichToday } from "@/lib/stats/summary";
import { createClient } from "@/lib/supabase/server";

// Showcase S3a: Actions der Redaktion (Einladen, Erinnern, Zurueckziehen,
// Profil und Logo uebernehmen). Sitzungs-Client: RLS laesst nur
// Editor:innen an showcase_submissions und ai_startups schreiben.

const ADMIN_PATH = "/autor/admin/startups";

async function requireEditor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new FormError("Nicht eingeloggt.");
  const { data: me } = await supabase.from("authors").select("id, role, email").eq("user_id", user.id).maybeSingle();
  if (!me) throw new FormError("Author-Profil nicht gefunden.");
  if (me.role !== "editor") throw new FormError("Nur Editor:innen.");
  return { supabase, me };
}

function inviteLink(token: string): string {
  return `${SITE_URL}${SHOWCASE_INVITE_PATH}/${token}`;
}

// Unternehmen einladen. Legt die Einladung an und schickt auf Wunsch gleich
// die Mail. Pro Unternehmen gibt es hoechstens eine offene Einladung; eine
// abgelaufene wird dabei zurueckgezogen.
export async function inviteToShowcase(
  startupId: string,
  input: InviteInput,
): Promise<ActionResult<{ id: string; mailSent: boolean | null }>> {
  return runAction("showcase.invite", async () => {
    const { supabase, me } = await requireEditor();
    const today = zurichToday();
    const checked = validateInvite(input, today);
    if (!checked.ok) throw new FormError(checked.message);
    const v = checked.value;

    const { data: startup } = await supabase
      .from("ai_startups")
      .select("id, name, status")
      .eq("id", startupId)
      .maybeSingle();
    if (!startup) throw new FormError("Unternehmen nicht gefunden.");
    if (startup.status !== "published" && startup.status !== "featured") {
      throw new FormError("Einladen lassen sich nur Unternehmen, die im Verzeichnis sichtbar sind.");
    }

    const { data: open } = await supabase
      .from("showcase_submissions")
      .select("id, status, expires_at")
      .eq("startup_id", startupId)
      .eq("status", "invited")
      .maybeSingle();
    if (open) {
      if (inviteState(open, Date.now()) === "open") {
        throw new FormError("Für dieses Unternehmen gibt es schon eine offene Einladung.");
      }
      const { error: closeErr } = await supabase
        .from("showcase_submissions")
        .update({ status: "withdrawn" })
        .eq("id", open.id);
      if (closeErr) throw closeErr;
    }

    // Gueltig 60 Tage, mindestens aber bis zwei Wochen nach «Antwort bis».
    const minExpiry = addDays(today, 60);
    const byReply = v.reply_by ? addDays(v.reply_by, 14) : minExpiry;
    const expires = byReply > minExpiry ? byReply : minExpiry;

    const { data: row, error } = await supabase
      .from("showcase_submissions")
      .insert({
        startup_id: startupId,
        invitee_name: v.invitee_name,
        invitee_email: v.invitee_email,
        reply_by: v.reply_by,
        invited_by: me.id,
        expires_at: `${expires}T23:59:59+01:00`,
      })
      .select("id, token")
      .single();
    if (error) throw error;

    let mailSent: boolean | null = null;
    if (v.sendMail && v.invitee_email && v.invitee_name && v.reply_by) {
      const sent = await sendShowcaseInviteMail(v.invitee_email, {
        firstName: firstName(v.invitee_name),
        company: startup.name,
        link: inviteLink(row.token),
        replyBy: formatLongDate(v.reply_by),
      });
      mailSent = sent.ok;
      if (sent.ok) {
        await supabase.from("showcase_submissions").update({ invite_sent_at: new Date().toISOString() }).eq("id", row.id);
      }
    }
    revalidatePath(ADMIN_PATH);
    return { id: row.id, mailSent };
  });
}

// Einladung senden, erinnern oder als Test an die eigene Adresse schicken.
export async function sendShowcaseInvite(
  id: string,
  mode: "invite" | "reminder" | "test",
): Promise<ActionResult<{ to: string }>> {
  return runAction("showcase.sendInvite", async () => {
    const { supabase, me } = await requireEditor();
    const { data: row } = await supabase
      .from("showcase_submissions")
      .select("id, token, status, expires_at, invitee_name, invitee_email, reply_by, startup:ai_startups(name)")
      .eq("id", id)
      .maybeSingle();
    if (!row) throw new FormError("Einladung nicht gefunden.");
    if (inviteState(row, Date.now()) !== "open") throw new FormError("Diese Einladung ist nicht mehr offen.");
    if (!row.invitee_name || !row.reply_by) {
      throw new FormError("Für die Mail braucht es einen Namen und ein Datum «Antwort bis».");
    }
    const to = mode === "test" ? me.email : row.invitee_email;
    if (!to) throw new FormError(mode === "test" ? "In deinem Profil fehlt die E-Mail-Adresse." : "Für den Versand braucht es eine E-Mail-Adresse.");

    const sent = await sendShowcaseInviteMail(
      to,
      {
        firstName: firstName(row.invitee_name),
        company: (row.startup as { name: string } | null)?.name ?? "Euer Unternehmen",
        link: inviteLink(row.token),
        replyBy: formatLongDate(row.reply_by),
        reminder: mode === "reminder",
      },
      { test: mode === "test" },
    );
    if (!sent.ok) throw new FormError("Die Mail konnte nicht gesendet werden. Bitte später nochmals versuchen.");

    if (mode !== "test") {
      const stamp = new Date().toISOString();
      const { error } = await supabase
        .from("showcase_submissions")
        .update(mode === "invite" ? { invite_sent_at: stamp } : { reminded_at: stamp })
        .eq("id", id);
      if (error) throw error;
      revalidatePath(ADMIN_PATH);
    }
    return { to };
  });
}

// Offene Einladung zurueckziehen: Der Link zeigt danach nichts mehr.
export async function withdrawShowcaseInvite(id: string): Promise<ActionResult<null>> {
  return runAction("showcase.withdraw", async () => {
    const { supabase } = await requireEditor();
    const { data, error } = await supabase
      .from("showcase_submissions")
      .update({ status: "withdrawn" })
      .eq("id", id)
      .eq("status", "invited")
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new FormError("Diese Einladung ist nicht mehr offen.");
    revalidatePath(ADMIN_PATH);
    return null;
  });
}

async function loadSubmitted(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data: row } = await supabase
    .from("showcase_submissions")
    .select(`id, status, startup_id, profile_changes, logo_path, startup:ai_startups(${INVITE_STARTUP_COLUMNS})`)
    .eq("id", id)
    .maybeSingle();
  if (!row) throw new FormError("Einreichung nicht gefunden.");
  if (row.status !== "submitted") throw new FormError("Der Fragebogen ist noch nicht abgeschickt.");
  const startup = row.startup as InviteStartup | null;
  if (!startup) throw new FormError("Unternehmen nicht gefunden.");
  return { row, startup };
}

// Vom Unternehmen bestaetigte Profildaten ins Verzeichnis uebernehmen. Jede
// Aenderung wird nochmals geprueft; ungueltige fallen weg und werden genannt.
// Setzt verified_at: Das Unternehmen hat seine Angaben bestaetigt.
export async function applyShowcaseProfile(
  id: string,
): Promise<ActionResult<{ applied: string[]; rejected: string[] }>> {
  return runAction("showcase.applyProfile", async () => {
    const { supabase } = await requireEditor();
    const { row, startup } = await loadSubmitted(supabase, id);
    const { patch, rejected } = profilePatchFromChanges(profileFromStartup(startup), row.profile_changes);
    const stamp = new Date().toISOString();

    const { error } = await supabase
      .from("ai_startups")
      .update({ ...patch, verified_at: stamp })
      .eq("id", startup.id);
    if (error) throw error;
    const { error: markErr } = await supabase
      .from("showcase_submissions")
      .update({ profile_applied_at: stamp })
      .eq("id", id);
    if (markErr) throw markErr;

    revalidatePath("/swiss-ai");
    revalidatePath(`/swiss-ai/${startup.slug}`);
    revalidatePath("/showcase");
    revalidatePath("/");
    revalidatePath(ADMIN_PATH);

    const label = (key: string) =>
      key === "last_round_at" ? PROFILE_LABELS.last_round_month : PROFILE_LABELS[key as keyof ProfileValues] ?? key;
    return { applied: Object.keys(patch).map(label), rejected: rejected.map(label) };
  });
}

// Hochgeladenes Logo als Logo des Verzeichnisprofils setzen.
export async function applyShowcaseLogo(id: string): Promise<ActionResult<null>> {
  return runAction("showcase.applyLogo", async () => {
    const { supabase } = await requireEditor();
    const { row, startup } = await loadSubmitted(supabase, id);
    const url = mediaPublicUrl(row.logo_path);
    if (!url) throw new FormError("Zu dieser Einreichung gibt es kein Logo.");

    const { error } = await supabase.from("ai_startups").update({ logo_url: url }).eq("id", startup.id);
    if (error) throw error;
    const { error: markErr } = await supabase
      .from("showcase_submissions")
      .update({ logo_applied_at: new Date().toISOString() })
      .eq("id", id);
    if (markErr) throw markErr;

    revalidatePath("/swiss-ai");
    revalidatePath(`/swiss-ai/${startup.slug}`);
    revalidatePath("/showcase");
    revalidatePath("/");
    revalidatePath(ADMIN_PATH);
    return null;
  });
}
