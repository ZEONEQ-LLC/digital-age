// Einordnung eines Artikels: redaktionell oder Unternehmensbeitrag (Showcase).
// Reines Modul ohne "server-only": Server Actions, Editor und Tests nutzen es
// gemeinsam. Die DB sichert dieselben Regeln ab (Migration
// 20261114140000_showcase_datenmodell.sql: CHECKs und Trigger
// articles_guard_content_type).

export const CONTENT_TYPES = ["editorial", "company"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

// Unternehmensbeitraege liegen immer in dieser Kategorie. Sie steht nicht in
// der Navigation und ist im Editor nicht waehlbar.
export const SHOWCASE_CATEGORY_SLUG = "showcase";

// S2a: Das Datenmodell steht, die gekennzeichneten Seiten (/showcase/<slug>)
// noch nicht. Bis S2b darf deshalb kein Unternehmensbeitrag live gehen. Sonst
// stuende er ohne Kennzeichnung unter /artikel/<slug>.
export const SHOWCASE_PUBLISHING_ENABLED = false;

export function isContentType(v: unknown): v is ContentType {
  return typeof v === "string" && (CONTENT_TYPES as readonly string[]).includes(v);
}

export function isCompany(a: { content_type?: string | null }): boolean {
  return a.content_type === "company";
}

// Kennzeichnung fuer Leser:innen und Admin. Bezahlt heisst «Publireportage»,
// unbezahlt «Unternehmensbeitrag»; redaktionelle Artikel tragen keine.
export function contentTypeLabel(a: { content_type?: string | null; is_paid?: boolean | null }): string | null {
  if (!isCompany(a)) return null;
  return a.is_paid ? "Publireportage" : "Unternehmensbeitrag";
}

// Filter fuer alle redaktionellen Listen (Startseite, Tags, Autorenprofil,
// Newsletter, Sitemap, Suche). Rubrikseiten filtern ueber die Kategorie und
// brauchen ihn nicht.
type EqQuery = { eq(column: "content_type", value: string): unknown };
export function editorialOnly<Q extends EqQuery>(query: Q): Q {
  return query.eq("content_type", "editorial") as Q;
}

export type ContentTypeState = {
  content_type: ContentType;
  startup_id: string | null;
  is_paid: boolean;
};

export type ContentTypeInput = {
  content_type: ContentType;
  startup_id: string | null;
  is_paid: boolean;
  // Rubrik fuer den Wechsel zurueck auf redaktionell (nie «showcase»).
  category_id: string | null;
};

export type ContentTypeContext = {
  // Aktueller Stand des Artikels.
  status: string;
  category_id: string;
  // Kategorien: id der Showcase-Kategorie und ids aller redaktionellen.
  showcaseCategoryId: string | null;
  editorialCategoryIds: readonly string[];
  // Ist das gewaehlte Unternehmen im Verzeichnis sichtbar (published/featured)?
  startupListed: boolean;
  publishingEnabled: boolean;
};

export type ContentTypePlan =
  | { ok: false; message: string }
  | {
      ok: true;
      patch: ContentTypeState & { category_id: string; is_featured?: false; is_hero?: false };
    };

// Prueft eine gewuenschte Einordnung und liefert das DB-Patch dazu.
export function planContentTypeChange(input: ContentTypeInput, ctx: ContentTypeContext): ContentTypePlan {
  if (!isContentType(input.content_type)) return { ok: false, message: "Ungültiger Inhaltstyp." };

  if (input.content_type === "company") {
    if (!ctx.showcaseCategoryId) {
      return { ok: false, message: "Die Kategorie «Showcase» fehlt in der Datenbank." };
    }
    if (!input.startup_id) return { ok: false, message: "Bitte ein Unternehmen aus dem Verzeichnis wählen." };
    if (!ctx.startupListed) {
      return { ok: false, message: "Das Unternehmen ist nicht im Verzeichnis publiziert." };
    }
    if (!ctx.publishingEnabled && ctx.status === "published") {
      return {
        ok: false,
        message:
          "Publizierte Artikel lassen sich erst umstellen, wenn die Showcase-Seiten live sind. Bis dahin stünde der Beitrag ohne Kennzeichnung online.",
      };
    }
    return {
      ok: true,
      patch: {
        content_type: "company",
        startup_id: input.startup_id,
        is_paid: input.is_paid === true,
        category_id: ctx.showcaseCategoryId,
        // Aufmacher und Featured sind redaktionelle Plaetze.
        is_featured: false,
        is_hero: false,
      },
    };
  }

  // Redaktionell: kein Unternehmen, nicht bezahlt, eine redaktionelle Rubrik.
  const category =
    input.category_id && ctx.editorialCategoryIds.includes(input.category_id)
      ? input.category_id
      : ctx.editorialCategoryIds.includes(ctx.category_id)
        ? ctx.category_id
        : null;
  if (!category) return { ok: false, message: "Bitte eine Rubrik für den redaktionellen Artikel wählen." };
  return {
    ok: true,
    patch: { content_type: "editorial", startup_id: null, is_paid: false, category_id: category },
  };
}

export type CompanyPublishFields = {
  content_type?: string | null;
  startup_id?: string | null;
  categorySlug?: string | null;
  startupListed: boolean;
};

// Gruende, die das Publizieren eines Unternehmensbeitrags verhindern. Gilt bei
// jedem Publizieren, nicht nur beim ersten. Redaktionelle Artikel: immer leer.
export function companyPublishBlockers(a: CompanyPublishFields, publishingEnabled: boolean): string[] {
  if (!isCompany(a)) return [];
  const out: string[] = [];
  if (!publishingEnabled) {
    out.push("Unternehmensbeiträge können erst publiziert werden, wenn die Showcase-Seiten live sind.");
    return out;
  }
  if (!a.startup_id) out.push("Dem Beitrag ist kein Unternehmen zugeordnet.");
  else if (!a.startupListed) out.push("Das Unternehmen ist nicht im Verzeichnis publiziert.");
  if (a.categorySlug !== SHOWCASE_CATEGORY_SLUG) out.push("Der Beitrag liegt nicht in der Kategorie «Showcase».");
  return out;
}

// Meldungen fuer die Fehler aus dem DB-Trigger articles_guard_content_type.
export function contentTypeDbError(e: unknown): string | null {
  const msg = typeof e === "object" && e !== null && "message" in e ? String((e as { message: unknown }).message) : "";
  if (msg.includes("content_type_editor_only")) {
    return "Nur die Redaktion kann die Einordnung eines Artikels ändern.";
  }
  if (msg.includes("showcase_category_reserved")) {
    return "Die Kategorie «Showcase» ist Unternehmensbeiträgen vorbehalten. Bitte eine andere Rubrik wählen.";
  }
  if (msg.includes("articles_company_not_featured")) {
    return "Unternehmensbeiträge können nicht Featured oder Hero sein.";
  }
  if (msg.includes("articles_startup_id_fkey")) {
    return "Zu diesem Unternehmen gibt es Beiträge im Showcase. Bitte zuerst die Beiträge umstellen oder löschen.";
  }
  return null;
}
