"use client";

export type ListenLinksMap = {
  spotify?: string;
  applePodcasts?: string;
  youtubeMusic?: string;
  audible?: string;
  soundcloud?: string;
};

type Platform = {
  id: keyof ListenLinksMap;
  name: string;
  icon: string;
};

const PLATFORMS: Platform[] = [
  { id: "spotify",       name: "Spotify",         icon: "♫" },
  { id: "applePodcasts", name: "Apple Podcasts",  icon: "◈" },
  { id: "youtubeMusic",  name: "YouTube Music",   icon: "▶" },
  { id: "audible",       name: "Audible",         icon: "▤" },
  { id: "soundcloud",    name: "SoundCloud",      icon: "❯" },
];

type ListenLinksProps = {
  links: ListenLinksMap;
  size?: "sm" | "md";
};

export default function ListenLinks({ links, size = "sm" }: ListenLinksProps) {
  const visible = PLATFORMS.filter((p) => Boolean(links[p.id]));
  if (visible.length === 0) return null;

  return (
    <>
      <style>{`
        .ll {
          display: flex; flex-wrap: wrap; gap: 6px;
          --ll-pad: 6px 10px;
          --ll-fs: 11px;
          --ll-icon: 12px;
          --ll-gap: 5px;
        }
        .ll--md {
          --ll-pad: 9px 14px;
          --ll-fs: 12px;
          --ll-icon: 14px;
          --ll-gap: 6px;
          gap: 8px;
        }
        .ll__btn {
          display: inline-flex;
          align-items: center;
          gap: var(--ll-gap);
          padding: var(--ll-pad);
          border-radius: var(--r-xs);
          background: transparent;
          color: var(--da-text-strong);
          border: 1px solid var(--da-border);
          font-size: var(--ll-fs);
          font-weight: 600;
          text-decoration: none;
          font-family: var(--da-font-body);
          transition: background var(--t-fast), color var(--t-fast), border-color var(--t-fast);
        }
        .ll__btn:hover {
          background: var(--da-green);
          color: var(--da-dark);
          border-color: var(--da-green);
        }
        .ll__icon {
          color: var(--da-green);
          font-size: var(--ll-icon);
          font-weight: 700;
          line-height: 1;
        }
        .ll__btn:hover .ll__icon { color: var(--da-dark); }
      `}</style>
      <div className={`ll${size === "md" ? " ll--md" : ""}`}>
        {visible.map((p) => (
          <a
            key={p.id}
            href={links[p.id]}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ll__btn"
          >
            <span className="ll__icon" aria-hidden>{p.icon}</span>
            {p.name}
          </a>
        ))}
      </div>
    </>
  );
}
