import Image from "next/image";
import Link from "next/link";
import ListenLinks from "./ListenLinks";
import type { Episode } from "@/types/episode";

type EpisodeFeaturedProps = {
  episode: Episode;
};

function formatDateDE(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function EpisodeFeatured({ episode }: EpisodeFeaturedProps) {
  return (
    <>
      <style>{`
        .ef {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 12px;
          padding: 28px;
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 32px;
          align-items: center;
        }
        .ef__cover-wrap {
          position: relative;
          width: 260px;
          aspect-ratio: 1 / 1;
          border-radius: 10px;
          overflow: hidden;
        }
        .ef__badge {
          position: absolute; top: 12px; left: 12px;
          background: var(--da-green); color: var(--da-dark);
          padding: 5px 10px; border-radius: var(--r-xs);
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          z-index: 2;
        }
        .ef__meta {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 14px; flex-wrap: wrap;
        }
        .ef__num {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-size: 12px; font-weight: 700;
        }
        .ef__sep { color: var(--da-faint); }
        .ef__date, .ef__dur { color: var(--da-muted); font-size: 12px; }
        .ef__cat {
          color: var(--da-orange);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
        }
        .ef__title {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: 28px; font-weight: 700; line-height: 1.15;
          letter-spacing: -0.01em;
          margin-bottom: 12px;
        }
        .ef__summary { color: var(--da-text-strong); font-size: 14px; line-height: 1.6; margin-bottom: 16px; }
        .ef__guest { color: var(--da-muted); font-size: 13px; margin-bottom: 22px; }
        .ef__guest strong { color: var(--da-text); font-weight: 600; }
        .ef__guest-role { color: var(--da-faint); }
        .ef__listen-label {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 10px;
        }
        .ef__cta-row {
          display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
        }
        .ef__notes {
          background: transparent; color: var(--da-text);
          border: 1px solid var(--da-border); border-radius: var(--r-sm);
          padding: 9px 14px; font-size: 12px; font-weight: 600;
          text-decoration: none;
          margin-left: 4px;
          transition: border-color var(--t-fast), color var(--t-fast);
        }
        .ef__notes:hover { color: var(--da-green); border-color: var(--da-green); }

        @media (max-width: 900px) {
          .ef { grid-template-columns: 1fr; gap: var(--sp-6); padding: var(--sp-6); }
          .ef__cover-wrap { width: 100%; max-width: 320px; margin: 0 auto; }
          .ef__title { font-size: 22px; }
        }
      `}</style>
      <div className="ef">
        <div className="ef__cover-wrap">
          <span className="ef__badge">Neueste Folge</span>
          <Image
            src={episode.cover}
            alt={episode.title}
            fill
            sizes="(max-width: 900px) 320px, 260px"
            style={{ objectFit: "cover" }}
            priority
          />
        </div>
        <div>
          <div className="ef__meta">
            <span className="ef__num">#{String(episode.number).padStart(2, "0")}</span>
            <span className="ef__sep">·</span>
            <span className="ef__date">{formatDateDE(episode.publishDate)}</span>
            <span className="ef__sep">·</span>
            <span className="ef__dur">⏱ {episode.duration} min</span>
            <span className="ef__sep">·</span>
            <span className="ef__cat">{episode.category}</span>
          </div>
          <h2 className="ef__title">{episode.title}</h2>
          <p className="ef__summary">{episode.description}</p>
          {episode.guest && (
            <p className="ef__guest">
              <strong>mit {episode.guest.name}</strong>
              <span className="ef__guest-role"> — {episode.guest.role}</span>
            </p>
          )}
          <p className="ef__listen-label">Anhören auf</p>
          <div className="ef__cta-row">
            <ListenLinks links={episode.listenLinks} size="md" />
            {episode.showNotesUrl && (
              <Link href={episode.showNotesUrl} className="ef__notes">Show Notes →</Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
