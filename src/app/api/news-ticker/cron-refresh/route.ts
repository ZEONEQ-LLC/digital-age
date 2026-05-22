import { NextResponse } from "next/server";

// Vercel Cron-Endpoint. Aktivierung über Env-Var NEWS_TICKER_CRON_ENABLED
// (gehört in Vercel-Dashboard, nicht ins Repo). Bis dahin ist der Endpoint
// inaktiv und liefert 200 + "Cron disabled" zurück, damit Vercel keine
// Fehler-Alerts schickt.
//
// Vercel-Cron schickt einen Authorization-Header `Bearer <CRON_SECRET>`.
// Wir prüfen den nur, wenn das Secret gesetzt ist — sonst geht jeder
// authentifizierte Test-Curl durch. Im Produktiv-Setup CRON_SECRET in
// Vercel pflegen und der Endpoint validiert es.
export const maxDuration = 300; // 5 Min — Refresh kann lange laufen
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NEWS_TICKER_CRON_ENABLED !== "true") {
    return NextResponse.json({ ok: true, status: "disabled" }, { status: 200 });
  }

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    // Dynamic import — runRefresh zieht Anthropic-SDK + Service-Role-Client
    // erst, wenn der Endpoint wirklich aktiv ist.
    const { runRefresh } = await import("@/lib/newsTicker/refresh");
    const stats = await runRefresh();
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    console.error("[news-ticker:cron] runRefresh threw:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
