import PageTitle from "@/components/author/PageTitle";
import { getAllStartupsForAdmin } from "@/lib/startupApi";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/newsletter/mail";
import { getShowcaseAdminData } from "@/lib/showcase/inviteApi";
import AdminStartupsClient from "./AdminStartupsClient";
import ShowcaseInvitesAdmin from "./ShowcaseInvitesAdmin";
import type { ContactView, RequestView } from "./StartupContactAdmin";

// «Entwurf erzeugen» (Showcase S3b) ruft die KI auf und schreibt einen ganzen
// Beitrag: Die Server Action dieser Seite darf bis zu fuenf Minuten laufen.
export const maxDuration = 300;

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
      consentSource: x.consent_source === "submission" ? "submission" : x.consent_source === "showcase" ? "showcase" : "editor",
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
  const [startups, contactData, showcase] = await Promise.all([
    getAllStartupsForAdmin(),
    loadContactData(),
    getShowcaseAdminData(),
  ]);
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
      <ShowcaseInvitesAdmin submissions={showcase.submissions} startups={showcase.startups} siteUrl={SITE_URL} />
    </>
  );
}
