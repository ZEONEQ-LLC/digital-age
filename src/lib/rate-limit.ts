import "server-only";

import crypto from "node:crypto";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Geteilte Rate-Limit-Helper für Public-Form-Submissions
// (`subscribeToNewsletter`, `unsubscribeByToken`, `submitContactMessage`,
// `submitArticlePitch`). Alle nutzen die `newsletter_signup_attempts`-
// Tabelle, getrennt nach `action` damit ein Pitch-Submission den
// Subscribe-Pool nicht aufbraucht.
//
// Wenn `NEWSLETTER_IP_HASH_SALT` nicht gesetzt ist, wird kein IP-Hash
// gespeichert — Rate-Limit fällt dann auf "kein Limit" zurück. Das ist
// Absicht: lieber kein Limit als false-positive bei fehlender Konfig.

export type RateLimitAction =
  | "subscribe"
  | "unsubscribe"
  | "contact"
  | "pitch";

type SbClient = SupabaseClient<Database>;

export function hashIp(ip: string | null): string | null {
  const salt = process.env.NEWSLETTER_IP_HASH_SALT;
  if (!salt || !ip) return null;
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function getRequestContext(): Promise<{
  ipHash: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded
    ? (forwarded.split(",")[0]?.trim() ?? null)
    : h.get("x-real-ip");
  return { ipHash: hashIp(ip), userAgent: h.get("user-agent") };
}

export async function checkRateLimit(
  supabase: SbClient,
  ipHash: string | null,
  action: RateLimitAction,
  opts: { perHour: number; perDay: number },
): Promise<{ allowed: boolean }> {
  if (!ipHash) return { allowed: true };
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [hourRes, dayRes] = await Promise.all([
    supabase
      .from("newsletter_signup_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("action", action)
      .gte("attempted_at", oneHourAgo),
    supabase
      .from("newsletter_signup_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("action", action)
      .gte("attempted_at", oneDayAgo),
  ]);

  const hour = hourRes.count ?? 0;
  const day = dayRes.count ?? 0;
  if (hour >= opts.perHour || day >= opts.perDay) {
    return { allowed: false };
  }
  return { allowed: true };
}

export async function logAttempt(
  supabase: SbClient,
  ipHash: string | null,
  action: RateLimitAction,
): Promise<void> {
  if (!ipHash) return;
  await supabase
    .from("newsletter_signup_attempts")
    .insert({ ip_hash: ipHash, action });

  // Opportunistisches Cleanup: alles >24h alt aus der Tabelle löschen.
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("newsletter_signup_attempts")
    .delete()
    .lt("attempted_at", oneDayAgo);
}
