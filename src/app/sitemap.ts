import type { MetadataRoute } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getBaseUrl } from "@/lib/siteUrl";
import type { Database } from "@/lib/database.types";

// Statische Hauptrouten — manuell gepflegt, kein Auto-Discovery. Priorities
// und changeFrequencies sind grobe Hints für Crawler (Google ignoriert sie
// faktisch, Bing/Yandex nutzen sie noch).
type StaticEntry = {
  path: string;
  priority: number;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
};

const STATIC_ROUTES: StaticEntry[] = [
  { path: "/", priority: 1.0, changeFrequency: "daily" },
  { path: "/ki-im-business", priority: 0.9, changeFrequency: "daily" },
  { path: "/future-tech", priority: 0.9, changeFrequency: "daily" },
  { path: "/swiss-ai", priority: 0.9, changeFrequency: "daily" },
  { path: "/ki-plattformen", priority: 0.7, changeFrequency: "weekly" },
  { path: "/ai-prompts", priority: 0.7, changeFrequency: "weekly" },
  { path: "/podcasts", priority: 0.7, changeFrequency: "weekly" },
  { path: "/newsletter", priority: 0.5, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Sitemap läuft potenziell zur Build-Zeit; der ssr-Client mit cookies()
  // ist build-time verboten. Direkt `@supabase/supabase-js` mit Anon-Key —
  // RLS `public can read published articles` erlaubt anon SELECT.
  const articleEntries = await fetchArticleEntries(base);

  return [...staticEntries, ...articleEntries];
}

async function fetchArticleEntries(
  base: string,
): Promise<MetadataRoute.Sitemap> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      "[sitemap] Supabase Public-Env-Vars fehlen, Artikel-Sektion wird übersprungen.",
    );
    return [];
  }

  try {
    const supabase = createSupabaseClient<Database>(url, key);
    const { data, error } = await supabase
      .from("articles")
      .select("slug, updated_at")
      .eq("status", "published");

    if (error) {
      console.error("[sitemap] DB-Fehler:", error.message);
      return [];
    }

    return (data ?? []).map((a) => ({
      url: `${base}/artikel/${a.slug}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
  } catch (err) {
    console.error(
      "[sitemap] Unerwarteter Fehler:",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}
