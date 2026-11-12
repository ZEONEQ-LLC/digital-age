import PageTitle from "@/components/author/PageTitle";
import { getAllPromptsForAdmin } from "@/lib/promptApi";
import { createClient } from "@/lib/supabase/server";
import AdminPromptsClient from "./AdminPromptsClient";
import PromptJobBar from "./PromptJobBar";

// «Jetzt erstellen» (KI-Redaktion) laeuft als Server Action dieser Seite.
export const maxDuration = 300;

const RUN_STATUS: Record<string, string> = { running: "läuft", ok: "ok", partial: "mit Hinweisen", error: "fehlgeschlagen" };

export default async function AdminPromptsPage() {
  const prompts = await getAllPromptsForAdmin();
  const supabase = await createClient();
  const { data: run } = await supabase
    .from("ai_job_runs")
    .select("trigger, status, summary, started_at")
    .eq("job", "prompt_generation")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let lastRun: string | null = null;
  if (run) {
    const when = new Date(run.started_at).toLocaleString("de-CH", {
      timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const s = run.summary && typeof run.summary === "object" && !Array.isArray(run.summary) ? run.summary : {};
    const created = typeof s.created === "number" ? s.created : 0;
    lastRun = `${when} · ${run.trigger === "cron" ? "automatisch" : "von Hand"} · ${RUN_STATUS[run.status] ?? run.status} · ${created} neu`;
  }
  return (
    <>
      <PageTitle
        title="Prompts verwalten"
        subtitle="Approval-Queue, Featured-Toggle und Editorial-Workflow."
      />
      <PromptJobBar lastRun={lastRun} />
      <AdminPromptsClient initialPrompts={prompts} />
    </>
  );
}
