import Image from "next/image";
import Link from "next/link";
import ListenLinks from "./ListenLinks";
import type { Episode } from "@/types/episode";

type EpisodeCardProps = {
  episode: Episode;
};

function formatDateDE(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function EpisodeCard({ episode }: EpisodeCardProps) {
  return (
    <>
      <style>{`
        .ec {
          display: grid; grid-template-columns: 88px 1fr auto;
          gap: 20px; padding: 16px;
          background: transparent;
          border: 1px solid var(--da-border);
          border-radius: var(--r-lg);
          align-items: center;
          transition: background var(--t-fast), border-color var(--t-fast);
        }
        .ec:hover {
          background: var(--da-card);
          border-color: var(--da-green);
        }
        .ec__cover-wrap {
          position: relative;
          width: 88px; height: 88px;
        }
        .ec__cover {
          position: absolute; inset: 0;
          border-radius: var(--r-md);
          overflow: hidden;
        }
        .ec__num {
          position: absolute; top: -6px; left: -6px;
          background: var(--da-dark); border: 1px solid var(--da-border);
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700;
          padding: 2px 6px; border-radius: var(--r-xs);
          z-index: 2;
        }
        .ec__meta { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
        .ec__cat {
          color: var(--da-orange);
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
        }
        .ec__sep { color: var(--da-faint); font-size: 10px; }
        .ec__date, .ec__dur {
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 12px;
        }
        .ec__title {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: 17px; font-weight: 700; line-height: 1.3;
          margin-bottom: 4px;
        }
        .ec__guest { color: var(--da-muted); font-size: 13px; }
        .ec__guest-name { color: var(--da-text-strong); }
        .ec__guest-role { color: var(--da-faint); }

        .ec__right {
          display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
        }
        .ec__notes {
          color: var(--da-muted-soft);
          font-size: 12px; font-weight: 600;
          text-decoration: none;
          transition: color var(--t-fast);
        }
        .ec:hover .ec__notes { color: var(--da-green); }

        @media (max-width: 720px) {
          .ec { grid-template-columns: 72px 1fr; gap: var(--sp-3); padding: var(--sp-3); }
          .ec__cover-wrap { width: 72px; height: 72px; }
          .ec__right { grid-column: 1 / -1; align-items: flex-start; }
          .ec__title { font-size: 15px; }
        }
      `}</style>
      <article className="ec">
        <div className="ec__cover-wrap">
          <span className="ec__num">#{String(episode.number).padStart(2, "0")}</span>
          <div className="ec__cover">
            <Image
              src={episode.cover}
              alt={episode.title}
              fill
              sizes="88px"
              style={{ objectFit: "cover" }}
            />
          </div>
        </div>
        <div>
          <div className="ec__meta">
            <span className="ec__cat">{episode.category}</span>
            <span className="ec__sep">·</span>
            <span className="ec__date">{formatDateDE(episode.publishDate)}</span>
            <span className="ec__sep">·</span>
            <span className="ec__dur">⏱ {episode.duration} min</span>
          </div>
          <h3 className="ec__title">{episode.title}</h3>
          {episode.guest && (
            <p className="ec__guest">
              mit <span className="ec__guest-name">{episode.guest.name}</span>
              <span className="ec__guest-role"> — {episode.guest.role}</span>
            </p>
          )}
        </div>
        <div className="ec__right">
          <ListenLinks links={episode.listenLinks} size="sm" />
          {episode.showNotesUrl && (
            <Link href={episode.showNotesUrl} className="ec__notes">Show Notes →</Link>
          )}
        </div>
      </article>
    </>
  );
}
