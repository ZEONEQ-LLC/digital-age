"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit, getRequestContext, logAttempt } from "@/lib/rate-limit";
import { FormError, runAction, type ActionResult } from "@/lib/actionResult";
import { SITE_URL } from "@/lib/newsletter/mail";
import { getActiveStartupContact } from "@/lib/startupContact/data";
import { sendStartupContactMail } from "@/lib/startupContact/mail";
import {
  looksLikeBot,
  purposeLabel,
  validateContact,
  validateContactConsent,
  type StartupContactInput,
} from "@/lib/startupContact/validate";

// «Kontakt aufnehmen» auf /swiss-ai/<slug> (Entscheid Ali 11.11.2026): direkt
// ans Startup, nur mit dessen Einverstaendnis; die Redaktion sieht nur
// Metadaten (startup_contact_requests), nicht den Inhalt. Keine
// Bestaetigungsmail an Absender: sonst liesse sich das Formular nutzen, um
// fremden Adressen Mails zu schicken.

export type StartupContactResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const LIMIT_PER_HOUR = 3;
const LIMIT_PER_DAY = 10;
// Schutz der Startups: hoechstens so viele weitergeleitete Anfragen pro Tag.
const STARTUP_LIMIT_PER_DAY = 20;

export async function sendStartupContact(input: StartupContactInput): Promise<StartupContactResult> {
  // Erst validieren (ein Mensch mit leerem Formular soll Fehler sehen, kein
  // falsches «Danke»), dann Bot-Signale: still «Erfolg» melden, nichts senden.
  const v = validateContact(input);
  if (!v.ok) return { ok: false, message: "Bitte prüf die markierten Felder.", fieldErrors: v.fieldErrors };
  if (looksLikeBot(input, Date.now())) return { ok: true };
  const c = v.value;

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return { ok: false, message: "Kontaktaufnahme ist gerade nicht möglich." };
  }

  const { ipHash } = await getRequestContext();
  const limit = await checkRateLimit(supabase, ipHash, "startup_contact", { perHour: LIMIT_PER_HOUR, perDay: LIMIT_PER_DAY });
  if (!limit.allowed) {
    return { ok: false, message: "Zu viele Anfragen in kurzer Zeit. Bitte später nochmals versuchen." };
  }

  const { data: startup } = await supabase
    .from("ai_startups")
    .select("id, name, slug")
    .eq("slug", c.startupSlug)
    .in("status", ["published", "featured"])
    .maybeSingle();
  if (!startup) return { ok: false, message: "Dieses Startup gibt es nicht (mehr)." };

  const contact = await getActiveStartupContact(startup.id);
  if (!contact) {
    return { ok: false, message: "Für dieses Startup ist keine Kontaktaufnahme über digital age möglich." };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("startup_contact_requests")
    .select("id", { count: "exact", head: true })
    .eq("startup_id", startup.id)
    .gte("created_at", since);
  if ((count ?? 0) >= STARTUP_LIMIT_PER_DAY) {
    return { ok: false, message: "Dieses Startup hat heute schon viele Anfragen erhalten. Bitte morgen nochmals versuchen." };
  }

  await logAttempt(supabase, ipHash, "startup_contact");

  const sent = await sendStartupContactMail(contact.email, {
    startupName: startup.name,
    senderName: c.name,
    senderEmail: c.email,
    organization: c.organization,
    purposeLabel: purposeLabel(c.purpose),
    message: c.message,
    profileUrl: `${SITE_URL}/swiss-ai/${startup.slug}`,
    optOutUrl: `${SITE_URL}/startup-kontakt/beenden/${contact.optoutToken}`,
  });

  // Nur Metadaten speichern (wann, welches Startup, Zweck, zugestellt).
  const { error: logErr } = await supabase
    .from("startup_contact_requests")
    .insert({ startup_id: startup.id, purpose: c.purpose, delivered: sent.ok });
  if (logErr) console.error("[startup-contact] request log failed:", logErr.message);

  if (!sent.ok) {
    return { ok: false, message: "Die Nachricht konnte nicht zugestellt werden. Bitte später nochmals versuchen." };
  }
  revalidatePath("/autor/admin/startups");
  return { ok: true };
}

// Link «Weiterleitung beenden» aus der Mail (Seite mit Bestaetigungsknopf,
// damit Link-Scanner von Mailprogrammen nichts ausloesen).
export async function endForwardingByToken(token: string): Promise<{ ok: true; startupName: string } | { ok: false; message: string }> {
  if (!/^[a-f0-9]{36}$/.test(token)) return { ok: false, message: "Der Link ist ungültig." };
  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return { ok: false, message: "Gerade nicht möglich. Bitte später nochmals versuchen." };
  }
  const { data: row } = await supabase
    .from("startup_contacts")
    .select("startup_id, revoked_at, startup:ai_startups(name, slug)")
    .eq("optout_token", token)
    .maybeSingle();
  if (!row) return { ok: false, message: "Der Link ist ungültig oder abgelaufen." };
  const s = row.startup as { name: string; slug: string } | null;
  if (!row.revoked_at) {
    const { error } = await supabase
      .from("startup_contacts")
      .update({ revoked_at: new Date().toISOString() })
      .eq("optout_token", token);
    if (error) return { ok: false, message: "Gerade nicht möglich. Bitte später nochmals versuchen." };
    if (s) revalidatePath(`/swiss-ai/${s.slug}`);
    revalidatePath("/autor/admin/startups");
  }
  return { ok: true, startupName: s?.name ?? "euer Startup" };
}

// ---- Admin (Editoren) ----------------------------------------------------

async function requireEditor(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new FormError("Nicht eingeloggt.");
  const { data: me } = await supabase.from("authors").select("role").eq("user_id", user.id).maybeSingle();
  if (!me) throw new FormError("Author-Profil nicht gefunden.");
  if (me.role !== "editor") throw new FormError("Nur Editor:innen.");
}

async function revalidateStartup(startupId: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.from("ai_startups").select("slug").eq("id", startupId).maybeSingle();
  if (data?.slug) revalidatePath(`/swiss-ai/${data.slug}`);
  revalidatePath("/autor/admin/startups");
}

// Kontaktadresse setzen, nur mit bestaetigtem Einverstaendnis des Startups
// (z.B. schriftlich per Mail). Reaktiviert eine beendete Weiterleitung.
export async function saveStartupContact(
  startupId: string,
  input: { email: string; consentConfirmed: boolean; note: string },
): Promise<ActionResult<null>> {
  return runAction("startupContact.save", async () => {
    await requireEditor();
    const checked = validateContactConsent(input.email, input.consentConfirmed);
    if (checked.error || !checked.email) throw new FormError(checked.error ?? "Bitte eine Kontakt-E-Mail angeben.");
    const note = input.note.trim();
    if (note.length > 300) throw new FormError("Notiz zu lang (max. 300 Zeichen).");
    const supabase = await createClient();
    const { error } = await supabase.from("startup_contacts").upsert(
      {
        startup_id: startupId,
        email: checked.email,
        consent_at: new Date().toISOString(),
        consent_source: "editor",
        consent_note: note || null,
        revoked_at: null,
      },
      { onConflict: "startup_id" },
    );
    if (error) throw error;
    await revalidateStartup(startupId);
    return null;
  });
}

export async function endStartupContact(startupId: string): Promise<ActionResult<null>> {
  return runAction("startupContact.end", async () => {
    await requireEditor();
    const supabase = await createClient();
    const { error } = await supabase
      .from("startup_contacts")
      .update({ revoked_at: new Date().toISOString() })
      .eq("startup_id", startupId)
      .is("revoked_at", null);
    if (error) throw error;
    await revalidateStartup(startupId);
    return null;
  });
}
