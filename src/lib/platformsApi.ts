import "server-only";

import type { Hosting, Platform } from "@/components/PlatformCard";
import { createPublicClient } from "@/lib/supabase/public";

// Verzeichnis /ki-plattformen aus der DB (seit PR 197, vorher im Code).
// Gepflegt woechentlich vom KI-Job (platforms/job.ts) und im Admin
// /autor/admin/ki-plattformen. anon sieht nur aktive Eintraege (RLS).

export type PlatformDirectory = { platforms: Platform[]; checkedAt: string | null };

export async function getPlatformDirectory(): Promise<PlatformDirectory> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("ai_platforms")
    .select("slug, name, category, tagline, hosting, pricing, url, featured, verified_at")
    .eq("status", "active")
    .order("featured", { ascending: false })
    .order("name", { ascending: true });
  if (error || !data) {
    console.error("[platforms] read failed:", error?.message);
    return { platforms: [], checkedAt: null };
  }
  const checked = data.map((p) => p.verified_at).filter((d): d is string => !!d).sort();
  return {
    platforms: data.map((p) => ({
      id: p.slug,
      name: p.name,
      category: p.category,
      tagline: p.tagline,
      hosting: p.hosting as Hosting,
      pricing: p.pricing,
      featured: p.featured,
      link: p.url,
    })),
    checkedAt: checked.length > 0 ? checked[checked.length - 1] : null,
  };
}
