import PageTitle from "@/components/author/PageTitle";
import { getCurrentAuthor } from "@/lib/authorApi";
import { getAllAuthors } from "@/lib/editorAdminApi";
import AdminAuthorsClient from "./AdminAuthorsClient";

export default async function AdminAuthorsPage() {
  const [authors, me] = await Promise.all([getAllAuthors(), getCurrentAuthor()]);
  return (
    <>
      <PageTitle
        title="Autoren"
        subtitle="Alle Authors verwalten — Profil bearbeiten, Rolle ändern, Einladungen generieren."
      />
      <AdminAuthorsClient initialAuthors={authors} inviterName={me?.display_name ?? "Die Redaktion"} />
    </>
  );
}
