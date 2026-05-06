"use client";

export type Hosting = "CH" | "EU" | "US";

export type Platform = {
  id: number;
  name: string;
  category: string;
  tagline: string;
  hosting: Hosting;
  pricing: string;
  featured: boolean;
  link: string;
};

export const hostingColor = (h: Hosting): string =>
  h === "CH" ? "var(--da-green)" : h === "EU" ? "var(--da-orange)" : "var(--da-muted-soft)";

export const hostingLabel = (h: Hosting): string =>
  h === "CH" ? "🇨🇭 Schweiz" : h === "EU" ? "🇪🇺 EU" : "🌐 USA";

export const catColors: Record<string, string> = {
  LLM: "var(--da-green)",
  Image: "var(--da-orange)",
  Video: "var(--da-purple)",
  Audio: "var(--da-orange)",
  Code: "var(--da-green)",
  Search: "var(--da-purple)",
};

type PlatformCardProps = {
  platform: Platform;
  inCompare: boolean;
  onToggleCompare: (id: number) => void;
  accent?: string;
};

export default function PlatformCard({ platform, inCompare, onToggleCompare, accent = "var(--da-green)" }: PlatformCardProps) {
  const cc = catColors[platform.category] ?? accent;
  const hc = hostingColor(platform.hosting);

  return (
    <>
      <style>{`
        .pc {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: var(--r-lg);
          padding: var(--sp-6);
          position: relative;
          transition: border-color var(--t-base), transform var(--t-base);
        }
        .pc--compare { border-color: var(--accent, var(--da-green)); }
        .pc:hover { border-color: var(--cc, var(--da-green)); transform: translateY(-2px); }
        .pc__top {
          position: absolute; top: 12px; right: 12px;
          background: var(--accent, var(--da-green));
          color: var(--da-dark);
          font-family: var(--da-font-mono);
          font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 3px 8px; border-radius: var(--r-xs);
        }
        .pc__head { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: 14px; }
        .pc__logo {
          width: 44px; height: 44px; border-radius: var(--r-lg);
          background: var(--da-dark); border: 1px solid var(--da-border);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .pc__logo span {
          color: var(--cc, var(--da-green)); font-size: 16px; font-weight: 700;
          font-family: var(--da-font-display);
        }
        .pc__name { color: var(--da-text); font-size: 17px; font-weight: 700; }
        .pc__cat {
          color: var(--cc, var(--da-green));
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
        }
        .pc__tagline { color: var(--da-muted); font-size: 13px; line-height: 1.55; margin-bottom: 18px; min-height: 38px; }
        .pc__badges { display: flex; gap: var(--sp-2); flex-wrap: wrap; margin-bottom: var(--sp-4); }
        .pc__badge {
          background: var(--da-dark); fontSize: 11px; padding: 3px 10px; border-radius: var(--r-sm);
          font-size: 11px; white-space: nowrap;
        }
        .pc__badge--host { color: var(--hc); border: 1px solid var(--hc); font-weight: 600; }
        .pc__badge--price {
          color: var(--da-muted); border: 1px solid var(--da-border);
          font-family: var(--da-font-mono);
        }
        .pc__actions { display: flex; gap: var(--sp-2); align-items: center; }
        .pc__open {
          flex: 1; text-align: center; background: var(--accent, var(--da-green));
          color: var(--da-dark); font-size: 12px; font-weight: 700;
          padding: 8px 0; border-radius: var(--r-sm); text-decoration: none;
        }
        .pc__cmp {
          background: var(--da-dark);
          color: var(--da-faint);
          border: 1px solid var(--da-border);
          border-radius: var(--r-sm); padding: 8px 10px;
          font-size: 11px; font-weight: 600; cursor: pointer;
          white-space: nowrap;
          transition: all var(--t-fast);
        }
        .pc__cmp--on {
          background: rgba(50,255,126,0.13);
          color: var(--accent, var(--da-green));
          border-color: var(--accent, var(--da-green));
        }
      `}</style>
      <div
        className={`pc${inCompare ? " pc--compare" : ""}`}
        style={{ ["--cc" as string]: cc, ["--hc" as string]: hc, ["--accent" as string]: accent }}
      >
        {platform.featured && <span className="pc__top">Top Pick</span>}
        <div className="pc__head">
          <div className="pc__logo"><span>{platform.name[0]}</span></div>
          <div>
            <h3 className="pc__name">{platform.name}</h3>
            <span className="pc__cat">{platform.category}</span>
          </div>
        </div>
        <p className="pc__tagline">{platform.tagline}</p>
        <div className="pc__badges">
          <span className="pc__badge pc__badge--host">{hostingLabel(platform.hosting)}</span>
          <span className="pc__badge pc__badge--price">{platform.pricing}</span>
        </div>
        <div className="pc__actions">
          <a className="pc__open" href={platform.link} target="_blank" rel="noopener noreferrer">Öffnen →</a>
          <button
            type="button"
            className={`pc__cmp${inCompare ? " pc__cmp--on" : ""}`}
            onClick={(e) => { e.stopPropagation(); onToggleCompare(platform.id); }}
          >
            {inCompare ? "✓ Vergleich" : "+ Vergleich"}
          </button>
        </div>
      </div>
    </>
  );
}
