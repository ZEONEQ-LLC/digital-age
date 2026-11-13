"use server";

import { revalidatePath } from "next/cache";
import { FormError, runAction, type ActionResult } from "@/lib/actionResult";
import { createNewsletterDraft } from "@/lib/newsletter/draftJob";
import {
  INTRO_MAX,
  SUBJECT_MAX,
  sanitizeItems,
  sanitizeSections,
  type IssueItem,
  type IssueSections,
} from "@/lib/newsletter/issue";
import { renderIssueHtml, sendIssueTest, sendIssueToSubscribers } from "@/lib/newsletter/sendIssue";
import { createClient } from "@/lib/supabase/server";

// Server Actions der Seite /autor/admin/newsletter/ausgaben (PR 195).
// Entwurf pflegen ueber den Session-Client (RLS: Editor), Entwurf erzeugen
// und Versand ueber die Service-Role in draftJob.ts / sendIssue.ts, nachdem
// hier der Editor geprueft ist.

const PAGE = "/autor/admin/newsletter/ausgaben";

async function requireEditor(): Promise<{ id: string; email: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new FormError("Nicht eingeloggt.");
  const { data: me } = await supabase.from("authors").select("id, role, email").eq("user_id", user.id).maybeSingle();
  if (!me) throw new FormError("Author-Profil nicht gefunden.");
  if (me.role !== "editor") throw new FormError("Nur Editoren dürfen den Newsletter bedienen.");
  return { id: me.id, email: me.email };
}

export type IssuePatch = { subject: string; intro: string; items: IssueItem[]; sections: IssueSections };

async function loadOpenDraft(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("newsletter_issues").select("id, status").eq("id", id).maybeSingle();
  if (error || !data) throw new FormError("Ausgabe nicht gefunden.");
  if (data.status !== "draft") throw new FormError("Nur Entwürfe lassen sich bearbeiten.");
  return supabase;
}

export async function saveIssue(id: string, patch: IssuePatch): Promise<ActionResult<{ items: IssueItem[]; sections: IssueSections }>> {
  return runAction("newsletter.saveIssue", async () => {
    await requireEditor();
    const subject = patch.subject.replace(/\s+/g, " ").trim();
    const intro = patch.intro.trim();
    if (subject === "") throw new FormError("Betreff fehlt.");
    if (subject.length > SUBJECT_MAX) throw new FormError(`Betreff zu lang (höchstens ${SUBJECT_MAX} Zeichen).`);
    if (intro.length > INTRO_MAX) throw new FormError(`Einleitung zu lang (höchstens ${INTRO_MAX} Zeichen).`);
    const items = sanitizeItems(patch.items);
    const sections = sanitizeSections(patch.sections);
    const supabase = await loadOpenDraft(id);
    const { error } = await supabase
      .from("newsletter_issues")
      .update({ subject, intro, items, sections, edited_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "draft");
    if (error) throw error;
    revalidatePath(PAGE);
    return { items, sections };
  });
}

// Entwurf neu erstellen (KI). replaceEdited: auch einen bearbeiteten
// Entwurf ersetzen; der Client fragt vorher nach.
export async function createIssueNow(
  replaceEdited: boolean,
): Promise<ActionResult<{ message: string; issueId: string | null; needsConfirm: boolean }>> {
  return runAction("newsletter.createIssueNow", async () => {
    const me = await requireEditor();
    const res = await createNewsletterDraft({ source: "manual", authorId: me.id, replaceEdited });
    revalidatePath(PAGE);
    switch (res.kind) {
      case "created":
        return {
          message: `Entwurf mit ${res.items} Artikeln und ${res.news} News erstellt${res.aiOk ? "." : ", aber ohne KI-Texte (siehe Hinweis)."}`,
          issueId: res.issueId,
          needsConfirm: false,
        };
      case "no_articles":
        throw new FormError("Seit der letzten Ausgabe sind weder neue Artikel noch genug eingeordnete News erschienen. Kein Entwurf erstellt.");
      case "kept_edited":
        return { message: "Der offene Entwurf ist bearbeitet.", issueId: res.issueId, needsConfirm: true };
      case "sending":
        throw new FormError("Eine Ausgabe wird gerade versendet. Erst danach ist ein neuer Entwurf möglich.");
      default:
        console.error("[newsletter] draft failed:", res.message);
        throw new FormError("Der Entwurf konnte nicht erstellt werden.");
    }
  });
}

export async function discardIssue(id: string): Promise<ActionResult<null>> {
  return runAction("newsletter.discardIssue", async () => {
    await requireEditor();
    const supabase = await loadOpenDraft(id);
    const { error } = await supabase.from("newsletter_issues").update({ status: "discarded" }).eq("id", id).eq("status", "draft");
    if (error) throw error;
    revalidatePath(PAGE);
    return null;
  });
}

// Vorschau im Admin: dasselbe HTML wie im Versand (Abmeldelink ohne Token).
export async function renderIssuePreview(patch: IssuePatch): Promise<ActionResult<string>> {
  return runAction("newsletter.renderIssuePreview", async () => {
    await requireEditor();
    return renderIssueHtml(
      {
        subject: patch.subject.trim() || "(Betreff fehlt)",
        intro: patch.intro.trim(),
        items: sanitizeItems(patch.items),
        sections: sanitizeSections(patch.sections),
      },
      { date: new Date(), test: true },
    );
  });
}

// Test an die eigene Adresse des Editors (gespeicherter Stand).
export async function sendTestIssue(id: string): Promise<ActionResult<{ to: string }>> {
  return runAction("newsletter.sendTestIssue", async () => {
    const me = await requireEditor();
    await loadOpenDraft(id);
    const res = await sendIssueTest(id, me.email);
    if (!res.ok) throw new FormError(`Testversand fehlgeschlagen: ${res.error}`);
    revalidatePath(PAGE);
    return { to: me.email };
  });
}

// Freigeben und senden (oder fortsetzen, wenn der Versand schon laeuft).
export async function sendIssueNow(id: string): Promise<ActionResult<{ message: string; done: boolean }>> {
  return runAction("newsletter.sendIssueNow", async () => {
    const me = await requireEditor();
    const res = await sendIssueToSubscribers(id, me.id);
    revalidatePath(PAGE);
    if (!res.ok) throw new FormError(res.error);
    if (res.done) {
      return { message: `Versendet an ${res.sent} Empfänger${res.failed > 0 ? `, ${res.failed} ausgelassen oder fehlgeschlagen` : ""}.`, done: true };
    }
    return {
      message: `${res.sent} versendet, ${res.pending} noch offen${res.failed > 0 ? ` (${res.failed} mit Fehler)` : ""}. Bitte «Versand fortsetzen» klicken.`,
      done: false,
    };
  });
}
