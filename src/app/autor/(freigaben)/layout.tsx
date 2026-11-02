import { redirect } from "next/navigation";
import { getCurrentAuthor } from "@/lib/authorApi";
import AuthorShell from "@/components/author/AuthorShell";

// Freigaben liegen bewusst ausserhalb der (suite)-Gruppe: gleiche Gates wie
// (suite)/layout.tsx + admin/layout.tsx (Login, role='editor'), aber die Shell
// laeuft mit mobile="allow", damit die Seite auf dem iPhone nutzbar ist. Die
// uebrige Suite bleibt unter 768px gesperrt.
export default async function FreigabenLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentAuthor();
  if (!me) redirect("/login");
  if (me.role !== "editor") redirect("/autor/dashboard");
  return <AuthorShell mobile="allow">{children}</AuthorShell>;
}
