import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { isVercelAliasHost } from "@/lib/vercelAlias";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  if (isVercelAliasHost(request.headers.get("host"))) {
    response.headers.set("X-Robots-Tag", "noindex, follow");
  }
  return response;
}

export const config = {
  matcher: [
    // api/module: oeffentliche Modul-Auslieferung braucht keinen Session-Refresh (G7).
    "/((?!_next/static|_next/image|favicon.ico|api/module|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
