// Vorschau eines Beitrags (rein, testbar). Drei Stellen nutzen dieselbe
// Ansicht wie die publizierte Seite:
//   /vorschau/artikel/<token>        Link fuer Autor:in oder Unternehmen, ohne Login
//   /vorschau/artikel/entwurf/<id>   gespeicherter Stand fuer eingeloggte Autor:innen
//   Tab «Vorschau» im Editor         bettet die Entwurfsseite ein und schickt ihr
//                                    den ungespeicherten Stand (postMessage)
// Server-Teil: previewApi.ts und previewActions.ts.
import type { BlockDocument } from "@/types/blocks";

export const PREVIEW_TOKEN_RE = /^[0-9a-f]{48}$/;
export const PREVIEW_PATH = "/vorschau/artikel";
export const PREVIEW_VALID_DAYS = 30;

export function previewLinkPath(token: string): string {
  return `${PREVIEW_PATH}/${token}`;
}
export function draftPreviewPath(articleId: string, embed = false): string {
  return `${PREVIEW_PATH}/entwurf/${articleId}${embed ? "?embed=1" : ""}`;
}

// ── Link ──────────────────────────────────────────────────────────────────

export type PreviewLinkState = "active" | "expired" | "revoked";

export function previewLinkState(
  row: { expires_at: string; revoked_at: string | null },
  now: number,
): PreviewLinkState {
  if (row.revoked_at) return "revoked";
  return new Date(row.expires_at).getTime() <= now ? "expired" : "active";
}

// Rueckmelden kann man nur, solange der Beitrag nicht erschienen ist.
export function canRespondToPreview(status: string): boolean {
  return status === "draft" || status === "in_review";
}

// ── Rueckmeldung ──────────────────────────────────────────────────────────

export type PreviewDecision = "approved" | "changes";
export const DECISION_NAME_MAX = 120;
export const DECISION_NOTE_MAX = 2000;

export type PreviewResponseInput = {
  decision: string;
  name: string;
  note: string;
  // Verstecktes Feld: Menschen lassen es leer.
  website?: string;
};

export type PreviewResponseCheck =
  | { ok: true; value: { decision: PreviewDecision; name: string; note: string | null } }
  | { ok: false; error: string };

export function validatePreviewResponse(input: PreviewResponseInput): PreviewResponseCheck {
  const decision = input.decision === "approved" || input.decision === "changes" ? input.decision : null;
  if (!decision) return { ok: false, error: "Bitte «Freigeben» oder «Änderungen wünschen» wählen." };
  const name = (input.name ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 2) return { ok: false, error: "Bitte deinen Namen angeben." };
  if (name.length > DECISION_NAME_MAX) return { ok: false, error: `Der Name ist zu lang (höchstens ${DECISION_NAME_MAX} Zeichen).` };
  const note = (input.note ?? "").replace(/\r\n/g, "\n").trim();
  if (note.length > DECISION_NOTE_MAX) return { ok: false, error: `Die Bemerkung ist zu lang (höchstens ${DECISION_NOTE_MAX} Zeichen).` };
  if (decision === "changes" && note.length < 3) {
    return { ok: false, error: "Bitte schreib kurz, was geändert werden soll." };
  }
  return { ok: true, value: { decision, name, note: note || null } };
}

// Stand der Rueckmeldung. `stale`: Der Beitrag wurde nach der Rueckmeldung
// geaendert, sie gilt fuer eine fruehere Fassung.
export type PreviewDecisionStatus =
  | { kind: "none" }
  | { kind: PreviewDecision; at: string; by: string; note: string | null; stale: boolean };

export function previewDecisionStatus(
  link: {
    decision: string | null;
    decided_at: string | null;
    decided_by: string | null;
    decision_note: string | null;
    decided_fingerprint: string | null;
  },
  currentFingerprint: string,
): PreviewDecisionStatus {
  if ((link.decision !== "approved" && link.decision !== "changes") || !link.decided_at) return { kind: "none" };
  return {
    kind: link.decision,
    at: link.decided_at,
    by: link.decided_by ?? "",
    note: link.decision_note,
    stale: link.decided_fingerprint !== currentFingerprint,
  };
}

// «15.11.2026, 14:05» in Schweizer Zeit (Server und Browser gleich).
export function formatDecisionTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" });
  const time = d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" });
  return `${date}, ${time}`;
}
export function formatDayCH(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" });
}

// ── Pruefsumme ────────────────────────────────────────────────────────────

// Felder, die man in der Vorschau sieht. Aendert sich eines davon, gilt eine
// fruehere Freigabe nicht mehr fuer die aktuelle Fassung.
const FINGERPRINT_FIELDS = [
  "title", "subtitle", "excerpt", "body_blocks", "body_md",
  "cover_image_url", "cover_image_alt", "cover_image_caption", "cover_image_source", "cover_video_url",
  "disclosure_note", "subcategory", "tags", "locale",
  "author_id", "category_id", "content_type", "startup_id", "is_paid",
] as const;

function cyrb53(str: string, seed: number): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

// JSON mit sortierten Schluesseln: dieselben Daten ergeben dieselbe Zeichenkette,
// egal in welcher Reihenfolge die Datenbank ein Objekt liefert.
function stableJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${stableJson(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function previewFingerprint(article: Record<string, unknown>): string {
  const s = stableJson(FINGERPRINT_FIELDS.map((f) => article[f] ?? null));
  return `${cyrb53(s, 1)}${cyrb53(s, 2)}`;
}

// ── Weitergeben ───────────────────────────────────────────────────────────

export function previewShareText(title: string, url: string): string {
  return `Vorschau deines Beitrags «${title}» auf digital age:\n${url}\n\nSo wird er erscheinen. Unten auf der Seite kannst du ihn freigeben oder Änderungen wünschen.`;
}
export function previewMailto(title: string, url: string, to?: string | null): string {
  const subject = `Vorschau: ${title}`;
  return `mailto:${to ? encodeURIComponent(to) : ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(previewShareText(title, url))}`;
}
export function previewWhatsapp(title: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(previewShareText(title, url))}`;
}

// ── Editor: Geraete und Massstab ──────────────────────────────────────────

export const PREVIEW_VIEWPORTS = [
  { id: "desktop", label: "Desktop", width: 1440 },
  { id: "tablet", label: "Tablet", width: 834 },
  { id: "phone", label: "Handy", width: 390 },
] as const;
export type PreviewViewportId = (typeof PREVIEW_VIEWPORTS)[number]["id"];

// Massstab, mit dem eine Seite der Breite `viewport` in `container` passt
// (nie vergroessern).
export function fitScale(container: number, viewport: number): number {
  if (!(container > 0) || !(viewport > 0)) return 1;
  return Math.min(1, Math.round((container / viewport) * 1000) / 1000);
}

// ── Editor: ungespeicherter Stand ─────────────────────────────────────────

export const PREVIEW_MSG_READY = "da-preview-ready";
export const PREVIEW_MSG_DRAFT = "da-preview-draft";

// Was der Editor der eingebetteten Entwurfsseite schickt. Autor und Rubrik
// nur mit den Angaben, die der Editor kennt.
export type PreviewOverrides = {
  title: string;
  excerpt: string;
  body_blocks: BlockDocument;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  cover_image_caption: string | null;
  cover_image_source: string | null;
  cover_video_url: string | null;
  disclosure_note: string | null;
  tags: string[];
  subcategory: string | null;
  locale: string;
  // «JJJJ-MM-TT» oder leer (dann heute, wie beim ersten Publizieren).
  published_date: string;
  reading_minutes: number;
  category: { id: string; slug: string; name_de: string } | null;
  author: { id: string; display_name: string; role: string } | null;
};

type OverridableArticle = {
  category: { id?: string } | null;
  author: { id: string } | null;
  published_at: string | null;
};

// Legt den ungespeicherten Stand ueber den gespeicherten Beitrag. Wechselt der
// Autor, kennt der Editor nur Name und Rolle: Bild und Kurzbio folgen nach dem
// Speichern.
export function applyPreviewOverrides<T extends OverridableArticle>(article: T, o: PreviewOverrides): T {
  const publishedAt = /^\d{4}-\d{2}-\d{2}$/.test(o.published_date) ? `${o.published_date}T11:00:00.000Z` : article.published_at;
  const category = o.category ? { ...(article.category ?? {}), ...o.category } : article.category;
  let author = article.author;
  if (o.author && article.author && o.author.id !== article.author.id) {
    author = {
      ...article.author,
      id: o.author.id,
      display_name: o.author.display_name,
      role: o.author.role,
      avatar_url: null,
      bio: null,
      job_title: null,
    } as T["author"];
  }
  return {
    ...article,
    title: o.title,
    excerpt: o.excerpt,
    body_blocks: o.body_blocks,
    cover_image_url: o.cover_image_url,
    cover_image_alt: o.cover_image_alt,
    cover_image_caption: o.cover_image_caption,
    cover_image_source: o.cover_image_source,
    cover_video_url: o.cover_video_url,
    disclosure_note: o.disclosure_note,
    tags: o.tags,
    subcategory: o.subcategory,
    locale: o.locale,
    reading_minutes: o.reading_minutes,
    published_at: publishedAt,
    category,
    author,
  };
}

export function isPreviewOverrides(v: unknown): v is PreviewOverrides {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  const doc = o.body_blocks as { blocks?: unknown } | null | undefined;
  return (
    typeof o.title === "string" &&
    typeof o.excerpt === "string" &&
    typeof doc === "object" && doc !== null && Array.isArray(doc.blocks) &&
    Array.isArray(o.tags) &&
    typeof o.locale === "string" &&
    typeof o.published_date === "string" &&
    typeof o.reading_minutes === "number"
  );
}
