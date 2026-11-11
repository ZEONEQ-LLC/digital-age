import { NextResponse } from "next/server";
import { runModelCheck } from "@/lib/ai/modelCheck/run";

// Woechentlicher Modell-Check (vercel.json "0 5 * * 1", Montag frueh):
// Abgleich mit der Models API, Kosten und Empfehlungen pro Aufgabe, Mail nur
// bei Neuem. Schutz: CRON_SECRET als Bearer; fehlt das Secret, laeuft der Job
// nicht (503), wie /api/module/daily.
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
    const res = await runModelCheck("cron");
    // Fehler laut machen: 500, damit der Lauf in den Vercel-Logs auffaellt.
    // Details stehen im Lauf (ai_model_check_runs) und im Admin.
    if (res.errors.length > 0) {
      console.error("[model-check] Fehler:", res.errors.join(" | "));
    }
    return NextResponse.json(
      { ok: res.errors.length === 0, items: res.items.length, new: res.newItems.length, notified: res.notified, errors: res.errors },
      { status: res.errors.length === 0 ? 200 : 500, headers: NO_STORE },
    );
  } catch (err) {
    console.error("[model-check] run failed:", err);
    return NextResponse.json({ ok: false, error: "run failed" }, { status: 500, headers: NO_STORE });
  }
}
