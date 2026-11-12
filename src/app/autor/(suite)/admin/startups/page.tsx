import PageTitle from "@/components/author/PageTitle";
import { getAllStartupsForAdmin } from "@/lib/startupApi";
import { createClient } from "@/lib/supabase/server";
import AdminStartupsClient from "./AdminStartupsClient";
import type { ContactView, RequestView } from "./StartupContactAdmin";

// Kontakte und Anfragen (nur Metadaten) fuer «Kontakt aufnehmen»; RLS: Editoren.
async function loadContactData(): Promise<{ contacts: ContactView[]; requests: RequestView[] }> {
  const supabase = await createClient();
  const [c, r] = await Promise.all([
    supabase.from("startup_contacts").select("startup_id, email, consent_at, consent_source, consent_note, revoked_at"),
    supabase
      .from("startup_contact_requests")
      .select("id, startup_id, purpose, delivered, created_at, startup:ai_startups(name)")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  return {
    contacts: (c.data ?? []).map((x) => ({
      startupId: x.startup_id,
      email: x.email,
      consentAt: x.consent_at,
      consentSource: x.consent_source === "submission" ? "submission" : "editor",
      consentNote: x.consent_note,
      revokedAt: x.revoked_at,
    })),
    requests: (r.data ?? []).map((x) => ({
      id: x.id,
      startupId: x.startup_id,
      startupName: (x.startup as { name: string } | null)?.name ?? "–",
      purpose: x.purpose,
      delivered: x.delivered,
      createdAt: x.created_at,
    })),
  };
}

export default async function AdminStartupsPage() {
  const [startups, contactData] = await Promise.all([getAllStartupsForAdmin(), loadContactData()]);
  return (
    <>
      <PageTitle
        title="Swiss AI Startups verwalten"
        subtitle="Approval-Queue, Spotlight-Toggle und Editorial-Workflow."
      />
      <AdminStartupsClient
        initialStartups={startups}
        contacts={contactData.contacts}
        requests={contactData.requests}
      />
    </>
  );
}
