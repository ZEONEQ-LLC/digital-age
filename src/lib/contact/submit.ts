"use server";

import { createServiceClient } from "@/lib/supabase/service";
import {
  checkRateLimit,
  getRequestContext,
  logAttempt,
} from "@/lib/rate-limit";
import { sendContactNotification } from "@/lib/contact/mail";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactInput = {
  name: string;
  email: string;
  topic: string;
  organization?: string;
  message: string;
  privacyAccepted: boolean;
  honeypot?: string;
};

export type ContactResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const LIMIT_PER_HOUR = 5;
const LIMIT_PER_DAY = 20;
const MAX_MESSAGE = 5000;
const MIN_MESSAGE = 20;

function validate(input: ContactInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = input.name?.trim() ?? "";
  if (name.length < 2 || name.length > 120) {
    errors.name = "Name fehlt oder zu lang.";
  }
  const email = input.email?.trim().toLowerCase() ?? "";
  if (!email || email.length > 255 || !EMAIL_RE.test(email)) {
    errors.email = "E-Mail-Format wirkt ungültig.";
  }
  const topic = input.topic?.trim() ?? "";
  if (topic.length < 2 || topic.length > 80) {
    errors.topic = "Bitte wähle ein Anliegen.";
  }
  const organization = (input.organization ?? "").trim();
  if (organization.length > 200) {
    errors.organization = "Organisation zu lang.";
  }
  const message = input.message?.trim() ?? "";
  if (message.length < MIN_MESSAGE) {
    errors.message = `Mindestens ${MIN_MESSAGE} Zeichen.`;
  } else if (message.length > MAX_MESSAGE) {
    errors.message = `Maximal ${MAX_MESSAGE} Zeichen.`;
  }
  if (input.privacyAccepted !== true) {
    errors.privacyAccepted = "Bitte Datenschutz bestätigen.";
  }
  return errors;
}

export async function submitContactMessage(
  rawInput: ContactInput,
): Promise<ContactResult> {
  // Honeypot: gefülltes Feld = Bot. Silent success ohne DB-Insert.
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

  const name = rawInput.name.trim();
  const email = rawInput.email.trim().toLowerCase();
  const topic = rawInput.topic.trim();
  const organization = (rawInput.organization ?? "").trim();
  const message = rawInput.message.trim();

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return { ok: false, message: "Server-Konfiguration unvollständig." };
  }

  const { ipHash } = await getRequestContext();
  const limit = await checkRateLimit(supabase, ipHash, "contact", {
    perHour: LIMIT_PER_HOUR,
    perDay: LIMIT_PER_DAY,
  });
  if (!limit.allowed) {
    // Silent success — keine Hinweise, dass blockiert wurde.
    return { ok: true };
  }

  const { data: inserted, error } = await supabase
    .from("contact_messages")
    .insert({
      name,
      email,
      topic,
      organization: organization === "" ? null : organization,
      message,
      ip_hash: ipHash,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[contact] insert error:", error);
    return {
      ok: false,
      message: "Etwas ist schiefgelaufen. Bitte später nochmal versuchen.",
    };
  }

  await logAttempt(supabase, ipHash, "contact");

  // Mail-Send fire-and-await, aber nicht-kritisch: bei Failure bleibt die
  // Nachricht in der DB (Editor sieht im Admin), User sieht trotzdem
  // Success.
  await sendContactNotification({
    id: inserted.id,
    name,
    email,
    topic,
    organization: organization === "" ? null : organization,
    message,
  });

  return { ok: true };
}
