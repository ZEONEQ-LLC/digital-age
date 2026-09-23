import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Signiertes Auslieferungs-Token (J3): Der Client kennt keine IDs, sondern
// bekommt beim Ausliefern ein HMAC-signiertes Token und schickt es mit dem
// Ereignis zurueck. Schluessel aus SUPABASE_SERVICE_ROLE_KEY abgeleitet,
// 6 h gueltig, kein DB-Zugriff. Fehlt der Service-Key, liefert sign() null:
// die Route sendet dann kein Token, der Client zaehlt nichts.
export type DeliveryPayload = { c: string; r: string; p: string; t: number };

const MAX_AGE_S = 6 * 60 * 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function key(): Buffer | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return createHash("sha256").update(`module-delivery:${secret}`).digest();
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function mac(k: Buffer, data: string): string {
  return b64url(createHmac("sha256", k).update(data).digest());
}

export function signDelivery(payload: Omit<DeliveryPayload, "t">): string | null {
  const k = key();
  if (!k) return null;
  const body = b64url(JSON.stringify({ ...payload, t: Math.floor(Date.now() / 1000) }));
  return `${body}.${mac(k, body)}`;
}

export function verifyDelivery(token: string): DeliveryPayload | null {
  const k = key();
  if (!k) return null;
  if (typeof token !== "string" || token.length > 512) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = mac(k, body);
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.c !== "string" || typeof p.r !== "string" || typeof p.p !== "string" || typeof p.t !== "number") return null;
  if (!UUID_RE.test(p.c) || !UUID_RE.test(p.r) || !UUID_RE.test(p.p)) return null;
  const age = Math.floor(Date.now() / 1000) - p.t;
  if (age < -60 || age > MAX_AGE_S) return null;
  return { c: p.c, r: p.r, p: p.p, t: p.t };
}
