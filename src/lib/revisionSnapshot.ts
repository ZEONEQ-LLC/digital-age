// Reine Helper fuers Revisions-v2-System. Bewusst KEIN "use server" —
// nebenwirkungsfrei, damit UI + Test importieren koennen.
//
// REVISION_SNAPSHOT_FIELDS ist die Liste der redaktionellen articles-Spalten,
// die in den Revision-Snapshot gehen. Sie MUSS mit dem jsonb_build_object in
// public.article_editorial_snapshot (Migration 20260707170000) synchron
// bleiben — die SQL-Seite ist die ausfuehrende Quelle, diese Konstante die
// dokumentierte/testbare Spiegelung.
//
// BEWUSST NICHT enthalten:
//   - status                       (nur Anzeige, wird beim Restore NIE geaendert)
//   - seo_review / seo_review_at   (abgeleitete Analyse, kein redaktioneller Inhalt)
//   - is_featured / is_hero        (Platzierungs-Flags mit DB-Constraints)
//   - published_at / word_count /
//     reading_minutes / updated_at (abgeleitet bzw. Meta)
//   - id / author_id / created_at  (Identitaet/Ownership)
//
// Ergaenzend zur Design-Liste sind subtitle + locale enthalten — beide sind
// klar redaktioneller Inhalt; ein Restore ohne sie waere still verlustbehaftet.
export const REVISION_SNAPSHOT_FIELDS = [
  "title",
  "subtitle",
  "body_blocks",
  "body_md",
  "excerpt",
  "cover_image_url",
  "cover_image_alt",
  "cover_image_caption",
  "cover_image_source",
  "category_id",
  "subcategory",
  "tags",
  "locale",
  "seo_title",
  "seo_description",
  "seo_keyword_primary",
  "seo_keywords_secondary",
  "slug",
] as const;

export type RevisionType = "content" | "status_change" | "restore";

export function revisionTypeOf(rev: {
  revision_type?: string | null;
}): RevisionType {
  const t = rev.revision_type;
  if (t === "status_change" || t === "restore") return t;
  return "content";
}

// Slug-Restore-Regel: war der Artikel JEMALS publiziert, bleibt die URL
// (Slug wird NICHT restauriert). Nie publiziert → Slug wird mitrestauriert.
export function shouldRestoreSlug(everPublished: boolean): boolean {
  return !everPublished;
}

type RestorableRev = {
  revision_type?: string | null;
  snapshot?: unknown;
  body_md_snapshot?: string | null;
};

// Restaurierbar = kein reiner Status-Wechsel UND es existiert etwas zum
// Zuruecksetzen (voller Snapshot ODER Alt-Body-Markdown).
export function isRestorable(rev: RestorableRev): boolean {
  if (revisionTypeOf(rev) === "status_change") return false;
  return (
    rev.snapshot != null ||
    (typeof rev.body_md_snapshot === "string" && rev.body_md_snapshot.length > 0)
  );
}

// Alt-Revision (vor v2): restaurierbar, aber ohne vollen Snapshot → nur
// Titel + Body (Markdown) werden wiederhergestellt (Teilrestore).
export function isPartialRevision(rev: RestorableRev): boolean {
  return isRestorable(rev) && rev.snapshot == null;
}
