"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FormError, runAction, type ActionResult } from "@/lib/actionResult";

// Server-Actions der Seite Modell-Check (/autor/admin/ai-config/modell-check).

async function requireEditor(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new FormError("Nicht eingeloggt.");
  const { data: me } = await supabase.from("authors").select("role").eq("user_id", user.id).maybeSingle();
  if (!me) throw new FormError("Author-Profil nicht gefunden.");
  if (me.role !== "editor") throw new FormError("Nur Editoren dürfen den Modell-Check bedienen.");
}

const PAGE = "/autor/admin/ai-config/modell-check";

// «Jetzt prüfen»: gleicher Lauf wie der Cron, aber ohne Mail.
export async function runModelCheckNow(): Promise<ActionResult<{ items: number; errors: string[] }>> {
  return runAction("ai.runModelCheckNow", async () => {
    await requireEditor();
    const { runModelCheck } = await import("@/lib/ai/modelCheck/run");
    const res = await runModelCheck("manual");
    revalidatePath(PAGE);
    return { items: res.items.length, errors: res.errors };
  });
}

export type CatalogPatch = {
  inputPerMTok: string;
  outputPerMTok: string;
  status: string;
  retirementDate: string;
};

const STATUSES = ["active", "deprecated", "retired"] as const;

function parsePrice(raw: string, label: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 10_000) throw new FormError(`${label}: bitte eine Zahl ≥ 0 eingeben (USD pro Million Tokens).`);
  return n;
}

// Preis und Status eines Katalog-Modells pflegen (Models API liefert keine
// Preise). Leeres Preisfeld = Preis fehlt.
export async function saveCatalogModel(modelId: string, patch: CatalogPatch): Promise<ActionResult<null>> {
  return runAction("ai.saveCatalogModel", async () => {
    await requireEditor();
    const input = parsePrice(patch.inputPerMTok, "Input-Preis");
    const output = parsePrice(patch.outputPerMTok, "Output-Preis");
    if ((input === null) !== (output === null)) throw new FormError("Bitte beide Preise eintragen oder beide leer lassen.");
    if (!(STATUSES as readonly string[]).includes(patch.status)) throw new FormError("Unbekannter Status.");
    const date = patch.retirementDate.trim();
    if (date !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new FormError("Abschaltdatum im Format JJJJ-MM-TT.");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_model_catalog")
      .update({
        input_usd_per_mtok: input,
        output_usd_per_mtok: output,
        status: patch.status,
        retirement_date: date === "" ? null : date,
        source: "Admin",
        checked_at: new Date().toISOString().slice(0, 10),
      })
      .eq("model_id", modelId)
      .select("model_id");
    if (error) throw error;
    if (!data || data.length === 0) throw new FormError("Modell nicht gefunden oder keine Berechtigung.");
    revalidatePath(PAGE);
    return null;
  });
}
