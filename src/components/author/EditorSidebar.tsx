"use client";

import AuthorCard from "./AuthorCard";
import FeaturedImageBox from "./FeaturedImageBox";
import MonoCaption from "./MonoCaption";

type EditorSidebarProps = {
  wordCount: number;
  readMinutes: number;
  category: string;
  tags: string[];
  articleId: string;
  coverImageUrl: string;
  onCoverChange: (url: string) => void;
};

const AI_TOOLTIP = "AI-Features kommen in einer späteren Phase";

const AI_BUTTONS = [
  "Schluss-Absatz vorschlagen",
  "Titel-Varianten generieren",
  "Stil & Tonalität prüfen",
  "Zusammenfassung erstellen",
];

export default function EditorSidebar({ wordCount, readMinutes, category, tags, articleId, coverImageUrl, onCoverChange }: EditorSidebarProps) {
  return (
    <aside style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 14 }}>
      <FeaturedImageBox
        articleId={articleId}
        coverImageUrl={coverImageUrl}
        onCoverChange={onCoverChange}
      />

      <AuthorCard padding={18}>
        <MonoCaption>Statistiken</MonoCaption>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <div style={{ color: "var(--da-text)", fontSize: 22, fontWeight: 700, fontFamily: "var(--da-font-display)", lineHeight: 1 }}>
              {wordCount}
            </div>
            <div style={{ color: "var(--da-muted)", fontSize: 11, marginTop: 4 }}>Wörter</div>
          </div>
          <div>
            <div style={{ color: "var(--da-green)", fontSize: 22, fontWeight: 700, fontFamily: "var(--da-font-display)", lineHeight: 1 }}>
              {readMinutes} min
            </div>
            <div style={{ color: "var(--da-muted)", fontSize: 11, marginTop: 4 }}>Lesezeit</div>
          </div>
        </div>
      </AuthorCard>

      <AuthorCard padding={18}>
        <MonoCaption>Klassifizierung</MonoCaption>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
            borderBottom: "1px solid var(--da-border)",
          }}
        >
          <span style={{ color: "var(--da-muted)", fontSize: 12 }}>Kategorie</span>
          <span style={{ color: "var(--da-orange)", fontSize: 12, fontWeight: 600 }}>{category}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingTop: 12 }}>
          {tags.map((t) => (
            <span
              key={t}
              style={{
                background: "var(--da-dark)",
                border: "1px solid var(--da-border)",
                color: "var(--da-text-strong)",
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 999,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </AuthorCard>

      <AuthorCard padding={18} accent="var(--da-purple)">
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <span style={{ color: "var(--da-purple)", fontSize: 14 }}>✨</span>
          <p
            style={{
              color: "var(--da-purple)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "var(--da-font-mono)",
            }}
          >
            AI Assistent
          </p>
        </div>
        <p style={{ color: "var(--da-muted)", fontSize: 12, lineHeight: 1.55, marginBottom: 12 }}>
          Nutze AI um Schreibblockaden zu lösen oder den Text zu verfeinern.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {AI_BUTTONS.map((l) => (
            <button
              key={l}
              type="button"
              disabled
              title={AI_TOOLTIP}
              style={{
                background: "transparent",
                color: "var(--da-text)",
                border: "1px solid var(--da-border)",
                padding: "8px 12px",
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: "not-allowed",
                textAlign: "left",
                opacity: 0.6,
                fontFamily: "inherit",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </AuthorCard>
    </aside>
  );
}
