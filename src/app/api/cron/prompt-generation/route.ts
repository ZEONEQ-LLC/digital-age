import { NextResponse } from "next/server";
import { runPromptGeneration } from "@/lib/promptGen/job";

// Prompts der KI-Redaktion (vercel.json "15 5 * * 3", mittwochs frueh,
// PR 197): drei neue Prompts, sofort publiziert und gekennzeichnet, Mail an
// die Redaktion. Schutz wie die anderen Crons: CRON_SECRET als Bearer, ohne
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
    const res = await runPromptGeneration("cron", null);
    const failed = res.created === 0 && !res.busy;
    return NextResponse.json({ ok: !failed, ...res }, { status: failed ? 500 : 200, headers: NO_STORE });
  } catch (err) {
    console.error("[prompt-generation:cron] run failed:", err);
    return NextResponse.json({ ok: false, error: "run failed" }, { status: 500, headers: NO_STORE });
  }
}
