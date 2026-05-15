import PageTitle from "@/components/author/PageTitle";
import { createClient } from "@/lib/supabase/server";
import TagAuditLog, {
  type AuditLogEntry,
} from "@/components/admin/TagAuditLog";
import AdminTagsClient, { type AdminTagRow } from "./AdminTagsClient";

export default async function AdminTagsPage() {
  const supabase = await createClient();

  // Tag-Liste mit Article-Count via PostgREST resource embedding.
  // `article_tags(count)` returnt pro Tag ein Array `[{count: N}]`.
  const [tagsRes, auditRes] = await Promise.all([
    supabase
      .from("tags")
      .select("id, slug, name, created_at, article_tags(count)")
      .order("name"),
    supabase
      .from("tag_audit_log")
      .select(
        "id, operation, tag_name_before, tag_name_after, affected_article_ids, performed_by, performed_at",
      )
      .order("performed_at", { ascending: false })
      .limit(20),
  ]);

  const rows: AdminTagRow[] = (tagsRes.data ?? []).map((t) => {
    const counts = t.article_tags as unknown as { count: number }[] | null;
    const articleCount = counts?.[0]?.count ?? 0;
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      createdAt: t.created_at,
      articleCount,
    };
  });

  rows.sort((a, b) => {
    if (b.articleCount !== a.articleCount) return b.articleCount - a.articleCount;
    return a.name.localeCompare(b.name, "de");
  });

  // Actor-Namen separat laden — auth.users ist nicht direkt joinbar,
  // also via authors.user_id → display_name mappen.
  const auditRows = auditRes.data ?? [];
  const performerIds = Array.from(
    new Set(auditRows.map((r) => r.performed_by).filter((x): x is string => !!x)),
  );
  let nameByUserId = new Map<string, string>();
  if (performerIds.length > 0) {
    const { data: actors } = await supabase
      .from("authors")
      .select("user_id, display_name")
      .in("user_id", performerIds);
    nameByUserId = new Map(
      (actors ?? [])
        .filter((a): a is { user_id: string; display_name: string } => !!a.user_id)
        .map((a) => [a.user_id, a.display_name]),
    );
  }

  const auditEntries: AuditLogEntry[] = auditRows.map((r) => ({
    id: r.id,
    operation: r.operation as AuditLogEntry["operation"],
    tagNameBefore: r.tag_name_before,
    tagNameAfter: r.tag_name_after,
    affectedCount: (r.affected_article_ids as string[] | null)?.length ?? 0,
    performedAt: r.performed_at,
    performedByName: r.performed_by ? nameByUserId.get(r.performed_by) ?? null : null,
  }));

  return (
    <>
      <PageTitle
        title="Tags verwalten"
        subtitle={`${rows.length} Tags insgesamt`}
      />
      <AdminTagsClient initialRows={rows} />
      <TagAuditLog entries={auditEntries} />
    </>
  );
}
