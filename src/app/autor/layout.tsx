import { redirect } from "next/navigation";
import { getCurrentAuthor } from "@/lib/authorApi";

// Auth-Gate für die gesamte Author-Suite. Server-Component, läuft auf
// jedem /autor/*-Request und redirected auf /login wenn keine Session.
//
// Hinweis: Die client-side Konsumenten innerhalb (Dashboard, Profil,
// Podcasts, AuthorShell) ziehen aktuell noch ihre rich-UI-Daten aus
// mockAuthorApi — Session C migriert das, sobald das Author-Schema die
// Felder handle/social/location/joinedAt erweitert hat.
export default async function AutorLayout({ children }: { children: React.ReactNode }) {
  const author = await getCurrentAuthor();
  if (!author) redirect("/login");
  return <>{children}</>;
}
