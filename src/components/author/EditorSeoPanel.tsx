"use client";

import AuthorCard from "./AuthorCard";
import MonoCaption from "./MonoCaption";

export type SeoState = {
  title: string;
  description: string;
  slug: string;
  keyword: string;
};

type EditorSeoPanelProps = {
  seo: SeoState;
  onChange: (next: SeoState) => void;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--da-dark)",
  color: "var(--da-text)",
  border: "1px solid var(--da-border)",
  borderRadius: 4,
  padding: "10px 13px",
  fontSize: 13,
  fontFamily: "inherit",
};

const aiBtnStyle: React.CSSProperties = {
  background: "rgba(220,214,247,0.1)",
  color: "var(--da-purple)",
  border: "1px solid var(--da-purple)",
  borderRadius: 3,
  padding: "5px 10px",
  fontSize: 11,
  fontWeight: 600,
  cursor: "not-allowed",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  opacity: 0.6,
  fontFamily: "inherit",
};

const AI_TOOLTIP = "AI-Features kommen in einer späteren Phase";

function AiButton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <button
      type="button"
      disabled
      title={AI_TOOLTIP}
      aria-label={ariaLabel}
      style={aiBtnStyle}
    >
      ✨ AI
    </button>
  );
}

function labelRow(label: string, len: number, ok: boolean, ranges?: string) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
      <span style={{ color: "var(--da-text-strong)", fontSize: 13, fontWeight: 600 }}>{label}</span>
      <span
        style={{
          color: ok ? "var(--da-green)" : len > 0 ? "var(--da-orange)" : "var(--da-faint)",
          fontSize: 11,
          fontFamily: "var(--da-font-mono)",
        }}
      >
        {len}
        {ranges && ` · ideal ${ranges}`}
      </span>
    </div>
  );
}

export default function EditorSeoPanel({ seo, onChange }: EditorSeoPanelProps) {
  const titleLen = seo.title.length;
  const descLen = seo.description.length;
  const titleOk = titleLen >= 50 && titleLen <= 60;
  const descOk = descLen >= 140 && descLen <= 160;
  const slugOk = seo.slug.length >= 3 && seo.slug.length <= 60;
  const keywordSet = !!seo.keyword.trim();

  let score = 0;
  if (titleOk) score += 25;
  else if (titleLen >= 30) score += 15;
  if (descOk) score += 25;
  else if (descLen >= 100) score += 15;
  if (slugOk) score += 20;
  if (keywordSet) score += 15;
  if (keywordSet && seo.title.toLowerCase().includes(seo.keyword.toLowerCase())) score += 15;
  score = Math.min(100, score);

  const scoreColor =
    score >= 80 ? "var(--da-green)" : score >= 50 ? "var(--da-orange)" : "var(--da-red)";
  const scoreLabel = score >= 80 ? "Sehr gut" : score >= 50 ? "OK" : "Verbesserung nötig";

  const set = <K extends keyof SeoState>(k: K, v: SeoState[K]) => onChange({ ...seo, [k]: v });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <AuthorCard padding={20} accent={scoreColor}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: `conic-gradient(${scoreColor} ${score * 3.6}deg, var(--da-card) 0)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: "var(--da-card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: scoreColor,
                fontWeight: 700,
                fontSize: 18,
                fontFamily: "var(--da-font-display)",
              }}
            >
              {score}
            </div>
          </div>
          <div>
            <p
              style={{
                color: scoreColor,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontFamily: "var(--da-font-mono)",
                marginBottom: 4,
              }}
            >
              SEO-Score
            </p>
            <p style={{ color: "var(--da-text)", fontSize: 16, fontWeight: 700 }}>{scoreLabel}</p>
            <p style={{ color: "var(--da-muted)", fontSize: 12, marginTop: 2 }}>von 100 Punkten</p>
          </div>
        </div>
      </AuthorCard>

      <AuthorCard padding={22}>
        <MonoCaption>Meta-Tags</MonoCaption>

        <div style={{ marginBottom: 18 }}>
          {labelRow("SEO-Titel", titleLen, titleOk, "50–60")}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={inputStyle}
              value={seo.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Titel für Google & Social"
            />
            <AiButton ariaLabel="AI-Vorschlag für Titel" />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          {labelRow("Meta-Description", descLen, descOk, "140–160")}
          <div style={{ display: "flex", gap: 8 }}>
            <textarea
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              value={seo.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Beschreibung in den Suchergebnissen"
            />
            <AiButton ariaLabel="AI-Vorschlag für Description" />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ color: "var(--da-text-strong)", fontSize: 13, fontWeight: 600 }}>URL-Slug</span>
            <span style={{ color: "var(--da-muted)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
              digital-age.ch/artikel/{seo.slug || "..."}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={inputStyle}
              value={seo.slug}
              onChange={(e) => set("slug", e.target.value.replace(/[^a-z0-9-]/g, ""))}
              placeholder="schweizer-banken-ki-einsatz"
            />
            <AiButton ariaLabel="AI-Vorschlag für Slug" />
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ color: "var(--da-text-strong)", fontSize: 13, fontWeight: 600 }}>Focus Keyword</span>
            <span style={{ color: "var(--da-muted)", fontSize: 11 }}>Hauptbegriff für Ranking</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={inputStyle}
              value={seo.keyword}
              onChange={(e) => set("keyword", e.target.value)}
              placeholder="z.B. KI im Banking"
            />
            <AiButton ariaLabel="AI-Vorschlag für Keyword" />
          </div>
        </div>
      </AuthorCard>

      <AuthorCard padding={22}>
        <MonoCaption>Vorschau · Google-Ergebnis</MonoCaption>
        <div
          style={{
            background: "#fff",
            color: "#202124",
            borderRadius: 6,
            padding: 14,
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div style={{ fontSize: 12 }}>digital-age.ch › artikel › {seo.slug || "..."}</div>
          <div style={{ fontSize: 18, color: "#1a0dab", marginTop: 4, marginBottom: 4, fontWeight: 400 }}>
            {seo.title || "SEO-Titel..."}
          </div>
          <div style={{ fontSize: 13, color: "#4d5156", lineHeight: 1.5 }}>
            {seo.description || "Meta-Description..."}
          </div>
        </div>
      </AuthorCard>

      <AuthorCard padding={20}>
        <MonoCaption>SEO-Checkliste</MonoCaption>
        {[
          ["Titel zwischen 50–60 Zeichen", titleOk],
          ["Description zwischen 140–160 Zeichen", descOk],
          ["URL-Slug gesetzt", slugOk],
          ["Focus Keyword gesetzt", keywordSet],
          [
            "Keyword im Titel enthalten",
            keywordSet && seo.title.toLowerCase().includes(seo.keyword.toLowerCase()),
          ],
        ].map(([l, ok]) => (
          <div
            key={l as string}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px solid var(--da-border)",
              fontSize: 13,
            }}
          >
            <span style={{ color: ok ? "var(--da-green)" : "var(--da-faint)", fontWeight: 700, width: 14 }}>
              {ok ? "✓" : "○"}
            </span>
            <span style={{ color: ok ? "var(--da-text)" : "var(--da-muted-soft)" }}>{l as string}</span>
          </div>
        ))}
      </AuthorCard>
    </div>
  );
}
