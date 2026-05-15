"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public-Unsubscribe-Rate-Limit: 10 Versuche/IP/Stunde. Über-Limit →
// silent success (keine Email-/Token-Enumeration via Unterschiede).
const LIMIT_PER_HOUR = 10;

function hashIp(ip: string | null): string | null {
  const salt = process.env.NEWSLETTER_IP_HASH_SALT;
  if (!salt || !ip) return null;
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

async function getIpHash(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0]?.trim() ?? null
    : h.get("x-real-ip");
  return hashIp(ip);
}

export type PublicUnsubscribeResult =
  | { success: true }
  | { success: false; message: string };

export async function unsubscribeByToken(
  token: string,
): Promise<PublicUnsubscribeResult> {
  if (!UUID_RE.test(token)) {
    return { success: true };
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return { success: false, message: "Server-Konfiguration unvollständig." };
  }

  const ipHash = await getIpHash();
  if (ipHash) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("newsletter_signup_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("action", "unsubscribe")
      .gte("attempted_at", oneHourAgo);

    if ((count ?? 0) >= LIMIT_PER_HOUR) {
      return { success: true };
    }

    await supabase
      .from("newsletter_signup_attempts")
      .insert({ ip_hash: ipHash, action: "unsubscribe" });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("newsletter_signup_attempts")
      .delete()
      .lt("attempted_at", oneDayAgo);
  }

  const { data: sub } = await supabase
    .from("newsletter_subscribers")
    .select("id, status")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (!sub) {
    return { success: true }; // silent
  }

  // Bereits unsubscribed → idempotent success.
  if (sub.status === "unsubscribed") {
    return { success: true };
  }

  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("id", sub.id);

  if (error) {
    return { success: false, message: "Etwas ist schiefgelaufen." };
  }
  return { success: true };
}
