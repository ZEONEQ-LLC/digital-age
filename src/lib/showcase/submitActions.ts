"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";

import { SITE_URL } from "@/lib/newsletter/mail";
import { checkRateLimit, getRequestContext, logAttempt } from "@/lib/rate-limit";
import { getInviteByToken, mediaPublicUrl } from "@/lib/showcase/inviteApi";
import { sendShowcaseReceivedMail, sendShowcaseSubmittedMail } from "@/lib/showcase/mail";
import {
  MEDIA_BUCKET,
  MEDIA_MAX_BYTES,
  SHOWCASE_TOKEN_RE,
  diffProfile,
  firstName,
  looksLikeBot,
  mediaPath,
  mediaPathBelongsTo,
  profileFromStartup,
  sniffImageType,
  validateSubmission,
  type MediaKind,
  type SubmissionInput,
} from "@/lib/showcase/questionnaire";
import { createServiceClient } from "@/lib/supabase/service";

// Showcase S3a: Server Actions des Fragebogens (/showcase/mitmachen/<token>).
// Ohne Login: Der Token ist der Zugang, geschrieben wird mit der Service-Role.
// Jede Action prueft Token, Zustand der Einladung und ein IP-Rate-Limit.

const UPLOAD_LIMIT = { perHour: 20, perDay: 60 };
const SUBMIT_LIMIT = { perHour: 5, perDay: 20 };

const CLOSED_MESSAGE: Record<string, string> = {
  submitted: "Dieser Fragebogen wurde schon abgeschickt.",
  expired: "Dieser Link ist abgelaufen. Bitte melde dich bei der Redaktion.",
  withdrawn: "Dieser Link ist nicht mehr gültig.",
};

export type UploadResult = { ok: true; path: string; url: string } | { ok: false; message: string };

// Logo oder Bild hochladen. Die Datei wird an ihren ersten Bytes erkannt
// (nur PNG und WebP), nicht am Namen. Der Pfad traegt die Kennung des
// Unternehmens: Eine Einreichung kann nur auf eigene Dateien zeigen.
export async function uploadShowcaseMedia(token: string, kind: MediaKind, formData: FormData): Promise<UploadResult> {
  if (!SHOWCASE_TOKEN_RE.test(token) || (kind !== "logo" && kind !== "bild")) {
    return { ok: false, message: "Der Link ist ungültig." };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Bitte eine Datei wählen." };
  if (file.size > MEDIA_MAX_BYTES) return { ok: false, message: "Die Datei ist zu gross." };

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return { ok: false, message: "Hochladen ist gerade nicht möglich. Bitte später nochmals versuchen." };
  }
  const { ipHash } = await getRequestContext();
  const limit = await checkRateLimit(supabase, ipHash, "showcase_upload", UPLOAD_LIMIT);
  if (!limit.allowed) return { ok: false, message: "Zu viele Uploads in kurzer Zeit. Bitte später nochmals versuchen." };

  const invite = await getInviteByToken(token);
  if (!invite) return { ok: false, message: "Der Link ist ungültig." };
  if (invite.state !== "open") return { ok: false, message: CLOSED_MESSAGE[invite.state] };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return { ok: false, message: "Bitte ein PNG oder WebP hochladen." };

  await logAttempt(supabase, ipHash, "showcase_upload");
  const path = mediaPath(invite.startup.id, kind, crypto.randomBytes(8).toString("hex"), type);
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, bytes, {
    contentType: type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("[showcase:upload] failed:", error.message);
    return { ok: false, message: "Das Hochladen hat nicht geklappt. Bitte nochmals versuchen." };
  }
  const url = mediaPublicUrl(path);
  if (!url) return { ok: false, message: "Das Hochladen hat nicht geklappt. Bitte nochmals versuchen." };
  return { ok: true, path, url };
}

export type SubmitResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

// Fragebogen abschicken. Reihenfolge: Eingaben pruefen (ein Mensch soll seine
// Fehler sehen), Bot-Signale (still «Erfolg»), Token, Rate-Limit, Zustand der
// Einladung, dann speichern, Einverstaendnis eintragen, Mails.
export async function submitShowcase(token: string, input: SubmissionInput): Promise<SubmitResult> {
  const v = validateSubmission(input);
  if (!v.ok) return { ok: false, message: "Bitte prüf die markierten Felder.", fieldErrors: v.fieldErrors };
  if (looksLikeBot(input, Date.now())) return { ok: true };
  if (!SHOWCASE_TOKEN_RE.test(token)) return { ok: false, message: "Der Link ist ungültig." };
  const s = v.value;

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return { ok: false, message: "Absenden ist gerade nicht möglich. Bitte später nochmals versuchen." };
  }
  const { ipHash } = await getRequestContext();
  const limit = await checkRateLimit(supabase, ipHash, "showcase_submit", SUBMIT_LIMIT);
  if (!limit.allowed) return { ok: false, message: "Zu viele Versuche in kurzer Zeit. Bitte später nochmals versuchen." };

  const invite = await getInviteByToken(token);
  if (!invite) return { ok: false, message: "Der Link ist ungültig." };
  if (invite.state !== "open") return { ok: false, message: CLOSED_MESSAGE[invite.state] };
  const { startup, row } = invite;

  if (!mediaPathBelongsTo(s.logo_path, startup.id, "logo") || !mediaPathBelongsTo(s.image_path, startup.id, "bild")) {
    return { ok: false, message: "Logo oder Bild bitte nochmals hochladen." };
  }

  await logAttempt(supabase, ipHash, "showcase_submit");

  const changes = diffProfile(profileFromStartup(startup), s.profile);
  const now = new Date().toISOString();
  const { data: saved, error } = await supabase
    .from("showcase_submissions")
    .update({
      status: "submitted",
      submitted_at: now,
      contact_name: s.contact_name,
      contact_role: s.contact_role,
      contact_email: s.contact_email,
      answers: s.answers,
      own_text: s.own_text,
      links: s.links,
      logo_path: s.logo_path,
      image_path: s.image_path,
      profile_changes: changes,
      consent_data_confirmed: true,
      consent_labelling: true,
      consent_media_rights: s.consent_media_rights,
      consent_contact_email: s.consent_contact_email,
    })
    .eq("id", row.id)
    .eq("status", "invited")
    .select("id");
  if (error) {
    console.error("[showcase:submit] save failed:", error.message);
    return { ok: false, message: "Das Absenden hat nicht geklappt. Bitte nochmals versuchen." };
  }
  // Zwei Tabs gleichzeitig: Der zweite trifft keine Zeile mehr.
  if (!saved || saved.length === 0) return { ok: false, message: CLOSED_MESSAGE.submitted };

  // Einverstaendnis zur Kontaktweiterleitung: gilt ab jetzt, der Knopf
  // «Kontakt aufnehmen» erscheint auf dem Profil. Beenden kann das
  // Unternehmen ueber den Link in jeder weitergeleiteten Mail.
  if (s.consent_contact_email) {
    const { error: contactErr } = await supabase.from("startup_contacts").upsert(
      {
        startup_id: startup.id,
        email: s.consent_contact_email,
        consent_at: now,
        consent_source: "showcase",
        consent_note: `Im Showcase-Fragebogen bestätigt von ${s.contact_name}, ${s.contact_role}`.slice(0, 300),
        revoked_at: null,
      },
      { onConflict: "startup_id" },
    );
    if (contactErr) console.error("[showcase:submit] contact consent failed:", contactErr.message);
    else revalidatePath(`/swiss-ai/${startup.slug}`);
  }

  const extras: string[] = [];
  if (s.logo_path) extras.push("Logo");
  if (s.image_path) extras.push("Bild");
  const changed = Object.keys(changes).length;
  if (changed > 0) extras.push(changed === 1 ? "1 Profiländerung" : `${changed} Profiländerungen`);
  if (s.consent_contact_email) extras.push("Einverständnis zur Kontaktweiterleitung");

  // Mails duerfen das Absenden nicht scheitern lassen.
  await Promise.all([
    sendShowcaseReceivedMail(s.contact_email, {
      firstName: firstName(s.contact_name),
      company: startup.name,
      forwardingEmail: s.consent_contact_email,
    }),
    sendShowcaseSubmittedMail({
      company: startup.name,
      contact: `${s.contact_name} (${s.contact_role})`,
      mode: s.own_text ? "eigener Text" : "Fragen beantwortet",
      extras,
      adminUrl: `${SITE_URL}/autor/admin/startups#showcase`,
    }),
  ]);

  revalidatePath("/autor/admin/startups");
  return { ok: true };
}
