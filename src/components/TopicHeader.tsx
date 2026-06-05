import Image from "next/image";
import Link from "next/link";
import { getAccentVar, type Accent } from "@/lib/topicAccent";

// Server-Komponente. Wird auf den Topic-Hub-Pages
// (/ki-im-business, /future-tech) VOR der Suspense-Boundary gerendert,
// die TopicListing (Client + useSearchParams) umschliesst. Damit landet
// die H1 zuverlaessig im SSR-HTML — vorher sass der Header in
// TopicListing innerhalb der Suspense-Boundary und wurde im SSR durch den
// `fallback={null}` ersetzt (H1 fehlte komplett im rohen HTML).
//
// Markup + Styling sind 1:1 aus dem alten tl-header-Block in
// TopicListing.tsx uebernommen — keine Design-Aenderung. Einzige
// strukturelle Aenderung: der Sidebar-Toggle ist hier raus und lebt jetzt
// in der .tl-feed-head innerhalb TopicListing (steuert weiter
// sidebarOpen-State).

export type TopicHeaderProps = {
  topicLabel: string;
  lead: string;
  articleCount: number;
  bgImages: string[];
  accentColor: Accent;
};

export default function TopicHeader({
  topicLabel,
  lead,
  articleCount,
  bgImages,
  accentColor,
}: TopicHeaderProps) {
  const accent = getAccentVar(accentColor);
  return (
    <>
      <style>{`
        .tl-header { position: relative; border-bottom: 1px solid var(--da-border); overflow: hidden; }
        .tl-header__bg { position: absolute; inset: 0; display: flex; opacity: 0.06; pointer-events: none; }
        .tl-header__bg-cell { flex: 1; position: relative; }
        .tl-header__bg-cell > img { object-fit: cover; }
        .tl-header__overlay {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(to right, var(--da-dark) 0%, rgba(28,28,30,0.85) 50%, var(--da-dark) 100%);
        }
        .tl-header__inner { position: relative; max-width: var(--max-content); margin: 0 auto; padding: 48px var(--sp-8) 44px; }
        .tl-breadcrumb { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-5); flex-wrap: wrap; }
        .tl-breadcrumb a, .tl-breadcrumb span { font-size: var(--fs-meta); }
        .tl-breadcrumb__home { color: var(--da-muted); }
        .tl-breadcrumb__sep { color: var(--da-faint); }
        .tl-breadcrumb__topic { font-weight: 600; }
        .tl-breadcrumb__count { color: var(--da-muted-soft); font-family: var(--da-font-mono); white-space: nowrap; }
        .tl-header__row {
          display: flex; align-items: flex-end; justify-content: space-between;
          flex-wrap: wrap; gap: var(--sp-5);
        }
        .tl-header__title-block { display: flex; align-items: center; gap: var(--sp-4); }
        .tl-header__bar { width: 4px; height: 56px; border-radius: 2px; flex-shrink: 0; }
        .tl-header__h1 {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: clamp(32px, 4vw, 48px);
          font-weight: 700;
          line-height: 1.0;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .tl-header__lead { color: var(--da-muted); font-size: 15px; line-height: 1.6; max-width: 500px; margin-top: 10px; }

        @media (max-width: 640px) {
          .tl-header__inner { padding: var(--sp-10) var(--sp-5) var(--sp-8); }
          .tl-header__row { align-items: flex-start; }
        }
      `}</style>

      <section className="tl-header">
        <div className="tl-header__bg" aria-hidden>
          {bgImages.slice(0, 5).map((src, i) => (
            <div key={i} className="tl-header__bg-cell">
              <Image src={src} alt="" fill sizes="20vw" style={{ objectFit: "cover" }} />
            </div>
          ))}
        </div>
        <div className="tl-header__overlay" aria-hidden />
        <div className="tl-header__inner">
          <nav aria-label="Breadcrumb" className="tl-breadcrumb">
            <Link href="/" className="tl-breadcrumb__home">Home</Link>
            <span className="tl-breadcrumb__sep">/</span>
            <span className="tl-breadcrumb__topic" style={{ color: accent }}>{topicLabel}</span>
            <span className="tl-breadcrumb__sep">·</span>
            <span className="tl-breadcrumb__count">{articleCount} Artikel</span>
          </nav>
          <div className="tl-header__row">
            <div className="tl-header__title-block">
              <div className="tl-header__bar" style={{ background: accent }} />
              <div>
                <h1 className="tl-header__h1">{topicLabel}</h1>
                <p className="tl-header__lead">{lead}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
