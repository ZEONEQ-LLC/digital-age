import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type PageRow = Database["public"]["Tables"]["pages"]["Row"];

// Public-Read: nur published, von Public-Routen (ueber-uns, impressum, …)
// genutzt. RLS-Policy `pages_public_read_published` lässt anon SELECT zu;
// der Server-Client hat die User-Session, aber published-Filter ist
// redundant zur RLS — explizit dazu, damit der Read auch ohne Session
// (z.B. Build-Time-SSG) korrekt 0 Rows liefert für drafts.
export async function getPublishedPageBySlug(slug: string): Promise<PageRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data;
}

// Editor-View: alle Pages (auch drafts). RLS-Policy `pages_editor_all`
// gated auf is_editor(), nicht-Editor sehen nichts, Editor sieht alles.
export async function getAllPagesForEditor(): Promise<PageRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("*")
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getPageById(id: string): Promise<PageRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}
