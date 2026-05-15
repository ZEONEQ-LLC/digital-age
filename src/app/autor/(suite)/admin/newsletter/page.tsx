import PageTitle from "@/components/author/PageTitle";
import { createClient } from "@/lib/supabase/server";
import AdminNewsletterClient, {
  type SubscriberRow,
  type StatusFilter,
} from "./AdminNewsletterClient";

type SearchParams = Promise<{ status?: string; sort?: string }>;

const VALID_STATUS: ReadonlySet<StatusFilter> = new Set([
  "all",
  "pending",
  "confirmed",
  "unsubscribed",
]);

type SortKey = "created_at" | "email" | "status";
const VALID_SORT: ReadonlySet<SortKey> = new Set([
  "created_at",
  "email",
  "status",
]);

export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status: StatusFilter = VALID_STATUS.has(params.status as StatusFilter)
    ? (params.status as StatusFilter)
    : "all";
  const sort: SortKey = VALID_SORT.has(params.sort as SortKey)
    ? (params.sort as SortKey)
    : "created_at";

  const supabase = await createClient();

  // Counts pro Status für die Tab-Badges. Eine einzige Aggregat-Query pro
  // Status — bei <10k Abonnenten kein Performance-Problem.
  const [allRes, pendingRes, confirmedRes, unsubRes] = await Promise.all([
    supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "unsubscribed"),
  ]);

  const counts = {
    all: allRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    confirmed: confirmedRes.count ?? 0,
    unsubscribed: unsubRes.count ?? 0,
  };

  // Eigentliche Liste, gefiltert + sortiert.
  let query = supabase
    .from("newsletter_subscribers")
    .select(
      "id, email, email_domain, status, source, consent_at, confirmed_at, unsubscribed_at, created_at",
    );
  if (status !== "all") query = query.eq("status", status);
  if (sort === "email") {
    query = query.order("email", { ascending: true });
  } else if (sort === "status") {
    query = query.order("status", { ascending: true }).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }
  query = query.limit(2000);

  const { data } = await query;
  const rows: SubscriberRow[] = (data ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    emailDomain: r.email_domain,
    status: r.status as SubscriberRow["status"],
    source: r.source as SubscriberRow["source"],
    consentAt: r.consent_at,
    confirmedAt: r.confirmed_at,
    unsubscribedAt: r.unsubscribed_at,
    createdAt: r.created_at,
  }));

  return (
    <>
      <PageTitle
        title="Newsletter-Abonnent:innen"
        subtitle={`${counts.all} insgesamt · ${counts.pending} pending · ${counts.confirmed} confirmed · ${counts.unsubscribed} unsubscribed`}
      />
      <AdminNewsletterClient
        rows={rows}
        counts={counts}
        activeStatus={status}
        activeSort={sort}
      />
    </>
  );
}
