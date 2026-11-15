"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/ads/editorGate";
import { sendPreviewResponseNotification } from "@/lib/articles/mail";
import {
  PREVIEW_TOKEN_RE,
  PREVIEW_VALID_DAYS,
  canRespondToPreview,
  formatDecisionTime,
  previewDecisionStatus,
  previewFingerprint,
  previewLinkPath,
  previewLinkState,
  validatePreviewResponse,
  type PreviewDecisionStatus,
  type PreviewResponseInput,
} from "@/lib/articles/preview";
import { getActivePreviewLink, type PreviewLinkRow } from "@/lib/articles/previewApi";
import { checkRateLimit, getRequestContext, logAttempt } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";

// Vorschau-Link eines Beitrags: Die Redaktion erstellt und sperrt ihn, wer den
// Link hat, gibt frei oder wuenscht Aenderungen. Veroeffentlicht wird nur im
// Editor.

// Was der Editor ueber den Link wissen muss (ohne die Zeile selbst).
export type PreviewLinkInfo = {
  path: string;
  expiresAt: string;
  expired: boolean;
  status: PreviewDecisionStatus;
};

type LinkResult = { ok: true; link: PreviewLinkInfo | null } | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toInfo(link: PreviewLinkRow, article: Record<string, unknown>): PreviewLinkInfo {
  return {
    path: previewLinkPath(link.token),
    expiresAt: link.expires_at,
    expired: previewLinkState(link, Date.now()) === "expired",
    status: previewDecisionStatus(link, previewFingerprint(article)),
  };
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : "Unbekannter Fehler.";
}

// Aktueller Link samt Rueckmeldung. Der Editor ruft das beim Oeffnen des Tabs
// «Vorschau» und nach dem Speichern auf (die Pruefsumme haengt am Inhalt).
export async function getPreviewLink(articleId: string): Promise<LinkResult> {
  try {
    if (!UUID_RE.test(articleId)) return { ok: false, error: "Beitrag nicht gefunden." };
    const { supabase } = await requireEditor();
    const [link, { data: article }] = await Promise.all([
      getActivePreviewLink(supabase, articleId),
      supabase.from("articles").select("*").eq("id", articleId).maybeSingle(),
    ]);
    if (!article) return { ok: false, error: "Beitrag nicht gefunden." };
    return { ok: true, link: link ? toInfo(link, article) : null };
  } catch (e) {
    return { ok: false, error: errorText(e) };
  }
}

// Neuer Link. Ein bestehender wird gesperrt: Es gibt pro Beitrag immer nur
// einen gueltigen Link, die fruehere Rueckmeldung gehoert zum alten.
export async function createPreviewLink(articleId: string): Promise<LinkResult> {
  try {
    if (!UUID_RE.test(articleId)) return { ok: false, error: "Beitrag nicht gefunden." };
    const { supabase, editorId } = await requireEditor();
    const { data: article } = await supabase.from("articles").select("*").eq("id", articleId).maybeSingle();
    if (!article) return { ok: false, error: "Beitrag nicht gefunden." };
    if (article.status === "archived") return { ok: false, error: "Archivierte Beiträge haben keine Vorschau." };

    const now = new Date();
    const { error: revokeError } = await supabase
      .from("article_preview_links")
      .update({ revoked_at: now.toISOString() })
      .eq("article_id", articleId)
      .is("revoked_at", null);
    if (revokeError) return { ok: false, error: "Der bisherige Link liess sich nicht sperren." };

    const expires = new Date(now.getTime() + PREVIEW_VALID_DAYS * 24 * 60 * 60 * 1000);
    const { data: link, error } = await supabase
      .from("article_preview_links")
      .insert({ article_id: articleId, created_by: editorId, expires_at: expires.toISOString() })
      .select("*")
      .single();
    if (error || !link) return { ok: false, error: "Der Link liess sich nicht erstellen." };
    return { ok: true, link: toInfo(link, article) };
  } catch (e) {
    return { ok: false, error: errorText(e) };
  }
}

export async function revokePreviewLink(articleId: string): Promise<LinkResult> {
  try {
    if (!UUID_RE.test(articleId)) return { ok: false, error: "Beitrag nicht gefunden." };
    const { supabase } = await requireEditor();
    const { data: revoked, error } = await supabase
      .from("article_preview_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("article_id", articleId)
      .is("revoked_at", null)
      .select("token");
    if (error) return { ok: false, error: "Der Link liess sich nicht sperren." };
    for (const r of revoked ?? []) revalidatePath(previewLinkPath(r.token));
    return { ok: true, link: null };
  } catch (e) {
    return { ok: false, error: errorText(e) };
  }
}

// ── Rueckmeldung ueber den Link (ohne Login) ──────────────────────────────

export type PreviewResponseResult = { ok: true } | { ok: false; error: string };

const GENERIC = "Die Rückmeldung konnte nicht gespeichert werden. Bitte lade die Seite neu und versuche es nochmals.";
const LIMIT_PER_HOUR = 10;
const LIMIT_PER_DAY = 30;

export async function respondToPreview(token: string, input: PreviewResponseInput): Promise<PreviewResponseResult> {
  try {
    const checked = validatePreviewResponse(input);
    if (!checked.ok) return { ok: false, error: checked.error };
    // Verstecktes Feld gefuellt: ein Bot. Kein Hinweis, nichts gespeichert.
    if ((input.website ?? "").trim() !== "") return { ok: true };
    if (!PREVIEW_TOKEN_RE.test(token ?? "")) return { ok: false, error: GENERIC };

    const supabase = createServiceClient();
    const { ipHash } = await getRequestContext();
    const limit = await checkRateLimit(supabase, ipHash, "preview_response", { perHour: LIMIT_PER_HOUR, perDay: LIMIT_PER_DAY });
    if (!limit.allowed) return { ok: false, error: "Zu viele Rückmeldungen in kurzer Zeit. Bitte später nochmals versuchen." };

    const { data: link } = await supabase.from("article_preview_links").select("*").eq("token", token).maybeSingle();
    if (!link) return { ok: false, error: GENERIC };
    const state = previewLinkState(link, Date.now());
    if (state === "revoked") return { ok: false, error: GENERIC };
    if (state === "expired") return { ok: false, error: "Dieser Vorschau-Link ist abgelaufen. Bitte die Redaktion um einen neuen." };

    const { data: article } = await supabase.from("articles").select("*").eq("id", link.article_id).maybeSingle();
    if (!article) return { ok: false, error: GENERIC };
    if (!canRespondToPreview(article.status)) {
      return { ok: false, error: "Der Beitrag ist bereits veröffentlicht. Für Änderungen schreib bitte der Redaktion." };
    }

    await logAttempt(supabase, ipHash, "preview_response");

    const decidedAt = new Date().toISOString();
    const { error } = await supabase
      .from("article_preview_links")
      .update({
        decision: checked.value.decision,
        decided_at: decidedAt,
        decided_by: checked.value.name,
        decision_note: checked.value.note,
        decided_fingerprint: previewFingerprint(article),
      })
      .eq("id", link.id)
      .is("revoked_at", null);
    if (error) return { ok: false, error: GENERIC };

    // Die Rueckmeldung ist gespeichert; scheitert die Mail, steht sie trotzdem
    // im Editor.
    const sent = await sendPreviewResponseNotification({
      articleId: article.id,
      title: article.title,
      decision: checked.value.decision,
      name: checked.value.name,
      note: checked.value.note,
      when: formatDecisionTime(decidedAt),
    });
    if (!sent.ok) console.error("[preview] Meldung an die Redaktion nicht versandt:", sent.error);

    revalidatePath(previewLinkPath(token));
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC };
  }
}
