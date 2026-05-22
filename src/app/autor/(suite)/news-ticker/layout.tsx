import { redirect } from "next/navigation";
import { getCurrentAuthor } from "@/lib/authorApi";

// Editor-Gate. Pattern identisch zu /seiten und /admin.
export default async function NewsTickerLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentAuthor();
  if (!me) redirect("/login");
  if (me.role !== "editor") redirect("/autor/dashboard");
  return <>{children}</>;
}
