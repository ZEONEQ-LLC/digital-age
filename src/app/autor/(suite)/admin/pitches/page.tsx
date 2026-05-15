import PageTitle from "@/components/author/PageTitle";
import { createClient } from "@/lib/supabase/server";
import AdminPitchesClient, {
  type PitchRow,
  type StatusFilter,
} from "./AdminPitchesClient";

type SearchParams = Promise<{ status?: string; id?: string }>;

const VALID_STATUS: ReadonlySet<StatusFilter> = new Set([
  "all",
  "new",
  "reviewing",
  "accepted",
  "rejected",
]);

export default async function AdminPitchesPage({
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

  const [allRes, newRes, revRes, accRes, rejRes] = await Promise.all([
    supabase.from("article_pitches").select("id", { count: "exact", head: true }),
    supabase
      .from("article_pitches")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("article_pitches")
      .select("id", { count: "exact", head: true })
      .eq("status", "reviewing"),
    supabase
      .from("article_pitches")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted"),
    supabase
      .from("article_pitches")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected"),
  ]);

  const counts = {
    all: allRes.count ?? 0,
    new: newRes.count ?? 0,
    reviewing: revRes.count ?? 0,
    accepted: accRes.count ?? 0,
    rejected: rejRes.count ?? 0,
  };

  let query = supabase
    .from("article_pitches")
    .select(
      "id, title, excerpt, category, body_md, author_name, author_email, author_role, author_bio, author_website, status, created_at, reviewed_at, editor_notes",
    )
    .order("created_at", { ascending: false })
    .limit(1000);
  if (status !== "all") query = query.eq("status", status);

  const { data } = await query;
  const rows: PitchRow[] = (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    excerpt: r.excerpt,
    category: r.category,
    bodyMd: r.body_md,
    authorName: r.author_name,
    authorEmail: r.author_email,
    authorRole: r.author_role,
    authorBio: r.author_bio,
    authorWebsite: r.author_website,
    status: r.status as PitchRow["status"],
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
    editorNotes: r.editor_notes,
  }));

  return (
    <>
      <PageTitle
        title="Artikel-Pitches"
        subtitle={`${counts.all} total · ${counts.new} neu · ${counts.reviewing} in Review · ${counts.accepted} akzeptiert · ${counts.rejected} abgelehnt`}
      />
      <AdminPitchesClient
        rows={rows}
        counts={counts}
        activeStatus={status}
        focusId={focusId}
      />
    </>
  );
}
