import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

// Session-Refresh-Helper für Next.js 16 Proxy (vormals Middleware).
// Validiert Session via getUser() — vertraut nicht blind dem Cookie.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();

  // Ohne Login gar nicht erst rendern: Next rendert Layout und Seite
  // parallel, die Seiten der Suite fragten sonst geschuetzte Tabellen ab,
  // bevor der redirect() im Layout greift (Fehlerlog «permission denied»,
  // Backlog 16.11.2026). Die Layouts behalten ihre Pruefung.
  if (!data.user && isProtectedAuthorPath(request.nextUrl.pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}

// Bereiche unter /autor, die ein Login brauchen. /autor/<handle> (oeffentliche
// Autorenseite) bleibt frei; statische Segmente gehen in Next vor [slug].
const PROTECTED_AUTHOR_SEGMENTS = new Set([
  "admin", "artikel", "dashboard", "freigaben", "news-ticker",
  "podcasts", "profil", "prompts", "seiten", "statistiken",
]);

export function isProtectedAuthorPath(pathname: string): boolean {
  const m = /^\/autor\/([^/]+)/.exec(pathname);
  return !!m && PROTECTED_AUTHOR_SEGMENTS.has(m[1]);
}
