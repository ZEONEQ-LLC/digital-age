import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

// Kontaktadressen liegen in startup_contacts (nur Editoren + Service-Role).
// Oeffentliche Seiten fragen nur ab, OB ein Startup Anfragen annimmt.

export type ActiveContact = { email: string; optoutToken: string };

export async function getActiveStartupContact(startupId: string): Promise<ActiveContact | null> {
  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    // Lokal ohne Service-Role-Key: kein Kontaktformular.
    return null;
  }
  const { data, error } = await supabase
    .from("startup_contacts")
    .select("email, optout_token, revoked_at")
    .eq("startup_id", startupId)
    .maybeSingle();
  if (error) {
    console.error("[startup-contact] lookup failed:", error.message);
    return null;
  }
  if (!data || data.revoked_at) return null;
  return { email: data.email, optoutToken: data.optout_token };
}

export async function startupAcceptsContact(startupId: string): Promise<boolean> {
  return (await getActiveStartupContact(startupId)) !== null;
}
