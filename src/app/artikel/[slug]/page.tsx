import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import ListenButton from "@/components/ListenButton";
import ShareButtons from "@/components/ShareButtons";
import AuthorBox from "@/components/AuthorBox";
import ArticleBody from "@/components/ArticleBody";
import ArticleSection from "@/components/ArticleSection";
import BlockReader from "@/components/BlockReader";
import NewsletterSignup from "@/components/NewsletterSignup";
import ReadingProgress from "@/components/ReadingProgress";
import TableOfContents, { type TocItem } from "@/components/TableOfContents";
import ExternalBadge from "@/components/ExternalBadge";
import { getArticleBySlug, type ArticleWithFullRelations } from "@/lib/articleApi";
import { getArticlesByAuthor } from "@/lib/authorApi";
import { markdownToBlocks } from "@/lib/markdownBlocks";
import type { Block } from "@/types/blocks";

type PageProps = { params: Promise<{ slug: string }> };

function formatDateDE(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function deriveTocItems(blocks: Block[]): TocItem[] {
  const isHeadingBlock = (b: Block): b is Extract<Block, { type: "heading" }> =>
    b.type === "heading" && (b.level === 2 || b.level === 3);
  return blocks
    .filter(isHeadingBlock)
    .map((b) => ({ id: b.id, label: b.content, level: b.level }));
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article || !article.author) notFound();
  return <ArticleView article={article} />;
}

function ArticleView({ article }: { article: ArticleWithFullRelations }) {
  const author = article.author!;
  const isExternal = author.role === "external";
  const subcategory = article.subcategory ?? article.category?.name_de ?? "";
  const dateLabel = formatDateDE(article.published_at);
  const url = `/artikel/${article.slug}`;
  const ttsText = `${article.title}. ${article.excerpt ?? ""}`.trim();
  const blocks = markdownToBlocks(article.body_md ?? "");
  const tocItems = deriveTocItems(blocks);
  const authorHandle = author.handle ?? author.slug;

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <ReadingProgress />
      <NewsTicker />

      <header style={{ maxWidth: "860px", margin: "0 auto", padding: "52px var(--sp-8) 28px" }}>
        <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--sp-6)" }}>
          <Link href="/" style={{ color: "var(--da-muted)", fontSize: "var(--fs-body-sm)" }}>Home</Link>
          <span style={{ color: "var(--da-faint)", fontSize: "var(--fs-body-sm)" }}>/</span>
          <span
            style={{
              color: "var(--da-green)",
              fontFamily: "var(--da-font-mono)",
              fontSize: "var(--fs-body-sm)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {subcategory}
          </span>
          {isExternal && (
            <>
              <span style={{ color: "var(--da-faint)", fontSize: "var(--fs-body-sm)" }}>·</span>
              <ExternalBadge size="xs" />
            </>
          )}
        </nav>

        <h1
          style={{
            color: "var(--da-text)",
            fontFamily: "var(--da-font-display)",
            fontSize: "clamp(30px, 4vw, 48px)",
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: "var(--sp-6)",
          }}
        >
          {article.title}
        </h1>

        {article.excerpt && (
          <p style={{ color: "#c0c0c0", fontSize: "20px", lineHeight: 1.65, marginBottom: "36px", fontWeight: 300 }}>
            {article.excerpt}
          </p>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--sp-4)",
            paddingBottom: "28px",
            borderBottom: "1px solid var(--da-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                position: "relative",
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: "50%",
                overflow: "hidden",
                border: `2px solid ${isExternal ? "var(--da-orange)" : "var(--da-green)"}`,
              }}
            >
              {author.avatar_url && (
                <Image src={author.avatar_url} alt={author.display_name} fill sizes="44px" style={{ objectFit: "cover" }} unoptimized />
              )}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Link href={`/autor/${authorHandle}`} style={{ color: "var(--da-text)", fontSize: "var(--fs-body)", fontWeight: 600 }}>
                  {author.display_name}
                </Link>
                {isExternal && <ExternalBadge size="xs" />}
              </div>
              <p style={{ color: "var(--da-muted)", fontFamily: "var(--da-font-mono)", fontSize: "var(--fs-body-sm)" }}>
                {dateLabel} · {article.reading_minutes ?? 0} min Lesezeit
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)", flexWrap: "wrap" }}>
            <ListenButton text={ttsText} />
            <ShareButtons title={article.title} url={url} />
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 var(--sp-8) var(--sp-12)" }}>
        <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden" }}>
          {article.cover_image_url && (
            <Image
              src={article.cover_image_url}
              alt={article.title}
              width={1600}
              height={900}
              sizes="(max-width: 1100px) 100vw, 1100px"
              priority
              unoptimized
              style={{ width: "100%", height: "auto", maxHeight: "520px", objectFit: "cover", display: "block" }}
            />
          )}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(28,28,30,0.3) 0%, transparent 40%)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      <ArticleBodyGrid hasToc={tocItems.length > 0}>
        <article>
          <ArticleBody>
            <BlockReader blocks={blocks} />
          </ArticleBody>

          <div style={{ marginTop: "var(--sp-12)", paddingTop: "var(--sp-8)", borderTop: "1px solid var(--da-card)" }}>
            <ShareButtons title={article.title} url={url} />
          </div>

          <AuthorBox
            name={author.display_name}
            slug={authorHandle}
            avatar={author.avatar_url ?? ""}
            bio={author.bio ?? ""}
            role={author.job_title ?? undefined}
            external={isExternal}
          />
          <NewsletterSignup variant="inline" />
        </article>

        {tocItems.length > 0 && (
          <aside style={{ position: "sticky", top: "calc(var(--nav-h) + 24px)", alignSelf: "start" }}>
            <TableOfContents items={tocItems} />
          </aside>
        )}
      </ArticleBodyGrid>

      <RelatedFromAuthor
        authorId={author.id}
        authorDisplayName={author.display_name}
        authorHandle={authorHandle}
        isExternal={isExternal}
        excludeArticleId={article.id}
      />

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}

async function RelatedFromAuthor({
  authorId,
  authorDisplayName,
  authorHandle,
  isExternal,
  excludeArticleId,
}: {
  authorId: string;
  authorDisplayName: string;
  authorHandle: string;
  isExternal: boolean;
  excludeArticleId: string;
}) {
  const relatedRows = await getArticlesByAuthor(authorId);
  const related = relatedRows
    .filter((a) => a.id !== excludeArticleId)
    .slice(0, 3)
    .map((a) => ({
      category: a.subcategory ?? a.category?.name_de ?? "",
      title: a.title,
      author: authorDisplayName,
      date: formatDateDE(a.published_at),
      image: a.cover_image_url ?? "",
      href: `/artikel/${a.slug}`,
      external: isExternal,
    }));

  if (related.length === 0) return null;

  return (
    <ArticleSection title="Mehr von diesem Autor" href={`/autor/${authorHandle}`} articles={related} />
  );
}

function ArticleBodyGrid({ children, hasToc }: { children: React.ReactNode; hasToc: boolean }) {
  return (
    <>
      <style>{`
        .article-grid {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 var(--sp-8);
          display: grid;
          grid-template-columns: ${hasToc ? "1fr 220px" : "minmax(0, 860px)"};
          ${hasToc ? "gap: var(--sp-16);" : "justify-content: center;"}
          align-items: start;
        }
        @media (max-width: 1024px) {
          .article-grid { grid-template-columns: 1fr; gap: var(--sp-8); }
          .article-grid > aside { display: none; }
        }
      `}</style>
      <div className="article-grid">{children}</div>
    </>
  );
}
