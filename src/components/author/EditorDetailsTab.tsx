"use client";

import { useState, useTransition } from "react";
import AuthorCard from "./AuthorCard";
import FeaturedImageBox, { type CoverMetadata } from "./FeaturedImageBox";
import MonoCaption from "./MonoCaption";
import TagInput from "./TagInput";
import { updateArticleAuthor, updateFeaturedStatus } from "@/lib/authorAdminActions";

// Details-Tab — sammelt alle Artikel-Setup-Felder, die frueher in der
// rechten Sidebar bzw. der Meta-Row im Content-Tab verteilt waren:
//   - Hero-Bild + Caption/Source/Alt
//   - Veroeffentlichungsdatum
//   - Featured/Hero-Status (Editor-only)
//   - Author-Zuweisung (Editor-only)
//   - Kategorie / Subkategorie / Tags
//
// Sprache lebt bewusst NICHT hier — sie ist Inhalts-relevant und sitzt
// kompakt vor dem Titel im Inhalt-Tab.

type Category = { id: string; slug: string; name_de: string };

type Props = {
  articleId: string;

  // Cover-Image + Metadaten
  coverImageUrl: string;
  onCoverChange: (url: string) => void;
  coverMetadata: CoverMetadata;
  onCoverMetadataChange: (next: CoverMetadata) => void;

  // Veroeffentlichungsdatum (YYYY-MM-DD, "" = unset)
  publishedAtDate: string;
  onPublishedAtChange: (date: string) => void;

  // Editor-only: Featured/Hero-Toggle + Author-Reassignment
  isEditor: boolean;
  allAuthors: { id: string; display_name: string; role: string }[];
  currentAuthorId: string;
  initialIsFeatured: boolean;
  initialIsHero: boolean;

  // Kategorie/Subkat/Tags — Migration aus der frueheren Content-Tab-Meta-Row.
  categoryId: string;
  onCategoryChange: (id: string) => void;
  categories: Category[];
  subcategory: string;
  onSubcategoryChange: (s: string) => void;
  tagList: string[];
  onTagListChange: (next: string[]) => void;

  // Kategorie-Wechsel-Warning: heutige Featured/Hero-Werte aus dem
  // article-Prop, damit wir vor dem Kategorie-Wechsel warnen koennen
  // (Server resettet beides, aber wir geben Usern die Chance abzubrechen).
  articleIsFeatured: boolean;
  articleIsHero: boolean;
  articleCategoryId: string;
};

export default function EditorDetailsTab({
  articleId,
  coverImageUrl,
  onCoverChange,
  coverMetadata,
  onCoverMetadataChange,
  publishedAtDate,
  onPublishedAtChange,
  isEditor,
  allAuthors,
  currentAuthorId,
  initialIsFeatured,
  initialIsHero,
  categoryId,
  onCategoryChange,
  categories,
  subcategory,
  onSubcategoryChange,
  tagList,
  onTagListChange,
  articleIsFeatured,
  articleIsHero,
  articleCategoryId,
}: Props) {
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

  function handleCategoryChange(next: string) {
    if (next === categoryId) return;
    // Server setzt Featured/Hero zurueck wenn Kategorie wechselt; vorher fragen.
    if ((articleIsFeatured || articleIsHero) && next !== articleCategoryId) {
      const ok = window.confirm(
        "Dieser Artikel ist als Featured oder Hero markiert. Beim Wechsel der Kategorie werden Featured- und Hero-Status zurückgesetzt. Fortfahren?",
      );
      if (!ok) return;
    }
    onCategoryChange(next);
  }

  return (
    <>
      <style>{`
        .a-edit-details {
          max-width: 720px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .a-edit-details__row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 640px) {
          .a-edit-details__row-2 { grid-template-columns: 1fr; }
        }
        .a-edit-details__meta-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 900px) {
          .a-edit-details__meta-row { grid-template-columns: 1fr; }
        }
        .a-edit-details__input,
        .a-edit-details__select {
          width: 100%; background: var(--da-card);
          border: 1px solid var(--da-border); border-radius: 4px;
          color: var(--da-text); padding: 8px 12px;
          font-size: 13px; font-family: inherit;
        }
        .a-edit-details__label {
          color: var(--da-faint); font-size: 10px; font-weight: 700;
          font-family: var(--da-font-mono); letter-spacing: 0.12em;
          text-transform: uppercase; margin-bottom: 5px;
          display: block;
        }
      `}</style>

      <div className="a-edit-details">
        <AuthorCard padding={18}>
          <MonoCaption>Klassifizierung</MonoCaption>
          <div className="a-edit-details__meta-row" style={{ marginTop: 12 }}>
            <div>
              <label className="a-edit-details__label">Kategorie</label>
              <select
                className="a-edit-details__select"
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_de}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="a-edit-details__label">Subkategorie</label>
              <input
                className="a-edit-details__input"
                value={subcategory}
                onChange={(e) => onSubcategoryChange(e.target.value)}
                placeholder='z.B. "AI in Banking"'
              />
            </div>
            <div>
              <label className="a-edit-details__label">Tags</label>
              <TagInput
                value={tagList}
                onChange={onTagListChange}
                placeholder="Tag suchen oder neu anlegen…"
              />
            </div>
          </div>
        </AuthorCard>

        <FeaturedImageBox
          articleId={articleId}
          coverImageUrl={coverImageUrl}
          onCoverChange={onCoverChange}
          metadata={coverMetadata}
          onMetadataChange={onCoverMetadataChange}
        />

        <div className="a-edit-details__row-2">
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
        </div>

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
      </div>

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
              In dieser Kategorie ist bereits ein anderer Artikel als Hero-Featured markiert:
            </p>
            <p style={{ color: "var(--da-text)", fontSize: 13, lineHeight: 1.6, marginBottom: 20, fontWeight: 600 }}>
              {heroConflict.title}
            </p>
            <p style={{ color: "var(--da-muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              Soll dieser Artikel den bestehenden Hero ersetzen?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setHeroConflict(null)} style={{ background: "transparent", color: "var(--da-text)", border: "1px solid var(--da-border)", padding: "8px 16px", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Abbrechen
              </button>
              <button type="button" onClick={confirmHeroReplace} style={{ background: "var(--da-green)", color: "var(--da-dark)", border: "none", padding: "8px 16px", borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Ersetzen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
