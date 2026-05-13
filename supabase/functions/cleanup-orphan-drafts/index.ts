// Edge Function: cleanup-orphan-drafts
//
// Findet "echte" Orphan-Drafts und löscht sie inkl. zugehöriger Storage-Files:
//   - status = 'draft'
//   - title  = 'Unbenannter Artikel' (= unveränderter createDraft-Default)
//   - body_md = '' (= leer, nie editiert)
//   - updated_at < now() - interval '7 days'
//
// Triggered by Cron (siehe README.md neben dieser Datei).
//
// Authorization: nur service-role darf das hier aufrufen — die Edge Function
// nutzt den SUPABASE_SERVICE_ROLE_KEY und umgeht damit RLS bewusst.
// Externe Aufrufer müssen den Cron-Secret-Header mitliefern (CRON_SECRET).
//
// Deploy: `npx supabase functions deploy cleanup-orphan-drafts`
// Schedule: per Dashboard → Cron oder pg_cron-Migration (siehe README).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type CleanupResult = {
  scanned: number;
  deleted: string[];
  errors: { article_id: string; reason: string }[];
};

Deno.serve(async (req) => {
  // Cron-Header-Check: schützt vor versehentlichem Anstoss von extern.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const header = req.headers.get("x-cron-secret");
    if (header !== cronSecret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response("Missing env", { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: orphans, error: queryErr } = await supabase
    .from("articles")
    .select("id")
    .eq("status", "draft")
    .eq("title", "Unbenannter Artikel")
    .eq("body_md", "")
    .lt("updated_at", cutoff);

  if (queryErr) {
    return new Response(`Query error: ${queryErr.message}`, { status: 500 });
  }

  const result: CleanupResult = {
    scanned: orphans?.length ?? 0,
    deleted: [],
    errors: [],
  };

  for (const orphan of orphans ?? []) {
    try {
      const { data: files, error: listErr } = await supabase.storage
        .from("articles")
        .list(orphan.id, { limit: 1000 });
      if (listErr) throw new Error(`List: ${listErr.message}`);
      if (files && files.length > 0) {
        const paths = files.map((f) => `${orphan.id}/${f.name}`);
        const { error: removeErr } = await supabase.storage
          .from("articles")
          .remove(paths);
        if (removeErr) throw new Error(`Remove: ${removeErr.message}`);
      }

      const { error: deleteErr } = await supabase
        .from("articles")
        .delete()
        .eq("id", orphan.id);
      if (deleteErr) throw new Error(`Delete: ${deleteErr.message}`);

      result.deleted.push(orphan.id);
    } catch (err) {
      result.errors.push({
        article_id: orphan.id,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
