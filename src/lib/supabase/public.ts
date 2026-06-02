import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Anon-Client für Public-Reads. KEIN cookies()-Aufruf — das ist
// gewollt.
//
// Hintergrund: Der ssr-Client (`@/lib/supabase/server.ts → createClient`)
// ruft intern `cookies()` aus `next/headers` auf. Jede Route, die das
// transitiv aufruft, wird von Next.js als Dynamic Rendering klassifiziert
// und bekommt den Default-Header
// `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`
// → Edge-Cache wird umgangen, jeder Request rendert serverseitig neu.
//
// Public-Read-Funktionen (z.B. `getArticleBySlug`, `getAllTags`) brauchen
// keinen Auth-Kontext: die *_public_read-RLS-Policies erlauben Anon-SELECT
// auf published Inhalte. Stellt man diese Funktionen auf den hier
// erzeugten Anon-Client um, fällt der `cookies()`-Aufruf weg → die Page
// kann static prerendered + via `revalidate` ISR-cached werden.
//
// Pattern existiert bereits in `src/app/sitemap.ts` und in
// `generateStaticParams` der dynamischen Routen (`tag/[slug]`,
// `swiss-ai/[slug]`), wo cookies() beim Build verboten ist. Dieser
// Helper zieht das Pattern auf die regulären Public-Read-API-Funktionen.
//
// NIEMALS für Auth-/Suite-Funktionen verwenden (`getCurrentAuthor`,
// `getMyArticles`, Editor-only-Reads usw.). Diese müssen am ssr-Client
// bleiben.
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "[supabase/public] NEXT_PUBLIC_SUPABASE_URL oder NEXT_PUBLIC_SUPABASE_ANON_KEY fehlt",
    );
  }
  return createSupabaseClient<Database>(url, key);
}
