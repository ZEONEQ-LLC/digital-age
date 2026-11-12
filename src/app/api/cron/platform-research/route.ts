import { NextResponse } from "next/server";
import { runPlatformResearch } from "@/lib/platforms/job";

// KI-Plattformen pruefen (vercel.json "15 5 * * 2", dienstags frueh, PR 197):
// Websuche, Aenderungen sofort live, Mail an die Redaktion bei Aenderungen
// oder Fehlern. Schutz wie die anderen Crons: CRON_SECRET als Bearer, ohne
// Secret 503.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "cron secret missing" }, { status: 503, headers: NO_STORE });
  }
  if ((request.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  try {
    const res = await runPlatformResearch("cron", null);
    const failed = !res.runId || (res.errors.length > 0 && res.updates + res.additions + res.archived + res.checked === 0);
    return NextResponse.json({ ok: !failed, ...res }, { status: failed && !res.busy ? 500 : 200, headers: NO_STORE });
  } catch (err) {
    console.error("[platform-research:cron] run failed:", err);
    return NextResponse.json({ ok: false, error: "run failed" }, { status: 500, headers: NO_STORE });
  }
}
