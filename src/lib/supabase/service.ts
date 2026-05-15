import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Service-Role-Client: nur für Server-Seite (Server Actions, Route
// Handlers, Edge Functions). RLS wird vollständig umgangen — entsprechend
// vorsichtig nutzen und niemals an Client-Code weiterreichen.
//
// Wird gebraucht für anon-Endpunkte wie die Newsletter-Anmeldung, wo die
// Inserts ausschliesslich serverseitig validiert + persistiert werden.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL not configured");
  }
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
