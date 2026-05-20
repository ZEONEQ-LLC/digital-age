// Liefert die absolute Base-URL der Seite (ohne trailing slash, mit
// Schema). Wird von sitemap.ts + robots.ts genutzt, damit URLs immer
// absolut sind (relative Sitemap-URLs sind invalid, Google ignoriert sie).
//
// Quellen-Reihenfolge:
//   1. NEXT_PUBLIC_SITE_URL — in Vercel pro Environment manuell gepflegt.
//   2. VERCEL_URL — automatisch pro Deployment gesetzt (ohne Schema),
//      wir prefixen `https://`. Funktioniert für Preview- und Prod-
//      Deploys gleichermassen, solange (1) fehlt.
//   3. localhost:3000 — letzter Fallback für lokalen `next start`.
export function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim() !== "") {
    return stripTrailingSlash(explicit.trim());
  }
  const vercel = process.env.VERCEL_URL;
  if (vercel && vercel.trim() !== "") {
    return `https://${stripTrailingSlash(vercel.trim())}`;
  }
  return "http://localhost:3000";
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
