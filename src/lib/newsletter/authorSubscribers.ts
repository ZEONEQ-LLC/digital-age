import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { AUTHOR_CONSENT_TEXT, AUTHOR_SOURCE, isEmptyPlan, planAuthorSync } from "@/lib/newsletter/authorSync";

// Newsletter fuer Autorinnen und Autoren (PR 214): gleicht die Empfaengerliste
// mit den Autorenprofilen ab (Regeln in authorSync.ts). Laeuft mit dem
// Service-Client beim Erstellen eines Entwurfs und vor dem Versand; so sind
// neue Autorinnen und Autoren bei der naechsten Ausgabe dabei, ohne Cron und
// ohne Datenbank-Trigger. Ein Fehler hier haelt weder Entwurf noch Versand auf.
type Sb = SupabaseClient<Database>;

export type AuthorSyncResult = { added: number; linked: number; updated: number };

// Fuer die Seite «Newsletter-Ausgaben» (nur lesen, Sitzung der Redaktion):
// wie viele Autorinnen und Autoren schon auf der Liste stehen und wie viele
// beim naechsten Entwurf oder Versand dazukommen.
export async function getAuthorSubscriberCounts(supabase: Sb): Promise<{ onList: number; toAdd: number }> {
  try {
    const [authors, subscribers] = await Promise.all([
      supabase.from("authors").select("id, email, user_id").limit(5000),
      supabase.from("newsletter_subscribers").select("id, email, status, author_id").limit(20000),
    ]);
    if (authors.error || subscribers.error) return { onList: 0, toAdd: 0 };
    const subs = (subscribers.data ?? []).map((s) => ({ id: s.id, email: s.email, status: s.status, authorId: s.author_id }));
    const plan = planAuthorSync(
      (authors.data ?? []).map((a) => ({ id: a.id, email: a.email, hasLogin: a.user_id !== null })),
      subs,
    );
    return {
      onList: subs.filter((s) => s.authorId && s.status === "confirmed").length,
      toAdd: plan.insert.length + plan.link.filter((l) => l.confirm).length,
    };
  } catch {
    return { onList: 0, toAdd: 0 };
  }
}

export async function syncAuthorSubscribers(svc: Sb): Promise<AuthorSyncResult> {
  const result: AuthorSyncResult = { added: 0, linked: 0, updated: 0 };
  try {
    const [authors, subscribers] = await Promise.all([
      svc.from("authors").select("id, email, user_id").limit(5000),
      svc.from("newsletter_subscribers").select("id, email, status, author_id").limit(20000),
    ]);
    if (authors.error || subscribers.error) {
      console.error("[newsletter:authors] Abgleich nicht moeglich:", authors.error?.message ?? subscribers.error?.message);
      return result;
    }
    const plan = planAuthorSync(
      (authors.data ?? []).map((a) => ({ id: a.id, email: a.email, hasLogin: a.user_id !== null })),
      (subscribers.data ?? []).map((s) => ({ id: s.id, email: s.email, status: s.status, authorId: s.author_id })),
    );
    if (isEmptyPlan(plan)) return result;
    const now = new Date().toISOString();

    for (const row of plan.insert) {
      const { error } = await svc.from("newsletter_subscribers").insert({
        email: row.email,
        status: "confirmed",
        confirmed_at: now,
        source: AUTHOR_SOURCE,
        consent_text: AUTHOR_CONSENT_TEXT,
        author_id: row.authorId,
      });
      // 23505: Adresse oder Profil inzwischen eingetragen (gleichzeitiger Lauf).
      if (error && error.code !== "23505") console.error("[newsletter:authors] Eintrag fehlgeschlagen:", error.message);
      else if (!error) result.added += 1;
    }
    for (const row of plan.link) {
      // Nur verknuepfen, wenn die Zeile noch niemandem gehoert. Aus pending wird
      // confirmed; abgemeldete und bestaetigte Zeilen behalten ihren Status.
      const base = svc.from("newsletter_subscribers");
      const { error } = row.confirm
        ? await base.update({ author_id: row.authorId, status: "confirmed", confirmed_at: now }).eq("id", row.subscriberId).eq("status", "pending").is("author_id", null)
        : await base.update({ author_id: row.authorId }).eq("id", row.subscriberId).is("author_id", null);
      if (error && error.code !== "23505") console.error("[newsletter:authors] Verknuepfen fehlgeschlagen:", error.message);
      else if (!error) result.linked += 1;
    }
    for (const row of plan.updateEmail) {
      const { error } = await svc
        .from("newsletter_subscribers")
        .update({ email: row.email })
        .eq("id", row.subscriberId)
        .eq("status", "confirmed");
      if (error && error.code !== "23505") console.error("[newsletter:authors] Adresse nicht nachgefuehrt:", error.message);
      else if (!error) result.updated += 1;
    }
  } catch (err) {
    console.error("[newsletter:authors] Abgleich fehlgeschlagen:", err);
  }
  return result;
}
