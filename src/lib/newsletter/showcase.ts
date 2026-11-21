// Rubrik «Aus dem Showcase» im Newsletter (Showcase S4b). Unternehmensbeitraege
// stehen nie unter «Neu auf digital age» (E2), sondern in diesem eigenen,
// gekennzeichneten Block, hoechstens zwei pro Ausgabe (Uebergabe 4.5).
// Rein, ohne DB und ohne "server-only": Entwurfs-Job, Admin, Versand und
// Mail teilen Typ, Pruefung und Abbildung. Test: __tests__/showcase.manual.ts.
//
// Wie bei den Anzeigen baut der Server den Eintrag (showcaseApi.ts): Titel,
// Slug, Firma und Kennzeichnung kommen immer aus dem Artikel. Vom Browser
// zaehlen nur Auswahl, Reihenfolge und der Kurztext.

import { contentTypeLabel } from "@/lib/contentType";
import { clipAtSentence } from "@/lib/textClip";

export const MAX_SHOWCASE = 2;
export const SHOWCASE_TEASER_MAX = 300;
// Ersatztext aus dem Abstract: am letzten ganzen Satz enden.
const FALLBACK_CHARS = 260;

export const SHOWCASE_ARTICLE_SELECT =
  "id, slug, title, excerpt, status, content_type, is_paid, published_at, startup:ai_startups(name)";

export type ShowcaseArticleRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: string;
  content_type: string;
  is_paid: boolean;
  published_at: string | null;
  startup: { name: string } | null;
};

export type IssueShowcase = {
  articleId: string;
  slug: string;
  title: string;
  teaser: string;
  company: string;
  // «Unternehmensbeitrag» oder «Publireportage», aus is_paid.
  label: string;
};

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

const LABELS = new Set(["Unternehmensbeitrag", "Publireportage"]);

// Aus DB (jsonb) oder Client: nur gueltige Eintraege, ohne Dubletten,
// hoechstens MAX_SHOWCASE. Ohne Firma oder Kennzeichnung faellt ein Eintrag
// weg: Ungekennzeichnet erscheint nie etwas.
export function sanitizeShowcase(raw: unknown): IssueShowcase[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: IssueShowcase[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const articleId = str(o.articleId, 64);
    const slug = str(o.slug, 200);
    const title = str(o.title, 300);
    const company = str(o.company, 160);
    const label = str(o.label, 40);
    if (!articleId || !slug || !title || !company || !LABELS.has(label) || seen.has(articleId)) continue;
    seen.add(articleId);
    out.push({ articleId, slug, title, teaser: str(o.teaser, SHOWCASE_TEASER_MAX), company, label });
    if (out.length >= MAX_SHOWCASE) break;
  }
  return out;
}

// Nur publizierte Unternehmensbeitraege mit Firma.
export function isShowcaseReady(r: ShowcaseArticleRow): boolean {
  return r.content_type === "company" && r.status === "published" && !!r.startup?.name;
}

export function showcaseFromRow(r: ShowcaseArticleRow, teaser?: string): IssueShowcase | null {
  if (!isShowcaseReady(r)) return null;
  const label = contentTypeLabel(r);
  if (!label) return null;
  return {
    articleId: r.id,
    slug: r.slug,
    title: r.title,
    teaser: str(teaser?.trim() ? teaser : clipAtSentence((r.excerpt ?? "").replace(/\s+/g, " ").trim(), FALLBACK_CHARS), SHOWCASE_TEASER_MAX),
    company: r.startup?.name ?? "",
    label,
  };
}

// Gewuenschte Eintraege gegen die aktuellen Artikel: Titel, Slug, Firma und
// Kennzeichnung aus der DB, der Kurztext aus dem Wunsch. Was nicht mehr
// publiziert oder kein Unternehmensbeitrag mehr ist, steht in `missing`.
export function resolveShowcaseEntries(
  wanted: IssueShowcase[],
  rows: ShowcaseArticleRow[],
): { entries: IssueShowcase[]; missing: IssueShowcase[] } {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const entries: IssueShowcase[] = [];
  const missing: IssueShowcase[] = [];
  for (const w of wanted) {
    const row = byId.get(w.articleId);
    const next = row ? showcaseFromRow(row, w.teaser) : null;
    if (next) entries.push(next);
    else missing.push(w);
  }
  return { entries, missing };
}

// Zeile ueber dem Titel in der Mail und im Admin.
export function showcaseLine(e: Pick<IssueShowcase, "label" | "company">): string {
  return `${e.label} von ${e.company}`;
}
