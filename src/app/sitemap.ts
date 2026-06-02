import type { MetadataRoute } from "next";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
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
  { path: "/tags", priority: 0.5, changeFrequency: "weekly" },
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
  // alle Quellen unten haben anon-SELECT-Policies (`tags_public_read`,
  // Article/Prompt/Startup `*_public_read`, `public can read author
  // profiles` aus dem Initial-Schema).
  const supabase = createBuildtimeClient();
  if (!supabase) {
    return staticEntries;
  }

  const [articles, tags, authors, prompts, startups] = await Promise.all([
    fetchArticleEntries(supabase, base),
    fetchTagEntries(supabase, base),
    fetchAuthorEntries(supabase, base),
    fetchPromptEntries(supabase, base),
    fetchStartupEntries(supabase, base),
  ]);

  return [
    ...staticEntries,
    ...articles,
    ...tags,
    ...authors,
    ...prompts,
    ...startups,
  ];
}

function createBuildtimeClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      "[sitemap] Supabase Public-Env-Vars fehlen, dynamische Sektionen werden übersprungen.",
    );
    return null;
  }
  return createSupabaseClient<Database>(url, key);
}

async function fetchArticleEntries(
  supabase: SupabaseClient<Database>,
  base: string,
): Promise<MetadataRoute.Sitemap> {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("slug, updated_at")
      .eq("status", "published");
    if (error) {
      console.error("[sitemap] articles error:", error.message);
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
      "[sitemap] articles threw:",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

async function fetchTagEntries(
  supabase: SupabaseClient<Database>,
  base: string,
): Promise<MetadataRoute.Sitemap> {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("slug, updated_at");
    if (error) {
      console.error("[sitemap] tags error:", error.message);
      return [];
    }
    return (data ?? []).map((t) => ({
      url: `${base}/tag/${t.slug}`,
      lastModified: t.updated_at ? new Date(t.updated_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  } catch (err) {
    console.error(
      "[sitemap] tags threw:",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

async function fetchAuthorEntries(
  supabase: SupabaseClient<Database>,
  base: string,
): Promise<MetadataRoute.Sitemap> {
  // Public-Author-Profil-Route ist /autor/<handle> (siehe
  // src/app/autor/(public)/[slug]/page.tsx → getAuthorByHandle). Authors
  // ohne handle haben keine erreichbare Profil-URL, Authors ohne user_id
  // sind ungeclaimte Placeholder ohne Login → beide ausschliessen.
  try {
    const { data, error } = await supabase
      .from("authors")
      .select("handle, updated_at, user_id")
      .not("handle", "is", null)
      .not("user_id", "is", null);
    if (error) {
      console.error("[sitemap] authors error:", error.message);
      return [];
    }
    const entries: MetadataRoute.Sitemap = [];
    for (const a of data ?? []) {
      if (typeof a.handle !== "string" || a.handle.length === 0) continue;
      entries.push({
        url: `${base}/autor/${a.handle}`,
        lastModified: a.updated_at ? new Date(a.updated_at) : undefined,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      });
    }
    return entries;
  } catch (err) {
    console.error(
      "[sitemap] authors threw:",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

async function fetchPromptEntries(
  supabase: SupabaseClient<Database>,
  base: string,
): Promise<MetadataRoute.Sitemap> {
  // /ai-prompts/<id> — UUID-based, kein slug. RLS lässt anon nur
  // published+featured durch (siehe ai_prompts_public_read).
  try {
    const { data, error } = await supabase
      .from("ai_prompts")
      .select("id, updated_at, status")
      .in("status", ["published", "featured"]);
    if (error) {
      console.error("[sitemap] prompts error:", error.message);
      return [];
    }
    return (data ?? []).map((p) => ({
      url: `${base}/ai-prompts/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
  } catch (err) {
    console.error(
      "[sitemap] prompts threw:",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

async function fetchStartupEntries(
  supabase: SupabaseClient<Database>,
  base: string,
): Promise<MetadataRoute.Sitemap> {
  // /swiss-ai/<slug>. RLS lässt anon nur published+featured durch
  // (siehe ai_startups_public_read).
  try {
    const { data, error } = await supabase
      .from("ai_startups")
      .select("slug, updated_at, status")
      .in("status", ["published", "featured"]);
    if (error) {
      console.error("[sitemap] startups error:", error.message);
      return [];
    }
    return (data ?? []).map((s) => ({
      url: `${base}/swiss-ai/${s.slug}`,
      lastModified: s.updated_at ? new Date(s.updated_at) : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch (err) {
    console.error(
      "[sitemap] startups threw:",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}
