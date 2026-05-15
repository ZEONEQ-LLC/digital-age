"use server";

import { createServiceClient } from "@/lib/supabase/service";
import {
  checkRateLimit,
  getRequestContext,
  logAttempt,
} from "@/lib/rate-limit";
import {
  sendPitchConfirmation,
  sendPitchNotification,
} from "@/lib/pitch/mail";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/\S+$/i;

export type PitchInput = {
  title: string;
  excerpt: string;
  category?: string;
  bodyMd: string;
  authorName: string;
  authorEmail: string;
  authorRole?: string;
  authorBio: string;
  authorWebsite?: string;
  original: boolean;
  editorial: boolean;
  honeypot?: string;
};

export type PitchResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const LIMIT_PER_HOUR = 5;
const LIMIT_PER_DAY = 20;
const TITLE_MIN = 8;
const TITLE_MAX = 200;
const EXCERPT_MIN = 200;
const EXCERPT_MAX = 800;
const BODY_MIN = 1500;
const BODY_MAX = 10000;
const BIO_MIN = 30;
const BIO_MAX = 500;

function validate(input: PitchInput): Record<string, string> {
  const errors: Record<string, string> = {};

  const title = input.title?.trim() ?? "";
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    errors.title = `Titel muss ${TITLE_MIN}–${TITLE_MAX} Zeichen haben.`;
  }
  const excerpt = input.excerpt?.trim() ?? "";
  if (excerpt.length < EXCERPT_MIN) {
    errors.excerpt = `Abstract zu kurz (min. ${EXCERPT_MIN}).`;
  } else if (excerpt.length > EXCERPT_MAX) {
    errors.excerpt = `Abstract zu lang (max. ${EXCERPT_MAX}).`;
  }
  const bodyMd = input.bodyMd?.trim() ?? "";
  if (bodyMd.length < BODY_MIN) {
    errors.bodyMd = `Volltext zu kurz (min. ${BODY_MIN}).`;
  } else if (bodyMd.length > BODY_MAX) {
    errors.bodyMd = `Volltext zu lang (max. ${BODY_MAX}).`;
  }
  const authorName = input.authorName?.trim() ?? "";
  if (authorName.length < 2 || authorName.length > 120) {
    errors.authorName = "Name fehlt oder zu lang.";
  }
  const authorEmail = input.authorEmail?.trim().toLowerCase() ?? "";
  if (!authorEmail || authorEmail.length > 255 || !EMAIL_RE.test(authorEmail)) {
    errors.authorEmail = "E-Mail-Format wirkt ungültig.";
  }
  const authorBio = input.authorBio?.trim() ?? "";
  if (authorBio.length < BIO_MIN) {
    errors.authorBio = `Bio zu kurz (min. ${BIO_MIN}).`;
  } else if (authorBio.length > BIO_MAX) {
    errors.authorBio = `Bio zu lang (max. ${BIO_MAX}).`;
  }
  const authorWebsite = (input.authorWebsite ?? "").trim();
  if (authorWebsite !== "" && (!URL_RE.test(authorWebsite) || authorWebsite.length > 500)) {
    errors.authorWebsite = "URL-Format wirkt ungültig.";
  }
  if (input.original !== true) {
    errors.original = "Originalbeitrag-Bestätigung erforderlich.";
  }
  if (input.editorial !== true) {
    errors.editorial = "Redaktionelle-Anpassungs-OK erforderlich.";
  }
  return errors;
}

export async function submitArticlePitch(
  rawInput: PitchInput,
): Promise<PitchResult> {
  if (rawInput.honeypot && rawInput.honeypot.trim() !== "") {
    return { ok: true };
  }

  const fieldErrors = validate(rawInput);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Bitte prüf die markierten Felder.",
      fieldErrors,
    };
  }

  const title = rawInput.title.trim();
  const excerpt = rawInput.excerpt.trim();
  const category = (rawInput.category ?? "").trim();
  const bodyMd = rawInput.bodyMd.trim();
  const authorName = rawInput.authorName.trim();
  const authorEmail = rawInput.authorEmail.trim().toLowerCase();
  const authorRole = (rawInput.authorRole ?? "").trim();
  const authorBio = rawInput.authorBio.trim();
  const authorWebsite = (rawInput.authorWebsite ?? "").trim();

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return { ok: false, message: "Server-Konfiguration unvollständig." };
  }

  const { ipHash } = await getRequestContext();
  const limit = await checkRateLimit(supabase, ipHash, "pitch", {
    perHour: LIMIT_PER_HOUR,
    perDay: LIMIT_PER_DAY,
  });
  if (!limit.allowed) {
    return { ok: true };
  }

  const { data: inserted, error } = await supabase
    .from("article_pitches")
    .insert({
      title,
      excerpt,
      category: category === "" ? null : category,
      body_md: bodyMd,
      author_name: authorName,
      author_email: authorEmail,
      author_role: authorRole === "" ? null : authorRole,
      author_bio: authorBio,
      author_website: authorWebsite === "" ? null : authorWebsite,
      ip_hash: ipHash,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[pitch] insert error:", error);
    return {
      ok: false,
      message: "Etwas ist schiefgelaufen. Bitte später nochmal versuchen.",
    };
  }

  await logAttempt(supabase, ipHash, "pitch");

  // Beide Mails parallel — Editor-Notification + Submitter-Confirmation.
  // Failure ist nicht-kritisch: DB-Row bleibt, Editor sieht im Admin.
  await Promise.allSettled([
    sendPitchNotification({
      id: inserted.id,
      title,
      excerpt,
      bodyMd,
      category: category === "" ? null : category,
      authorName,
      authorEmail,
      authorRole: authorRole === "" ? null : authorRole,
      authorBio,
      authorWebsite: authorWebsite === "" ? null : authorWebsite,
    }),
    sendPitchConfirmation({
      authorName,
      authorEmail,
      title,
    }),
  ]);

  return { ok: true };
}
