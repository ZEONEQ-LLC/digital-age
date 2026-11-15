import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ListArticle } from "@/components/ArticleListRow";
import type { ArticleWithFullRelations } from "@/lib/articleApi";
import { buildRelatedCards, type RelatedCard } from "@/lib/articlePage";
import { PUBLIC_AUTHOR_COLUMNS, getArticlesByAuthor } from "@/lib/authorApi";
import {
  formatDayCH,
  previewLinkState,
  type PreviewLinkState,
} from "@/lib/articles/preview";
import { isCompany } from "@/lib/contentType";
import type { Database } from "@/lib/database.types";
import { getPodcastsByArticleSlug, type PodcastWithRecommender } from "@/lib/podcastApi";
import {
  SHOWCASE_COMPANY_COLUMNS,
  getShowcaseArticles,
  showcaseToListRow,
  type ShowcaseCompany,
} from "@/lib/showcaseApi";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Lesepfade der Beitragsvorschau. Zwei Zugaenge zum selben Beitrag:
//   per Token   Service-Client (ohne Login; der Token ist die Berechtigung)
//   per id      Sitzung der eingeloggten Person, RLS entscheidet (Editor:innen
//               alle, Autor:innen die eigenen)
// Beide liefern dieselbe Form; die Ansicht rendert daraus ArticleView oder
// ShowcaseArticleView.

export type PreviewLinkRow = Database["public"]["Tables"]["article_preview_links"]["Row"];

export type PreviewArticle = ArticleWithFullRelations & { startup: ShowcaseCompany | null };

const PREVIEW_RELATIONS = `*, category:categories(*), author:authors(${PUBLIC_AUTHOR_COLUMNS}), startup:ai_startups(${SHOWCASE_COMPANY_COLUMNS})`;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readArticle(supabase: SupabaseClient<Database>, id: string): Promise<PreviewArticle | null> {
  const { data } = await supabase.from("articles").select(PREVIEW_RELATIONS).eq("id", id).maybeSingle();
  return (data as PreviewArticle | null) ?? null;
}

export type TokenPreview = { link: PreviewLinkRow; state: PreviewLinkState; article: PreviewArticle };

// Vorschau ueber den Link. null = Link gibt es nicht (oder der Beitrag fehlt).
export async function getPreviewByToken(token: string): Promise<TokenPreview | null> {
  const supabase = createServiceClient();
  const { data: link } = await supabase.from("article_preview_links").select("*").eq("token", token).maybeSingle();
  if (!link) return null;
  const article = await readArticle(supabase, link.article_id);
  if (!article) return null;
  return { link, state: previewLinkState(link, Date.now()), article };
}

// Vorschau fuer eingeloggte Autor:innen (Tab «Vorschau» im Editor). Ohne
// Login gibt es nichts, auch keinen publizierten Beitrag.
export async function getPreviewForUser(id: string): Promise<PreviewArticle | null> {
  if (!UUID_RE.test(id)) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return readArticle(supabase, id);
}

// Alles, was die Ansicht neben dem Beitrag braucht. Serialisierbar: geht als
// Props an die Client-Komponente ArticlePreview.
export type PreviewData = {
  article: PreviewArticle;
  company: boolean;
  dateLabel: string;
  linkedPodcasts: PodcastWithRecommender[];
  related: RelatedCard[];
  moreHeading: string;
  moreRows: ListArticle[];
};

// Die Vorschau rendert im Browser, der Beitrag reist als Props mit. Interne
// Arbeitsdaten (Co-Pilot, SEO-Pruefung, Hero-Rezept, Bildvorschlaege) und
// SEO-Felder gehoeren nicht in den Quelltext einer Seite, die an Dritte geht.
function forClient(article: PreviewArticle): PreviewArticle {
  return {
    ...article,
    body_md: article.body_blocks ? null : article.body_md,
    copilot_last_run: null,
    cover_proposals: null,
    cover_recipe: null,
    seo_review: null,
    seo_review_at: null,
    seo_title: null,
    seo_description: null,
    seo_keyword_primary: null,
    seo_keywords_secondary: [],
  };
}

export async function loadPreviewData(full: PreviewArticle): Promise<PreviewData> {
  const article = forClient(full);
  // Ein Unternehmensbeitrag ohne lesbares Unternehmen faellt auf die
  // redaktionelle Ansicht zurueck (im Entwurf moeglich, publiziert nicht).
  const company = isCompany(article) && !!article.startup;
  // Noch nicht erschienen: heutiges Datum, wie beim ersten Publizieren.
  const dateLabel = formatDayCH(article.published_at ?? new Date().toISOString());
  const linkedPodcasts = await getPodcastsByArticleSlug(article.slug);
  if (company && article.startup) {
    const same = await getShowcaseArticles({ startupId: article.startup.id, excludeId: article.id, limit: 3 });
    const more = same.length > 0 ? same : await getShowcaseArticles({ excludeId: article.id, limit: 3 });
    return {
      article,
      company: true,
      dateLabel,
      linkedPodcasts,
      related: [],
      moreHeading: same.length > 0 ? `Weitere Beiträge von ${article.startup.name}` : "Weitere Beiträge im Showcase",
      moreRows: more.map(showcaseToListRow),
    };
  }
  const author = article.author;
  const rows = author ? await getArticlesByAuthor(author.id) : [];
  return {
    article,
    company: false,
    dateLabel,
    linkedPodcasts,
    related: author
      ? buildRelatedCards(rows, { excludeId: article.id, authorName: author.display_name, external: author.role === "external" })
      : [],
    moreHeading: "",
    moreRows: [],
  };
}

// Aktueller Link eines Beitrags fuer den Editor (RLS: nur Editor:innen).
export async function getActivePreviewLink(
  supabase: SupabaseClient<Database>,
  articleId: string,
): Promise<PreviewLinkRow | null> {
  const { data } = await supabase
    .from("article_preview_links")
    .select("*")
    .eq("article_id", articleId)
    .is("revoked_at", null)
    .maybeSingle();
  return data ?? null;
}
