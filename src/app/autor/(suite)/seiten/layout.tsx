import { redirect } from "next/navigation";
import { getCurrentAuthor } from "@/lib/authorApi";

// Editor-Gate für die Pages-Verwaltung. Suite-Layout hat schon auf Login
// geprüft; hier zusätzlich auf role='editor'. Pattern identisch zur
// /admin-Sektion.
export default async function PagesLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentAuthor();
  if (!me) redirect("/login");
  if (me.role !== "editor") redirect("/autor/dashboard");
  return <>{children}</>;
}
