import { isbot } from "isbot";

import { checkRateLimit, getRequestContext, logAttempt } from "@/lib/rate-limit";
import { hasSuiteSession, isSameOriginRequest, parseReadEvent } from "@/lib/stats/reading";
import { createServiceClient } from "@/lib/supabase/service";

// Zaehl-Eingang der Lesestatistik (ReadingMeter auf Artikel- und
// Showcase-Seiten). Schreibt ins Tagesaggregat article_stats_daily, sonst
// nichts: keine Rohereignisse, keine Kennung, keine IP-Adresse.
//
// Antwort ist immer 204 ohne Text, auch wenn nichts gezaehlt wurde. Wer die
// Route von aussen ausprobiert, erfaehrt nicht, woran eine Meldung scheitert.
// Reihenfolge: Groesse, Form, Bot, Herkunft der Anfrage, Angemeldete,
// IP-Rate-Limit, dann die RPC (die nur veroeffentlichte Beitraege zaehlt).
//
// Neutraler Pfad (kein track, stats, analytics im Namen), wie /api/module.
export const dynamic = "force-dynamic";

const MAX_BODY = 512;

// Eine Leserin erzeugt pro Beitrag eine Meldung fuer den Aufruf und wenige
// fuer Lesezeit und Lesetiefe (beim Verlassen des Tabs). 300 pro Stunde und
// 2000 pro Tag lassen ein Buero hinter einer gemeinsamen Adresse durch und
// stoppen Skripte. Der Hash der IP-Adresse liegt hoechstens 24 Stunden in
// newsletter_signup_attempts und hat keinen Bezug zum Beitrag. Ohne
// NEWSLETTER_IP_HASH_SALT gilt kein Limit (wie bei den Formularen).
const EVENT_LIMIT = { perHour: 300, perDay: 2000 };

export async function POST(request: Request) {
  const done = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  try {
    const text = await request.text();
    if (!text || text.length > MAX_BODY) return done();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return done();
    }
    const event = parseReadEvent(body);
    if (!event) return done();

    const h = request.headers;
    const userAgent = h.get("user-agent");
    if (!userAgent || isbot(userAgent)) return done();
    if (!isSameOriginRequest({ secFetchSite: h.get("sec-fetch-site"), origin: h.get("origin"), host: h.get("host") })) {
      return done();
    }
    if (hasSuiteSession(h.get("cookie"))) return done();

    const supabase = createServiceClient();
    const { ipHash } = await getRequestContext();
    const limit = await checkRateLimit(supabase, ipHash, "article_read", EVENT_LIMIT);
    if (!limit.allowed) return done();
    await logAttempt(supabase, ipHash, "article_read");

    const marks = event.d ?? [];
    const { error } = await supabase.rpc("article_stats_record", {
      p_article: event.a,
      p_view: event.v === 1,
      p_read: event.r === 1,
      p_seconds: event.s ?? 0,
      p_d25: marks.includes(25),
      p_d50: marks.includes(50),
      p_d75: marks.includes(75),
      p_d100: marks.includes(100),
      ...(event.x ? { p_action: event.x } : {}),
      ...(event.q ? { p_source: event.q } : {}),
    });
    if (error) console.error("[lektuere] record failed:", error.message);
  } catch (err) {
    console.error("[lektuere] event handling failed:", err);
  }
  return done();
}
