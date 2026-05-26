import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Singleton: ohne diesen Cache erzeugt jeder createClient()-Aufruf eine
// neue GoTrueClient-Instanz im selben Browser-Tab. Supabase warnt darüber
// ("Multiple GoTrueClient instances detected"), und Storage-Race-Conditions
// können Hydration so durcheinander bringen, dass Next.js Client-Side-
// Navigation still scheitert.
let _client: SupabaseClient<Database> | undefined;

export function createClient(): SupabaseClient<Database> {
  if (!_client) {
    _client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _client;
}
