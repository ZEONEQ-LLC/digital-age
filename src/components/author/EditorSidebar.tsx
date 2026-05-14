"use client";

import { useState, useTransition } from "react";
import AuthorCard from "./AuthorCard";
import FeaturedImageBox from "./FeaturedImageBox";
import MonoCaption from "./MonoCaption";
import { updateArticleAuthor, updateFeaturedStatus } from "@/lib/authorAdminActions";

type EditorSidebarProps = {
  wordCount: number;
  readMinutes: number;
  category: string;
  tags: string[];
  articleId: string;
  coverImageUrl: string;
  onCoverChange: (url: string) => void;
  publishedAtDate: string; // YYYY-MM-DD, "" wenn nicht gesetzt
  onPublishedAtChange: (date: string) => void;
  isEditor: boolean;
  allAuthors: { id: string; display_name: string; role: string }[];
  currentAuthorId: string;
  initialIsFeatured: boolean;
  initialIsHero: boolean;
};

const AI_TOOLTIP = "AI-Features kommen in einer späteren Phase";

const AI_BUTTONS = [
  "Schluss-Absatz vorschlagen",
  "Titel-Varianten generieren",
  "Stil & Tonalität prüfen",
  "Zusammenfassung erstellen",
];

export default function EditorSidebar({ wordCount, readMinutes, category, tags, articleId, coverImageUrl, onCoverChange, publishedAtDate, onPublishedAtChange, isEditor, allAuthors, currentAuthorId, initialIsFeatured, initialIsHero }: EditorSidebarProps) {
  const [assignedAuthor, setAssignedAuthor] = useState(currentAuthorId);
  const [authorToast, setAuthorToast] = useState<string | null>(null);
  const [authorPending, startAuthorTransition] = useTransition();

  const [isFeatured, setIsFeatured] = useState(initialIsFeatured);
  const [isHero, setIsHero] = useState(initialIsHero);
  const [featuredPending, startFeaturedTransition] = useTransition();
  const [featuredToast, setFeaturedToast] = useState<string | null>(null);
  const [heroConflict, setHeroConflict] = useState<{ id: string; title: string } | null>(null);

  function flashToast(msg: string, ms = 3000) {
    setFeaturedToast(msg);
    setTimeout(() => setFeaturedToast(null), ms);
  }

  async function applyFeatured(next: { featured: boolean; hero: boolean; forceReplace?: boolean }) {
    return new Promise<void>((resolve) => {
      startFeaturedTransition(async () => {
        const result = await updateFeaturedStatus(articleId, next.featured, next.hero, next.forceReplace);
        if (result.ok) {
          setIsFeatured(next.featured);
          setIsHero(next.hero);
          flashToast(next.hero ? "Hero gesetzt" : next.featured ? "Featured gesetzt" : "Featured entfernt");
        } else if (result.code === "MAX_FEATURED_REACHED") {
          flashToast("Max 3 Featured-Artikel in dieser Kategorie. Entferne erst einen anderen.", 5000);
        } else if (result.code === "HERO_CONFLICT") {
          setHeroConflict({ id: result.existingHeroId, title: result.existingHeroTitle });
        } else if (result.code === "UNAUTHORIZED") {
          flashToast("Keine Berechtigung.", 5000);
        } else {
          // INVALID
          flashToast(`Fehler: ${result.message}`, 5000);
        }
        resolve();
      });
    });
  }

  function onToggleFeatured(next: boolean) {
    if (next) {
      void applyFeatured({ featured: true, hero: isHero });
    } else {
      if (isHero) {
        if (!window.confirm("Hero-Featured wird ebenfalls entfernt. Fortfahren?")) return;
      }
      void applyFeatured({ featured: false, hero: false });
    }
  }

  function onToggleHero(next: boolean) {
    if (next) {
      void applyFeatured({ featured: true, hero: true });
    } else {
      void applyFeatured({ featured: isFeatured, hero: false });
    }
  }

  async function confirmHeroReplace() {
    if (!heroConflict) return;
    setHeroConflict(null);
    await applyFeatured({ featured: true, hero: true, forceReplace: true });
  }

  function handleAuthorChange(newId: string) {
    if (newId === assignedAuthor) return;
    const prev = assignedAuthor;
    setAssignedAuthor(newId);
    startAuthorTransition(async () => {
      try {
        await updateArticleAuthor(articleId, newId);
        setAuthorToast("Author geändert");
        setTimeout(() => setAuthorToast(null), 2500);
      } catch (e) {
        setAssignedAuthor(prev);
        setAuthorToast(e instanceof Error ? e.message : "Fehler beim Speichern");
        setTimeout(() => setAuthorToast(null), 4000);
      }
    });
  }

  return (
    <aside style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 14 }}>
      <FeaturedImageBox
        articleId={articleId}
        coverImageUrl={coverImageUrl}
        onCoverChange={onCoverChange}
      />

      <AuthorCard padding={18}>
        <MonoCaption>Veröffentlichungsdatum</MonoCaption>
        <input
          type="date"
          value={publishedAtDate}
          onChange={(e) => onPublishedAtChange(e.target.value)}
          style={{
            width: "100%",
            background: "var(--da-darker)",
            color: "var(--da-text)",
            border: "1px solid var(--da-border)",
            borderRadius: 4,
            padding: "8px 10px",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
            marginTop: 8,
            colorScheme: "dark",
          }}
        />
        <p style={{ color: "var(--da-faint)", fontSize: 10, marginTop: 8, lineHeight: 1.5 }}>
          Bleibt beim Publish erhalten — leer setzen, damit beim ersten
          Publish das aktuelle Datum gesetzt wird.
        </p>
      </AuthorCard>

      {isEditor && (
        <AuthorCard padding={18}>
          <MonoCaption>Featured</MonoCaption>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 10, cursor: featuredPending ? "wait" : "pointer" }}>
            <input
              type="checkbox"
              checked={isFeatured}
              disabled={featuredPending}
              onChange={(e) => onToggleFeatured(e.target.checked)}
              style={{ marginTop: 3, cursor: "inherit" }}
            />
            <span>
              <span style={{ color: "var(--da-text)", fontSize: 13, fontWeight: 600 }}>Featured (Spotlight-Section)</span>
              <span style={{ display: "block", color: "var(--da-muted)", fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>
                In der Kategorie-Page oben. Max 3 pro Kategorie.
              </span>
            </span>
          </label>
          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              marginTop: 12,
              cursor: !isFeatured || featuredPending ? "not-allowed" : "pointer",
              opacity: !isFeatured ? 0.5 : 1,
            }}
            title={!isFeatured ? "Erst als Featured markieren" : ""}
          >
            <input
              type="checkbox"
              checked={isHero}
              disabled={!isFeatured || featuredPending}
              onChange={(e) => onToggleHero(e.target.checked)}
              style={{ marginTop: 3, cursor: "inherit" }}
            />
            <span>
              <span style={{ color: "var(--da-text)", fontSize: 13, fontWeight: 600 }}>Hero-Featured (Homepage)</span>
              <span style={{ display: "block", color: "var(--da-muted)", fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>
                Auf der Startseite oben. Nur möglich wenn Featured. Max 1 pro Kategorie.
              </span>
            </span>
          </label>
          {featuredToast && (
            <p style={{ color: featuredToast.startsWith("Fehler") || featuredToast.startsWith("Max") || featuredToast.startsWith("Keine") ? "var(--da-orange)" : "var(--da-green)", fontSize: 11, marginTop: 10, fontFamily: "var(--da-font-mono)" }}>
              {featuredToast}
            </p>
          )}
        </AuthorCard>
      )}

      {heroConflict && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24, zIndex: 100,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setHeroConflict(null); }}
        >
          <div style={{
            background: "var(--da-card)",
            border: "1px solid var(--da-border)",
            borderRadius: 8,
            padding: 24,
            maxWidth: 480,
            width: "100%",
            fontFamily: "var(--da-font-body)",
          }}>
            <h2 style={{ color: "var(--da-text)", fontSize: 17, fontWeight: 700, marginBottom: 12, fontFamily: "var(--da-font-display)" }}>
              Hero-Konflikt
            </h2>
            <p style={{ color: "var(--da-muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>
              In dieser Kategorie ist bereits{" "}
              <a href={`/autor/artikel/${heroConflict.id}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--da-green)", fontWeight: 600 }}>
                &quot;{heroConflict.title}&quot;
              </a>{" "}
              als Hero-Featured markiert.
            </p>
            <p style={{ color: "var(--da-muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              Diesen Artikel als neuen Hero setzen und den bestehenden auf nur Featured zurückstufen?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setHeroConflict(null)} style={{ background: "transparent", color: "var(--da-muted-soft)", border: "1px solid var(--da-border)", padding: "8px 16px", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Abbrechen
              </button>
              <button type="button" onClick={confirmHeroReplace} style={{ background: "var(--da-green)", color: "var(--da-dark)", border: "none", padding: "8px 16px", borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Ersetzen
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditor && (
        <AuthorCard padding={18}>
          <MonoCaption>Author</MonoCaption>
          <select
            value={assignedAuthor}
            disabled={authorPending}
            onChange={(e) => handleAuthorChange(e.target.value)}
            style={{
              width: "100%",
              background: "var(--da-darker)",
              color: "var(--da-text)",
              border: "1px solid var(--da-border)",
              borderRadius: 4,
              padding: "8px 10px",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
              marginTop: 8,
              cursor: authorPending ? "wait" : "pointer",
            }}
          >
            {allAuthors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.display_name}
                {a.role === "external" ? " (extern)" : ""}
              </option>
            ))}
          </select>
          {authorToast && (
            <p style={{ color: "var(--da-green)", fontSize: 11, marginTop: 8, fontFamily: "var(--da-font-mono)" }}>
              {authorToast}
            </p>
          )}
        </AuthorCard>
      )}

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
