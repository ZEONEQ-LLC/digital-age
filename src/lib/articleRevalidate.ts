import { revalidatePath } from "next/cache";

import { SHOWCASE_PATH, articlePath, isCompany } from "@/lib/contentType";

// Oeffentliche Seite eines publizierten Artikels sofort neu bauen statt erst
// nach dem ISR-Fenster. Unternehmensbeitraege stehen unter /showcase/<slug>
// und zusaetzlich in der Uebersicht /showcase. Kein "use server": Helfer fuer
// Server Actions.
export function revalidateArticlePage(
  article: { slug: string; content_type?: string | null },
  previousSlug?: string | null,
): void {
  revalidatePath(articlePath(article));
  if (previousSlug && previousSlug !== article.slug) {
    revalidatePath(articlePath({ slug: previousSlug, content_type: article.content_type }));
  }
  if (isCompany(article)) revalidatePath(SHOWCASE_PATH);
}

// Wechsel der Einordnung eines publizierten Artikels: Er verlaesst die eine
// Welt und erscheint in der anderen. Beide Adressen (eine leitet danach
// weiter), Startseite, Rubriken und die Showcase-Uebersicht neu bauen.
export function revalidateContentTypeChange(slug: string, startupSlugs: (string | null | undefined)[] = []): void {
  revalidatePath("/");
  revalidatePath(`/artikel/${slug}`);
  revalidatePath(`${SHOWCASE_PATH}/${slug}`);
  revalidatePath(SHOWCASE_PATH);
  revalidatePath("/ki-im-business");
  revalidatePath("/future-tech");
  for (const s of startupSlugs) if (s) revalidatePath(`/swiss-ai/${s}`);
}
