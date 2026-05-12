import PageTitle from "@/components/author/PageTitle";
import { getAllAuthors } from "@/lib/editorAdminApi";
import AdminAuthorsClient from "./AdminAuthorsClient";

export default async function AdminAuthorsPage() {
  const authors = await getAllAuthors();
  return (
    <>
      <PageTitle
        title="Autoren"
        subtitle="Alle Authors verwalten — Profil bearbeiten, Rolle ändern, Einladungen generieren."
      />
      <AdminAuthorsClient initialAuthors={authors} />
    </>
  );
}
