import PageTitle from "@/components/author/PageTitle";
import { createClient } from "@/lib/supabase/server";
import AdminMessagesClient, {
  type MessageRow,
  type StatusFilter,
} from "./AdminMessagesClient";

type SearchParams = Promise<{ status?: string; id?: string }>;

const VALID_STATUS: ReadonlySet<StatusFilter> = new Set([
  "all",
  "new",
  "replied",
  "archived",
]);

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status: StatusFilter = VALID_STATUS.has(params.status as StatusFilter)
    ? (params.status as StatusFilter)
    : "all";
  const focusId = params.id ?? null;

  const supabase = await createClient();

  const [allRes, newRes, repRes, archRes] = await Promise.all([
    supabase.from("contact_messages").select("id", { count: "exact", head: true }),
    supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "replied"),
    supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "archived"),
  ]);

  const counts = {
    all: allRes.count ?? 0,
    new: newRes.count ?? 0,
    replied: repRes.count ?? 0,
    archived: archRes.count ?? 0,
  };

  let query = supabase
    .from("contact_messages")
    .select(
      "id, name, email, topic, organization, message, ip_hash, status, created_at, replied_at, notes",
    )
    .order("created_at", { ascending: false })
    .limit(1000);
  if (status !== "all") query = query.eq("status", status);

  const { data } = await query;
  const rows: MessageRow[] = (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    topic: r.topic,
    organization: r.organization,
    message: r.message,
    status: r.status as MessageRow["status"],
    createdAt: r.created_at,
    repliedAt: r.replied_at,
    notes: r.notes,
  }));

  return (
    <>
      <PageTitle
        title="Kontakt-Nachrichten"
        subtitle={`${counts.all} total · ${counts.new} neu · ${counts.replied} beantwortet · ${counts.archived} archiviert`}
      />
      <AdminMessagesClient
        rows={rows}
        counts={counts}
        activeStatus={status}
        focusId={focusId}
      />
    </>
  );
}
