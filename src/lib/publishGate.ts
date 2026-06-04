// Pre-Publish-SEO-Gate: prueft Pflichtfelder beim Erst-Publish.
//
// Reine Funktion ohne DB-/React-Abhaengigkeit, damit UI (EditorClient) und
// Server (publishArticle) denselben Befund liefern. Aufrufer entscheidet, ob
// der Gate aktiv ist (Erst-Publish = published_at IS NULL); diese Funktion
// prueft nur die Felder.
//
// Pflicht (nicht-leer, getrimmt):
//   - seo_title, seo_description, slug, seo_keyword_primary, excerpt
// Konditional:
//   - cover_image_alt nur Pflicht, wenn cover_image_url nicht-leer ist.

export type PublishGateFields = {
  seo_title: string | null | undefined;
  seo_description: string | null | undefined;
  slug: string | null | undefined;
  seo_keyword_primary: string | null | undefined;
  excerpt: string | null | undefined;
  cover_image_url: string | null | undefined;
  cover_image_alt: string | null | undefined;
};

export type PublishGateResult = {
  ok: boolean;
  missing: string[];
};

function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim() === "";
}

export function validatePublishGate(fields: PublishGateFields): PublishGateResult {
  const missing: string[] = [];

  if (isEmpty(fields.seo_title)) missing.push("Meta-Titel");
  if (isEmpty(fields.seo_description)) missing.push("Meta-Beschreibung");
  if (isEmpty(fields.slug)) missing.push("Slug");
  if (isEmpty(fields.seo_keyword_primary)) missing.push("Focus-Keyword");
  if (isEmpty(fields.excerpt)) missing.push("Abstract");

  // ALT ist nur Pflicht, wenn ein Cover-Bild gesetzt ist.
  if (!isEmpty(fields.cover_image_url) && isEmpty(fields.cover_image_alt)) {
    missing.push("Bild-Alt-Text");
  }

  return { ok: missing.length === 0, missing };
}
