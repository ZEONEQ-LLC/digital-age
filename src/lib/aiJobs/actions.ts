"use server";

import { revalidatePath } from "next/cache";
import { FormError, runAction, type ActionResult } from "@/lib/actionResult";
import { requireEditorId } from "@/lib/aiJobs/editor";

// «Jetzt pruefen» / «Jetzt erstellen» im Admin: derselbe Lauf wie der Cron,
// Kosten beim klickenden Editor. Eine Mail gibt es nur bei Aenderungen bzw.
// neuen Prompts, Fehler stehen direkt auf der Seite.

export type PlatformRunView = { updates: number; additions: number; archived: number; checked: number; errors: string[] };

export async function runPlatformResearchNow(): Promise<ActionResult<PlatformRunView>> {
  return runAction("aiJobs.runPlatformResearchNow", async () => {
    const authorId = await requireEditorId();
    const { runPlatformResearch } = await import("@/lib/platforms/job");
    const res = await runPlatformResearch("manual", authorId);
    if (res.busy) throw new FormError("Eine Prüfung läuft bereits. Bitte in ein paar Minuten neu laden.");
    revalidatePath("/autor/admin/ki-plattformen");
    return { updates: res.updates, additions: res.additions, archived: res.archived, checked: res.checked, errors: res.errors };
  });
}

export async function runPromptGenerationNow(): Promise<ActionResult<{ created: number; errors: string[] }>> {
  return runAction("aiJobs.runPromptGenerationNow", async () => {
    const authorId = await requireEditorId();
    const { runPromptGeneration } = await import("@/lib/promptGen/job");
    const res = await runPromptGeneration("manual", authorId);
    if (res.busy) throw new FormError("Ein Lauf ist bereits aktiv. Bitte in ein paar Minuten neu laden.");
    revalidatePath("/autor/admin/prompts");
    return { created: res.created, errors: res.errors };
  });
}
