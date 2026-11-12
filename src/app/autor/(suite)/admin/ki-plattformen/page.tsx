import PageTitle from "@/components/author/PageTitle";
import { createClient } from "@/lib/supabase/server";
import KiPlattformenAdminClient, { type ChangeView, type PlatformAdminView, type RunView } from "./KiPlattformenAdminClient";

// Admin «KI-Plattformen» (PR 197): Verzeichnis pflegen, Laeufe des
// woechentlichen KI-Jobs und jede Aenderung mit «Rückgängig». Session-Client,
// RLS: nur Editoren.

export const dynamic = "force-dynamic";
// «Jetzt prüfen» laeuft als Server Action dieser Seite (Websuche, bis ~4 Min).
export const maxDuration = 300;

function fmt(iso: string | null, withTime = true): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("de-CH", {
    timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

const FIELD_LABEL: Record<string, string> = {
  name: "Name", category: "Kategorie", tagline: "Beschreibung", hosting: "Hosting", pricing: "Preis", url: "Link", status: "Status",
};

export default async function KiPlattformenAdminPage() {
  const supabase = await createClient();
  const [platformsRes, runsRes, changesRes] = await Promise.all([
    supabase
      .from("ai_platforms")
      .select("id, slug, name, category, tagline, hosting, pricing, url, featured, status, locked, source, ai_note, verified_at, updated_at")
      .order("status", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("ai_job_runs")
      .select("id, trigger, status, summary, errors, started_at, finished_at")
      .eq("job", "platform_research")
      .order("started_at", { ascending: false })
      .limit(6),
    supabase
      .from("ai_platform_changes")
      .select("id, run_id, platform_id, action, before, after, reason, sources, reverted_at, created_at")
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const loadError = platformsRes.error?.message ?? runsRes.error?.message ?? changesRes.error?.message ?? null;
  const platformRows = platformsRes.data ?? [];
  const names = new Map(platformRows.map((p) => [p.id, p.name]));

  const platforms: PlatformAdminView[] = platformRows.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    tagline: p.tagline,
    hosting: p.hosting,
    pricing: p.pricing,
    url: p.url,
    featured: p.featured,
    active: p.status === "active",
    locked: p.locked,
    source: p.source,
    aiNote: p.ai_note,
    verifiedLabel: fmt(p.verified_at, false),
  }));

  const runs: RunView[] = (runsRes.data ?? []).map((r) => {
    const s = asObject(r.summary);
    const n = (k: string) => (typeof s[k] === "number" ? (s[k] as number) : 0);
    const parts = r.status === "running"
      ? ["läuft"]
      : [
          `${n("additions")} neu`,
          `${n("updates")} aktualisiert`,
          `${n("archived")} archiviert`,
          `${n("checked")} bestätigt`,
        ];
    return {
      id: r.id,
      label: `${fmt(r.started_at)} · ${r.trigger === "cron" ? "automatisch" : "von Hand"}`,
      status: r.status,
      summary: parts.join(" · "),
      errors: r.errors ?? [],
    };
  });

  const changes: ChangeView[] = (changesRes.data ?? []).map((c) => {
    const before = asObject(c.before);
    const after = asObject(c.after);
    const diffs = c.action === "update"
      ? Object.keys(FIELD_LABEL)
          .filter((k) => k in after && String(before[k] ?? "") !== String(after[k] ?? ""))
          .map((k) => ({ field: FIELD_LABEL[k], before: before[k] == null ? "–" : String(before[k]), after: after[k] == null ? "–" : String(after[k]) }))
      : [];
    const afterName = typeof after.name === "string" ? after.name : null;
    return {
      id: c.id,
      action: c.action as ChangeView["action"],
      platformName: (c.platform_id && names.get(c.platform_id)) || afterName || "(gelöscht)",
      dateLabel: fmt(c.created_at),
      reason: c.reason ?? "",
      sources: c.sources ?? [],
      diffs,
      addedSummary: c.action === "add"
        ? [after.category, after.hosting, after.pricing].filter((x) => typeof x === "string").join(" · ") + (typeof after.tagline === "string" ? ` — ${after.tagline}` : "")
        : null,
      revertedLabel: c.reverted_at ? fmt(c.reverted_at) : null,
      canRevert: !c.reverted_at && !!c.platform_id,
    };
  });

  return (
    <>
      <PageTitle
        title="KI-Plattformen"
        subtitle="Das Verzeichnis unter /ki-plattformen. Eine KI prüft es jeden Dienstag früh mit Websuche und ändert ohne Freigabe; du bekommst jede Änderung per Mail und kannst sie hier zurücknehmen. Gesperrte Einträge fasst die KI nicht an."
      />
      <KiPlattformenAdminClient platforms={platforms} runs={runs} changes={changes} loadError={loadError} />
    </>
  );
}
