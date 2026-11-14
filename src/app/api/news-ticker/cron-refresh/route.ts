import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hoursOrDefault, isScheduledHour } from "@/lib/newsTicker/schedule";

// Vercel-Cron-Endpoint (stündlich). Mehrstufiges Gating:
//   1. Master-Switch via Env-Var NEWS_TICKER_CRON_ENABLED (Vercel-
//      Dashboard) — Schutz für Domain-Switch.
//   2. Optional CRON_SECRET-Bearer-Check.
//   3. Sub-Switch in news_ticker_config.scheduler_enabled (UI-Toggle).
//   4. Pause-Toggle in news_ticker_config.is_paused (UI-Toggle).
//   5. Stunden-Match: aktuelle Zürcher Stunde steht in scheduled_hours_cet
//      (Standard 7, 12 und 18 Uhr).
// Erst wenn alle Bedingungen erfüllt, wird runRefresh() ausgeführt. In den
// anderen Stunden traegt der Cron nur fehlende Einordnungen nach (PR 200).

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
    .select("scheduler_enabled, scheduled_hours_cet, is_paused")
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
  const hours = hoursOrDefault(cfg.scheduled_hours_cet);
  if (!isScheduledHour(hours, now)) {
    // Ausserhalb der Ticker-Stunde: nur fehlende Einordnungen nachtragen
    // (PR 200). Ohne fehlende gibt es keinen KI-Aufruf.
    let backfill: { assessed: number; failed: number } | { error: string };
    try {
      const { runAssessmentBackfill } = await import("@/lib/newsTicker/refresh");
      backfill = await runAssessmentBackfill();
      if (backfill.assessed > 0) {
        revalidatePath("/news");
        revalidatePath("/");
      }
    } catch (err) {
      console.error("[news-ticker:cron] backfill threw:", err);
      backfill = { error: err instanceof Error ? err.message : String(err) };
    }
    return NextResponse.json(
      {
        ok: true,
        status: "not-scheduled-hour",
        current_hour_cet: now,
        scheduled_hours_cet: hours,
        backfill,
      },
      { status: 200 },
    );
  }

  try {
    const { runRefresh } = await import("@/lib/newsTicker/refresh");
    // Ohne authorId: Kosten traegt der System-Author (NEWS_TICKER_AUTHOR_ID,
    // sonst aeltester Editor).
    const stats = await runRefresh();
    // Der Ticker sitzt im Root-Layout und steckt auch in statisch
    // vorgerenderten Seiten (/kontakt, /mediadaten, ...). "layout" erneuert
    // alle Seiten beim naechsten Aufruf. Nur im Erfolgspfad: die fruehen
    // Returns laufen stuendlich durch und sollen nichts invalidieren.
    revalidatePath("/", "layout");
    // Fehler laut machen: Wenn kein einziges neues Item durchkam, aber welche
    // scheiterten, antwortet der Cron mit 500 (sichtbar in den Vercel-Logs).
    // Die Details stehen in last_refresh_stats und im Admin.
    const failed = stats.items_failed ?? 0;
    if (failed > 0) {
      console.error(
        `[news-ticker:cron] ${failed} Item(s) fehlgeschlagen:`,
        stats.errors.map((e) => `${e.source_name}: ${e.message}${e.count ? ` (${e.count}x)` : ""}`).join(" | "),
      );
    }
    if (failed > 0 && stats.items_generated === 0) {
      return NextResponse.json({ ok: false, stats }, { status: 500 });
    }
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    console.error("[news-ticker:cron] runRefresh threw:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
