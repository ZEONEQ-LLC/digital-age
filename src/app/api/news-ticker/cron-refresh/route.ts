import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Vercel-Cron-Endpoint (stündlich). Mehrstufiges Gating:
//   1. Master-Switch via Env-Var NEWS_TICKER_CRON_ENABLED (Vercel-
//      Dashboard) — Schutz für Domain-Switch.
//   2. Optional CRON_SECRET-Bearer-Check.
//   3. Sub-Switch in news_ticker_config.scheduler_enabled (UI-Toggle).
//   4. Pause-Toggle in news_ticker_config.is_paused (UI-Toggle).
//   5. Stunden-Match: aktuelle Zürcher Stunde === scheduled_hour_cet.
// Erst wenn alle Bedingungen erfüllt, wird runRefresh() ausgeführt.

export const maxDuration = 300; // 5 Min — Refresh kann lange laufen
export const dynamic = "force-dynamic";

function zurichHour(): number {
  // Intl löst Sommerzeit korrekt auf — kein manueller CET/CEST-Math.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Zurich",
    hour: "numeric",
    hour12: false,
  });
  const parsed = parseInt(fmt.format(new Date()), 10);
  // `24` kommt bei Mitternacht in en-US-Format-Edge — auf 0 mappen.
  return Number.isFinite(parsed) ? parsed % 24 : 0;
}

export async function GET(request: Request) {
  if (process.env.NEWS_TICKER_CRON_ENABLED !== "true") {
    return NextResponse.json(
      { ok: true, status: "disabled-via-env" },
      { status: 200 },
    );
  }

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  // Config lesen (Service-Role; Editor-UI pflegt die Werte).
  const supabase = createServiceClient();
  const { data: cfg, error: cfgErr } = await supabase
    .from("news_ticker_config")
    .select("scheduler_enabled, scheduled_hour_cet, is_paused")
    .eq("id", 1)
    .maybeSingle();

  if (cfgErr) {
    return NextResponse.json(
      { ok: false, error: `Config-Read failed: ${cfgErr.message}` },
      { status: 500 },
    );
  }

  if (!cfg?.scheduler_enabled) {
    return NextResponse.json(
      { ok: true, status: "disabled-via-ui" },
      { status: 200 },
    );
  }

  if (cfg.is_paused) {
    return NextResponse.json(
      { ok: true, status: "ticker-paused" },
      { status: 200 },
    );
  }

  const now = zurichHour();
  if (now !== cfg.scheduled_hour_cet) {
    return NextResponse.json(
      {
        ok: true,
        status: "not-scheduled-hour",
        current_hour_cet: now,
        scheduled_hour_cet: cfg.scheduled_hour_cet,
      },
      { status: 200 },
    );
  }

  try {
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
