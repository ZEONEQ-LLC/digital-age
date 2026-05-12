import { redirect } from "next/navigation";
import { getCurrentAuthor } from "@/lib/authorApi";

// Editor-Gate für die gesamte Admin-Sektion. Suite-Layout hat bereits auf
// Auth-Login geprüft; hier zusätzlich auf role='editor' gaten.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentAuthor();
  if (!me) redirect("/login");
  if (me.role !== "editor") redirect("/autor/dashboard");
  return <>{children}</>;
}
