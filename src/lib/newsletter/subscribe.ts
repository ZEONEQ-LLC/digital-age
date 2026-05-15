"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { sendConfirmationMail } from "@/lib/newsletter/mail";

export type SubscribeSource = "footer" | "inline" | "full" | "sidebar";

export type SubscribeInput = {
  email: string;
  consent: boolean;
  source: SubscribeSource;
  consentText: string;
  // Honeypot: muss leer bleiben. Wenn gefüllt → Bot → silent success.
  honeypot?: string;
};

export type SubscribeResult =
  | { success: true }
  | { success: false; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_SOURCES: ReadonlySet<SubscribeSource> = new Set([
  "footer",
  "inline",
  "full",
  "sidebar",
]);

// Rate-Limit-Schwellen pro IP-Hash über die jeweiligen Zeitfenster.
const LIMIT_PER_HOUR = 5;
const LIMIT_PER_DAY = 20;

function hashIp(ip: string | null): string | null {
  const salt = process.env.NEWSLETTER_IP_HASH_SALT;
  if (!salt || !ip) return null;
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

async function getRequestContext(): Promise<{
  ipHash: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() ?? null : h.get("x-real-ip");
  return {
    ipHash: hashIp(ip),
    userAgent: h.get("user-agent"),
  };
}

export async function subscribeToNewsletter(
  input: SubscribeInput,
): Promise<SubscribeResult> {
  // Honeypot: gefülltes Feld = Bot. Silent success — Bot soll keinen
  // Unterschied zwischen Erfolg und Erkennung sehen.
  if (input.honeypot && input.honeypot.trim() !== "") {
    return { success: true };
  }

  const email = input.email?.trim().toLowerCase();
  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    return { success: false, message: "Bitte gib eine gültige E-Mail-Adresse ein." };
  }
  if (input.consent !== true) {
    return { success: false, message: "Bitte stimme der Einwilligung zu." };
  }
  if (!VALID_SOURCES.has(input.source)) {
    return { success: false, message: "Ungültige Quelle." };
  }
  if (!input.consentText || input.consentText.trim().length === 0) {
    return { success: false, message: "Consent-Text fehlt." };
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return { success: false, message: "Server-Konfiguration unvollständig." };
  }

  const { ipHash, userAgent } = await getRequestContext();

  // Rate-Limit-Check. Wenn IP-Hash vorhanden, schauen wir die Anzahl der
  // Attempts in den letzten Stunde + 24h an. Beide Limits = silent success
  // (kein Hinweis, dass blockiert wurde).
  if (ipHash) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: hourCount } = await supabase
      .from("newsletter_signup_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("attempted_at", oneHourAgo);

    const { count: dayCount } = await supabase
      .from("newsletter_signup_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("attempted_at", oneDayAgo);

    if ((hourCount ?? 0) >= LIMIT_PER_HOUR || (dayCount ?? 0) >= LIMIT_PER_DAY) {
      return { success: true };
    }

    // Attempt loggen + opportunistisches Cleanup alter Einträge (>24h).
    await supabase.from("newsletter_signup_attempts").insert({ ip_hash: ipHash });
    await supabase
      .from("newsletter_signup_attempts")
      .delete()
      .lt("attempted_at", oneDayAgo);
  }

  // Insert in newsletter_subscribers. Bei Unique-Conflict auf email
  // (Duplikat) returnen wir silent success — kein Hinweis "diese Email
  // ist bereits angemeldet" (Privacy: keine Email-Enumeration).
  // `confirmation_token` wird vom DB-Default generiert; via `.select()`
  // holen wir's zurück, um direkt die Confirmation-Mail zu versenden.
  const { data: inserted, error } = await supabase
    .from("newsletter_subscribers")
    .insert({
      email,
      status: "pending",
      source: input.source,
      consent_text: input.consentText,
      ip_hash: ipHash,
      user_agent: userAgent,
    })
    .select("confirmation_token")
    .single();

  if (error) {
    // 23505 = unique_violation (Postgres). Silent success.
    if (error.code === "23505") {
      return { success: true };
    }
    return { success: false, message: "Etwas ist schiefgelaufen. Bitte später nochmal versuchen." };
  }

  // Mail-Versand bewusst NICHT als hard fail: wenn Resend kaputt ist,
  // bleibt der Subscriber als `pending` in der DB und der User sieht
  // trotzdem Success-UI (Privacy: keine Email-Enumeration via Mail-Errors).
  // Editor kann Pending-Rows später manuell antriggern (Follow-up-PR).
  if (inserted?.confirmation_token) {
    await sendConfirmationMail({ email, token: inserted.confirmation_token });
  }

  return { success: true };
}
