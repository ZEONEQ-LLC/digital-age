"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import BlockEditor from "@/components/author/BlockEditor";
import ArticleBody from "@/components/ArticleBody";
import BlockReader from "@/components/BlockReader";
import PageHero from "@/components/PageHero";
import { savePage, deletePage, type PagePatch } from "@/lib/pageActions";
import type { Database } from "@/lib/database.types";
import type { BlockDocument } from "@/types/blocks";
import { emptyBlockDocument } from "@/types/blocks";

type PageRow = Database["public"]["Tables"]["pages"]["Row"];

type Tab = "content" | "preview" | "meta";

type Props = {
  page: PageRow;
};

const SLUG_RE = /^[a-z0-9-]*$/;

export default function PageEditorClient({ page }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("content");

  const [title, setTitle] = useState(page.title);
  const [lead, setLead] = useState(page.lead ?? "");
  const [doc, setDoc] = useState<BlockDocument>(() => {
    if (page.body_blocks && typeof page.body_blocks === "object") {
      return page.body_blocks as unknown as BlockDocument;
    }
    return emptyBlockDocument();
  });

  // Meta-Tab
  const [slug, setSlug] = useState(page.slug);
  const [metaDescription, setMetaDescription] = useState(page.meta_description ?? "");
  const [noindex, setNoindex] = useState(page.noindex);
  const [heroCategory, setHeroCategory] = useState(page.hero_category ?? "");

  const [status, setStatus] = useState<"draft" | "published">(
    page.status === "published" ? "published" : "draft",
  );

  const [savedHint, setSavedHint] = useState<string>("Geladen");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const slugValid = SLUG_RE.test(slug) && slug.length > 0 && slug.length <= 80;

  function buildPatch(): PagePatch {
    return {
      title,
      slug,
      lead: lead.trim() === "" ? null : lead,
      body_blocks: doc,
      meta_description: metaDescription.trim() === "" ? null : metaDescription,
      noindex,
      hero_category: heroCategory.trim() === "" ? null : heroCategory,
      status,
    };
  }

  function handleSave() {
    setError(null);
    if (!slugValid) {
      setError("Slug darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten (max 80).");
      return;
    }
    startTransition(async () => {
      try {
        await savePage(page.id, buildPatch());
        setSavedHint("Gespeichert");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function handleStatusToggle() {
    const next = status === "draft" ? "published" : "draft";
    setStatus(next);
    setError(null);
    startTransition(async () => {
      try {
        await savePage(page.id, { ...buildPatch(), status: next });
        setSavedHint("Gespeichert");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Status-Wechsel fehlgeschlagen.");
        setStatus(status);
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`Seite "${title}" wirklich löschen? Die URL /${slug} liefert dann 404.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deletePage(page.id);
        router.push("/autor/seiten");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      }
    });
  }

  return (
    <div>
      {/* Top-Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p style={{ color: "var(--da-muted)", fontSize: 12, fontFamily: "var(--da-font-mono)" }}>
            SEITE · /{slug}
          </p>
          <h1
            style={{
              color: "var(--da-text)",
              fontFamily: "var(--da-font-display)",
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1.15,
              marginTop: 4,
            }}
          >
            {title || "Unbenannte Seite"}
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--da-muted)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
            {savedHint}
          </span>
          <button type="button" onClick={handleStatusToggle} disabled={pending} style={statusBtnStyle(status)}>
            {status === "published" ? "Veröffentlicht ✓" : "Entwurf"}
          </button>
          <button type="button" onClick={handleSave} disabled={pending} style={primaryBtnStyle}>
            {pending ? "…" : "Speichern"}
          </button>
        </div>
      </div>

      {/* Tab-Switcher */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--da-border)", marginBottom: 22 }}>
        <TabButton active={tab === "content"} onClick={() => setTab("content")}>Inhalt</TabButton>
        <TabButton active={tab === "preview"} onClick={() => setTab("preview")}>Vorschau</TabButton>
        <TabButton active={tab === "meta"} onClick={() => setTab("meta")}>Meta</TabButton>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: "rgba(255,80,80,0.08)",
            border: "1px solid rgba(255,80,80,0.4)",
            color: "#ff8e8e",
            padding: "10px 14px",
            borderRadius: 4,
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      {tab === "content" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760 }}>
          <label style={fieldGroup}>
            <span style={labelStyle}>Titel</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ ...inputStyle, fontSize: 22, fontWeight: 600 }}
            />
          </label>

          <label style={fieldGroup}>
            <span style={labelStyle}>Lead (optional, erscheint unter dem Titel im Hero)</span>
            <textarea
              value={lead}
              onChange={(e) => setLead(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical", fontStyle: "italic" }}
            />
          </label>

          <div style={{ marginTop: 8 }}>
            <p style={{ ...labelStyle, marginBottom: 10 }}>Inhalt</p>
            <BlockEditor doc={doc} onChange={setDoc} articleId={page.id} />
          </div>
        </div>
      )}

      {tab === "preview" && (
        <div style={{ background: "var(--da-dark)", borderRadius: 6, border: "1px solid var(--da-border)" }}>
          <PageHero
            category={heroCategory.trim() === "" ? undefined : heroCategory}
            title={title}
            description={lead.trim() === "" ? undefined : lead}
          />
          <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 32px 64px" }}>
            <ArticleBody>
              <BlockReader doc={doc} />
            </ArticleBody>
          </div>
        </div>
      )}

      {tab === "meta" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 600 }}>
          <label style={fieldGroup}>
            <span style={labelStyle}>Slug (URL-Pfad)</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              style={{ ...inputStyle, fontFamily: "var(--da-font-mono)" }}
            />
            <span style={{ color: "var(--da-muted)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
              Aktuell: digital-age.ch/{slug}
            </span>
            {!slugValid && (
              <span style={{ color: "#ff8e8e", fontSize: 11 }}>
                Nur Kleinbuchstaben, Ziffern und Bindestriche, max 80 Zeichen.
              </span>
            )}
          </label>

          <label style={fieldGroup}>
            <span style={labelStyle}>Meta-Description (für Suchmaschinen)</span>
            <textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="140–160 Zeichen, beschreibt den Seiteninhalt für Google."
            />
            <span style={{ color: "var(--da-muted)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
              {metaDescription.length} Zeichen
            </span>
          </label>

          <label style={fieldGroup}>
            <span style={labelStyle}>Hero-Kategorie (Label über dem Titel)</span>
            <input
              value={heroCategory}
              onChange={(e) => setHeroCategory(e.target.value)}
              style={inputStyle}
              placeholder='z.B. "Rechtliches"'
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={noindex}
              onChange={(e) => setNoindex(e.target.checked)}
            />
            <span style={{ color: "var(--da-text)", fontSize: 13 }}>
              <strong>Noindex</strong> — Suchmaschinen anweisen, die Seite nicht zu indexieren
              (empfohlen für rechtliche Seiten).
            </span>
          </label>

          <div style={{ marginTop: 12, paddingTop: 18, borderTop: "1px solid var(--da-border)" }}>
            <p style={{ color: "var(--da-muted)", fontSize: 12, marginBottom: 8 }}>Gefahrenzone</p>
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              style={dangerBtnStyle}
            >
              Seite löschen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid var(--da-green)" : "2px solid transparent",
        color: active ? "var(--da-text)" : "var(--da-muted)",
        padding: "10px 16px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        marginBottom: -1,
      }}
    >
      {children}
    </button>
  );
}

const fieldGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };

const labelStyle: React.CSSProperties = {
  color: "var(--da-muted)",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.04em",
};

const inputStyle: React.CSSProperties = {
  background: "var(--da-dark)",
  color: "var(--da-text)",
  border: "1px solid var(--da-border)",
  borderRadius: 4,
  padding: "10px 12px",
  fontSize: 13,
  fontFamily: "inherit",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "var(--da-green)",
  color: "var(--da-dark)",
  border: "none",
  borderRadius: 4,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const dangerBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "#ff8e8e",
  border: "1px solid rgba(255,80,80,0.4)",
  borderRadius: 4,
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

function statusBtnStyle(status: "draft" | "published"): React.CSSProperties {
  const pub = status === "published";
  return {
    background: pub ? "rgba(50,255,126,0.12)" : "rgba(160,160,160,0.12)",
    color: pub ? "var(--da-green)" : "var(--da-muted)",
    border: `1px solid ${pub ? "var(--da-green)" : "var(--da-border)"}`,
    borderRadius: 4,
    padding: "7px 14px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "var(--da-font-mono)",
    letterSpacing: "0.06em",
  };
}
