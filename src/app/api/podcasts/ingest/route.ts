import { timingSafeEqual } from "node:crypto";
import { NextResponse, after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit, getRequestContext, logAttempt } from "@/lib/rate-limit";
import { extractAppleUrl } from "@/lib/podcasts/appleLink";
import { enrichPodcastDraft, ingestAppleLink } from "@/lib/podcasts/ingest";

// Eingang fuer den iOS-Kurzbefehl «An digital-age» (Teilen aus Apple Podcasts).
// Schutz: PODCAST_INGEST_TOKEN als Bearer, dazu IP-Rate-Limit. Legt nur einen
// Entwurf an und antwortet sofort; Metadaten und KI laufen nach der Antwort
// (after()). Veroeffentlicht wird ausschliesslich eingeloggt unter
// /autor/freigaben.
//
// Antwort immer JSON mit `message` (deutsch), damit der Kurzbefehl den Text
// direkt als Mitteilung zeigen kann. Fachliche Ergebnisse (vorhanden,
// ungueltiger Link) kommen mit 200, damit der Kurzbefehl nicht abbricht.
export const dynamic = "force-dynamic";

function tokenOk(request: Request): boolean | null {
  const secret = process.env.PODCAST_INGEST_TOKEN;
  if (!secret) return null;
  const auth = request.headers.get("authorization") ?? "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readUrl(request: Request): Promise<string | null> {
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      const body = (await request.json()) as { url?: unknown; text?: unknown };
      const raw = typeof body.url === "string" ? body.url : typeof body.text === "string" ? body.text : "";
      return extractAppleUrl(raw) ?? raw.trim() ?? null;
    }
    if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
      const form = await request.formData();
      const raw = String(form.get("url") ?? form.get("text") ?? "");
      return extractAppleUrl(raw) ?? raw.trim();
    }
    const text = (await request.text()).trim();
    return extractAppleUrl(text) ?? text;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const ok = tokenOk(request);
  if (ok === null) {
    return NextResponse.json({ ok: false, status: "error", message: "Fehler: Endpoint nicht konfiguriert (PODCAST_INGEST_TOKEN fehlt)." }, { status: 503 });
  }
  if (!ok) {
    return NextResponse.json({ ok: false, status: "error", message: "Fehler: Token ungültig." }, { status: 401 });
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    // Lokal ohne Service-Key: sauber melden statt 500 ohne Body.
    return NextResponse.json({ ok: false, status: "error", message: "Fehler: Endpoint nicht konfiguriert (Service-Key fehlt)." }, { status: 503 });
  }
  const { ipHash } = await getRequestContext();
  const limit = await checkRateLimit(supabase, ipHash, "podcast_ingest", { perHour: 30, perDay: 100 });
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, status: "error", message: "Fehler: zu viele Anfragen, später erneut versuchen." }, { status: 429 });
  }
  await logAttempt(supabase, ipHash, "podcast_ingest");

  const url = await readUrl(request);
  if (!url) {
    return NextResponse.json({ ok: false, status: "invalid", message: "Kein Link erhalten." }, { status: 200 });
  }

  const outcome = await ingestAppleLink(url);
  if (outcome.status === "created") {
    const id = outcome.id;
    after(() => enrichPodcastDraft(id, { notify: true }));
  }
  const httpStatus = outcome.status === "error" ? 500 : 200;
  return NextResponse.json({ ok: outcome.status !== "error", ...outcome }, { status: httpStatus });
}
