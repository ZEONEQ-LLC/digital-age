import { redirect } from "next/navigation";
import { getCurrentAuthor } from "@/lib/authorApi";

// Auth-Gate für die gesamte Author-Suite. Server-Component, läuft auf
// jedem /autor/*-Request und redirected auf /login wenn keine Session.
//
// Hinweis: Author-Suite-Konsumenten (Dashboard, Profil, Podcasts, AuthorShell)
// ziehen aktuell noch rich-UI-Daten aus mockAuthorApi für CRUD-Operationen
// (Drafts, Submit, Revisions, DashboardStats). Schema ist seit Session C
// erweitert; volle CRUD-Migration kommt mit Session D/E.
export default async function AutorLayout({ children }: { children: React.ReactNode }) {
  const author = await getCurrentAuthor();
  if (!author) redirect("/login");
  return <>{children}</>;
}
