import PageTitle from "@/components/author/PageTitle";
import { getAllInvites } from "@/lib/editorAdminApi";
import AdminInvitesClient from "./AdminInvitesClient";

export default async function AdminInvitesPage() {
  const invites = await getAllInvites();
  return (
    <>
      <PageTitle
        title="Einladungen"
        subtitle="Alle generierten Invite-Tokens — Status, Versand-URL, Widerruf, Neugenerieren."
      />
      <AdminInvitesClient initialInvites={invites} />
    </>
  );
}
