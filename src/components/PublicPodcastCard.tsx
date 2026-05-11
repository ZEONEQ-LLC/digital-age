import Image from "next/image";
import Link from "next/link";
import ListenLinks from "./ListenLinks";
import type { PodcastCardVM } from "@/lib/mappers/podcastMappers";

type Props = {
  vm: PodcastCardVM;
};

export default function PublicPodcastCard({ vm }: Props) {
  const links = {
    spotify: vm.spotifyUrl ?? undefined,
    applePodcasts: vm.applePodcastsUrl ?? undefined,
  };

  return (
    <>
      <style>{`
        .pdc {
          display: grid; grid-template-columns: 120px 1fr;
          gap: 20px; padding: 18px;
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: var(--r-lg);
          transition: border-color var(--t-fast);
        }
        .pdc:hover { border-color: var(--da-green); }
        .pdc__cover {
          position: relative;
          width: 120px; height: 120px;
          border-radius: var(--r-md);
          overflow: hidden;
          flex-shrink: 0;
          background: var(--da-dark);
        }
        .pdc__cover-img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
        }
        .pdc__head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: var(--sp-3); margin-bottom: 8px;
        }
        .pdc__cat {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
        }
        .pdc__lang {
          font-family: var(--da-font-mono);
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.12em;
          padding: 3px 7px;
          border: 1px solid var(--da-faint);
          color: var(--da-muted);
          border-radius: 3px;
          flex-shrink: 0;
          line-height: 1;
        }
        .pdc__title {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: 18px; font-weight: 700; line-height: 1.3;
          margin-bottom: 8px;
        }
        .pdc__desc {
          color: var(--da-text-strong);
          font-size: 14px; line-height: 1.55;
          margin-bottom: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .pdc__listen { margin-bottom: 12px; }
        .pdc__foot {
          display: flex; align-items: center; gap: 12px;
          font-size: 12px; flex-wrap: wrap;
          padding-top: 10px;
          border-top: 1px solid var(--da-border);
        }
        .pdc__by { color: var(--da-muted); }
        .pdc__by-name {
          color: var(--da-text-strong); font-weight: 600;
          text-decoration: none;
        }
        .pdc__by-name:hover { color: var(--da-green); }
        .pdc__date {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 11px;
        }
        @media (max-width: 640px) {
          .pdc { grid-template-columns: 1fr; gap: 14px; padding: 14px; }
          .pdc__cover { width: 100%; height: 200px; }
        }
      `}</style>
      <article className="pdc">
        <div className="pdc__cover">
          {vm.cover && (
            <Image
              src={vm.cover}
              alt={vm.title}
              width={240}
              height={240}
              className="pdc__cover-img"
              unoptimized
            />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="pdc__head">
            <span className="pdc__cat">{vm.category}</span>
            <span className="pdc__lang" title={vm.langLabel} aria-label={`Sprache: ${vm.langLabel}`}>
              {vm.langShort}
            </span>
          </div>
          <h3 className="pdc__title">{vm.title}</h3>
          <p className="pdc__desc">{vm.description}</p>
          <div className="pdc__listen">
            <ListenLinks links={links} size="sm" />
          </div>
          <div className="pdc__foot">
            {vm.recommender && (
              <span className="pdc__by">
                Empfohlen von{" "}
                {vm.recommender.handle ? (
                  <Link href={`/autor/${vm.recommender.handle}`} className="pdc__by-name">
                    {vm.recommender.name}
                  </Link>
                ) : (
                  <span className="pdc__by-name">{vm.recommender.name}</span>
                )}
              </span>
            )}
            <span style={{ color: "var(--da-faint)" }}>·</span>
            <span className="pdc__date">{vm.recommendedAtFormatted}</span>
          </div>
        </div>
      </article>
    </>
  );
}
