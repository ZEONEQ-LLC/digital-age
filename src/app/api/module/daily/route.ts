import { NextResponse } from "next/server";
import { runEndReports } from "@/lib/ads/endReportJob";
import { runExpiryWarnings } from "@/lib/ads/expiryJob";

// Taeglicher Cron (vercel.json "0 5 * * *"): Ablaufwarnungen 7 Tage vor
// Buchungsende (J7) und Abschlussberichte am Morgen nach dem Kampagnenende
// (endReportJob.ts). Schutz: CRON_SECRET als Bearer; fehlt das Secret,
// laeuft der Job nicht (503). Statisches Segment "daily" neben [code] —
// Next bevorzugt die statische Route.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "cron secret missing" }, { status: 503, headers: NO_STORE });
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  try {
    const expiry = await runExpiryWarnings();
    const endReports = await runEndReports();
    // Bisherige Felder (checked/sent/failed) bleiben die der Ablaufwarnung.
    return NextResponse.json({ ok: true, ...expiry, endReports }, { headers: NO_STORE });
  } catch (err) {
    console.error("[module:daily] run failed:", err);
    return NextResponse.json({ ok: false, error: "run failed" }, { status: 500, headers: NO_STORE });
  }
}
