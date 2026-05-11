import { redirect } from "next/navigation";
import { getCurrentAuthor } from "@/lib/authorApi";
import AuthorShell from "@/components/author/AuthorShell";

// Auth-Gate + Shell-Wrapper für die gesamte Author-Suite.
// Server-Component: refresht Session, redirected auf /login wenn keine.
// AuthorShell wird hier zentral gerendert, damit die einzelnen Suite-Pages
// "use client" sein können ohne direkt eine async-Server-Component zu importieren.
export default async function AutorLayout({ children }: { children: React.ReactNode }) {
  const author = await getCurrentAuthor();
  if (!author) redirect("/login");
  return <AuthorShell>{children}</AuthorShell>;
}
