// Der Vercel-Alias (*.vercel.app) bleibt fuer Notfaelle erreichbar (Login,
// siehe CLAUDE.md), soll aber nicht als zweite Kopie der Seite bei
// Suchmaschinen landen. Der Proxy setzt dort X-Robots-Tag: noindex.
export function isVercelAliasHost(host: string | null): boolean {
  return (host ?? "").toLowerCase().split(":")[0].endsWith(".vercel.app");
}
