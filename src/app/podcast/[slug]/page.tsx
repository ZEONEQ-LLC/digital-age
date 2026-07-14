import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Footer from "@/components/Footer";
import PodcastPlayer from "@/components/PodcastPlayer";
import ShareButtons from "@/components/ShareButtons";
import InternalArticleCard from "@/components/InternalArticleCard";
import ListenLinks, { type ListenLinksMap } from "@/components/ListenLinks";
import {
  getPodcastBySlug,
  getPublishedPodcastSlugs,
  getRelatedArticleCard,
} from "@/lib/podcastApi";
import { getBaseUrl } from "@/lib/siteUrl";
import { buildBreadcrumbJsonLd } from "@/lib/jsonLd";
import { formatDuration } from "@/lib/podcast/format";

type PageProps = { params: Promise<{ slug: string }> };

export const revalidate = 300;

const OG_FALLBACK = "/images/digital-age-og-fallback.jpg";

// Podcast-Sprache -> BCP-47 fuer og:locale/inLanguage/lang-Attribut.
function langCode(language: string): string {
  switch (language) {
    case "en":
      return "en-US";
    case "fr":
      return "fr-CH";
    case "it":
      return "it-CH";
    default:
      return "de-CH";
  }
}

export async function generateStaticParams() {
  try {
    const slugs = await getPublishedPodcastSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

function truncate(s: string, max = 158): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const podcast = await getPodcastBySlug(slug);
  if (!podcast) return { title: "Podcast nicht gefunden — digital age" };

  const baseUrl = getBaseUrl();
  const canonical = `${baseUrl}/podcast/${slug}`;
  const description = truncate(
    podcast.description?.trim() ||
      `Podcast-Empfehlung der digital-age-Redaktion: ${podcast.title}.`,
  );
  const image = podcast.cover_image_url?.trim() || `${baseUrl}${OG_FALLBACK}`;

  return {
    title: `${podcast.title} — digital age Podcast`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: podcast.title,
      description,
      images: [{ url: image }],
      locale: langCode(podcast.language).replace("-", "_"),
      siteName: "digital age",
    },
    twitter: {
      card: "summary_large_image",
      title: podcast.title,
      description,
      images: [image],
    },
  };
}

export default async function PodcastDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const podcast = await getPodcastBySlug(slug);
  if (!podcast) notFound();

  const baseUrl = getBaseUrl();
  const canonical = `${baseUrl}/podcast/${slug}`;
  const isSelfHosted = podcast.source_type === "self_hosted" && !!podcast.audio_url;
  const cover = podcast.cover_image_url?.trim() || "";
  const recommender = podcast.recommended_by;
  const relatedArticle = podcast.related_article_slug
    ? await getRelatedArticleCard(podcast.related_article_slug)
    : null;
  const recommenderHandle = recommender?.handle ?? recommender?.slug ?? null;

  const externalLinks: ListenLinksMap = {
    spotify: podcast.spotify_url ?? undefined,
    applePodcasts: podcast.apple_podcasts_url ?? undefined,
    youtube: podcast.youtube_url ?? undefined,
    soundcloud: podcast.soundcloud_url ?? undefined,
    audible: podcast.audible_url ?? undefined,
  };

  const podcastJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    url: canonical,
    name: podcast.title,
    description: podcast.description ?? undefined,
    inLanguage: langCode(podcast.language),
    image: cover || undefined,
    datePublished: podcast.recommended_at,
    ...(podcast.duration_seconds
      ? { timeRequired: `PT${Math.round(podcast.duration_seconds)}S` }
      : {}),
    ...(isSelfHosted
      ? {
          associatedMedia: {
            "@type": "MediaObject",
            contentUrl: podcast.audio_url,
            encodingFormat: "audio/mpeg",
            ...(podcast.file_size_bytes
              ? { contentSize: String(podcast.file_size_bytes) }
              : {}),
          },
        }
      : {}),
    partOfSeries: { "@type": "PodcastSeries", name: "digital age" },
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: `${baseUrl}/` },
    { name: "Podcasts", url: `${baseUrl}/podcasts` },
    { name: podcast.title },
  ]);

  return (
    <main lang={langCode(podcast.language)} style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: podcastJsonLd }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <style>{`
        .pd-shell { max-width: 860px; margin: 0 auto; padding: 40px var(--sp-8) 64px; }
        .pd-head { display: grid; grid-template-columns: 180px 1fr; gap: 28px; align-items: start; }
        .pd-cover { position: relative; width: 180px; height: 180px; border-radius: var(--r-md); overflow: hidden; background: var(--da-card); flex-shrink: 0; }
        .pd-overline { color: var(--da-green); font-family: var(--da-font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
        .pd-title { color: var(--da-text); font-family: var(--da-font-display); font-size: clamp(24px, 4vw, 36px); font-weight: 700; line-height: 1.2; margin: 10px 0; }
        .pd-lang { font-family: var(--da-font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.1em; padding: 3px 7px; border: 1px solid var(--da-faint); color: var(--da-muted); border-radius: 3px; }
        .pd-desc { color: var(--da-text-strong); font-size: 16px; line-height: 1.7; margin: 28px 0; }
        .pd-listen { margin: 24px 0; }
        .pd-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 24px 0; }
        .pd-foot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; color: var(--da-muted); border-top: 1px solid var(--da-border); padding-top: 16px; margin-top: 28px; }
        .pd-foot a { color: var(--da-text-strong); text-decoration: none; font-weight: 600; }
        .pd-foot a:hover { color: var(--da-green); }
        @media (max-width: 640px) {
          .pd-head { grid-template-columns: 1fr; }
          .pd-cover { width: 140px; height: 140px; }
        }
      `}</style>

      <div className="pd-shell">
        <div style={{ marginBottom: 24 }}>
          <Link href="/podcasts" className="pd-overline" style={{ textDecoration: "none" }}>
            ← Alle Podcasts
          </Link>
        </div>

        <div className="pd-head">
          <div className="pd-cover">
            {cover && (
              <Image src={cover} alt={podcast.title} fill sizes="180px" unoptimized style={{ objectFit: "cover" }} />
            )}
          </div>
          <div>
            <span className="pd-overline">{podcast.podcast_category}</span>
            <h1 className="pd-title">{podcast.title}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="pd-lang">{podcast.language.toUpperCase()}</span>
              {isSelfHosted && podcast.duration_seconds ? (
                <span style={{ color: "var(--da-muted)", fontSize: 13, fontFamily: "var(--da-font-mono)" }}>
                  {formatDuration(podcast.duration_seconds)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {isSelfHosted && podcast.audio_url ? (
          <div className="pd-listen">
            <PodcastPlayer
              src={podcast.audio_url}
              title={podcast.title}
              initialDuration={podcast.duration_seconds}
            />
          </div>
        ) : (
          <div className="pd-listen">
            <ListenLinks links={externalLinks} size="md" />
          </div>
        )}

        <div className="pd-actions">
          <ShareButtons title={podcast.title} url={canonical} />
        </div>

        {podcast.description && <p className="pd-desc">{podcast.description}</p>}

        {relatedArticle && (
          <InternalArticleCard
            slug={relatedArticle.slug}
            title={relatedArticle.title}
            coverUrl={relatedArticle.coverUrl}
            excerpt={relatedArticle.excerpt}
            margin="8px 0 0"
          />
        )}

        <div className="pd-foot">
          {recommender && (
            <span>
              Empfohlen von{" "}
              {recommenderHandle ? (
                <Link href={`/autor/${recommenderHandle}`}>{recommender.display_name}</Link>
              ) : (
                <strong style={{ color: "var(--da-text-strong)" }}>{recommender.display_name}</strong>
              )}
            </span>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
