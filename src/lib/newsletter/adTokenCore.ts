import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Kern des Zaehl-Links fuer Anzeigen im Newsletter: signieren und pruefen mit
// einem uebergebenen Geheimnis. Ohne "server-only", damit der Test laeuft; im
// Server ruft nur adToken.ts diese Funktionen auf (mit dem Service-Schluessel).
export type AdClickPayload = { i: string; c: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function key(secret: string): Buffer {
  return createHash("sha256").update(`newsletter-ad-click:${secret}`).digest();
}

function mac(k: Buffer, data: string): string {
  return createHmac("sha256", k).update(data).digest("base64url");
}

export function signAdClickWith(secret: string, payload: AdClickPayload): string | null {
  if (!secret || !UUID_RE.test(payload.i) || !UUID_RE.test(payload.c)) return null;
  const body = Buffer.from(JSON.stringify({ i: payload.i, c: payload.c })).toString("base64url");
  return `${body}.${mac(key(secret), body)}`;
}

export function verifyAdClickWith(secret: string, token: string | null | undefined): AdClickPayload | null {
  if (!secret || typeof token !== "string" || token.length > 512) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = mac(key(secret), body);
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
  if (typeof p.i !== "string" || typeof p.c !== "string" || !UUID_RE.test(p.i) || !UUID_RE.test(p.c)) return null;
  return { i: p.i, c: p.c };
}
