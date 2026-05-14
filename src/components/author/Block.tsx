"use client";

import { useState } from "react";
import ImageUploader from "@/components/editor/ImageUploader";
import InlineToolbarTextarea from "@/components/editor/InlineToolbarTextarea";
import type { ArticleSearchResult } from "@/lib/articleSearchActions";
import type {
  Block as BlockT,
  ImageAlignment,
  ImageSize,
  StatBoxItem,
} from "@/types/blocks";

type BlockProps = {
  block: BlockT;
  articleId: string;
  onChange: (next: BlockT) => void;
  onAddBelow: (afterId: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
  onRequestArticlePick?: (onPick: (r: ArticleSearchResult) => void) => void;
  onRequestSourcePick?: (insertMarker: (n: number) => void) => void;
};

const baseInput: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  color: "var(--da-text)",
  fontFamily: "var(--da-font-body)",
  outline: "none",
  resize: "none",
  padding: 0,
  lineHeight: 1.6,
};

const handleBtn: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 4,
  background: "var(--da-dark)",
  border: "1px solid var(--da-border)",
  color: "var(--da-muted-soft)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
  padding: 0,
  fontFamily: "inherit",
};

const boxedInput: React.CSSProperties = {
  ...baseInput,
  fontSize: 13,
  background: "var(--da-dark)",
  border: "1px solid var(--da-border)",
  borderRadius: 4,
  padding: "8px 10px",
  color: "var(--da-text-strong)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "var(--da-faint)",
  fontFamily: "var(--da-font-mono)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 6,
  marginTop: 12,
};

const toggleBtn: React.CSSProperties = {
  background: "var(--da-dark)",
  border: "1px solid var(--da-border)",
  color: "var(--da-muted)",
  padding: "5px 10px",
  borderRadius: 4,
  fontSize: 11,
  cursor: "pointer",
  fontFamily: "inherit",
};

const toggleBtnActive: React.CSSProperties = {
  ...toggleBtn,
  background: "var(--da-green)",
  borderColor: "var(--da-green)",
  color: "var(--da-dark)",
  fontWeight: 700,
};

const HEADING_FONT_SIZE: Record<2 | 3 | 4, number> = {
  2: 26,
  3: 20,
  4: 17,
};

export default function Block({
  block,
  articleId,
  onChange,
  onAddBelow,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onRequestArticlePick,
  onRequestSourcePick,
}: BlockProps) {
  const [hov, setHov] = useState(false);

  const renderBody = () => {
    if (block.type === "heading") {
      return (
        <input
          style={{
            ...baseInput,
            fontSize: HEADING_FONT_SIZE[block.level],
            fontWeight: 700,
            fontFamily: "var(--da-font-display)",
            letterSpacing: block.level === 2 ? "-0.01em" : 0,
          }}
          value={block.content}
          placeholder={`Heading ${block.level}`}
          onChange={(e) => onChange({ ...block, content: e.target.value })}
        />
      );
    }
    if (block.type === "paragraph") {
      return (
        <InlineToolbarTextarea
          rows={Math.max(2, block.content.split("\n").length)}
          style={{ ...baseInput, fontSize: 15, color: "var(--da-text-strong)" }}
          value={block.content}
          placeholder="Schreib hier… **bold**, _italic_, [link](url), Selektion + Floating-Toolbar für Highlights"
          onChange={(content) => onChange({ ...block, content })}
          onRequestArticlePick={onRequestArticlePick}
          onRequestSourcePick={onRequestSourcePick}
        />
      );
    }
    if (block.type === "quote") {
      return (
        <div style={{ borderLeft: "3px solid var(--da-green)", paddingLeft: 16 }}>
          <InlineToolbarTextarea
            rows={2}
            style={{ ...baseInput, fontSize: 18, fontStyle: "italic", color: "var(--da-text)" }}
            value={block.content}
            placeholder="Zitat…"
            onChange={(content) => onChange({ ...block, content })}
            onRequestArticlePick={onRequestArticlePick}
            onRequestSourcePick={onRequestSourcePick}
          />
          <input
            style={{ ...baseInput, fontSize: 13, color: "var(--da-muted-soft)", marginTop: 6 }}
            value={block.attribution ?? ""}
            placeholder="— Wer hat es gesagt"
            onChange={(e) => onChange({ ...block, attribution: e.target.value })}
          />
        </div>
      );
    }
    if (block.type === "code") {
      return (
        <pre
          style={{
            background: "var(--da-dark)",
            border: "1px solid var(--da-border)",
            borderRadius: 4,
            padding: 14,
            margin: 0,
          }}
        >
          <textarea
            rows={4}
            style={{
              ...baseInput,
              fontFamily: "var(--da-font-mono)",
              fontSize: 13,
              color: "var(--da-purple)",
            }}
            value={block.content}
            placeholder="// Code…"
            onChange={(e) => onChange({ ...block, content: e.target.value })}
          />
        </pre>
      );
    }
    if (block.type === "list") {
      const items = block.items.length > 0 ? block.items : [""];
      return (
        <ul style={{ paddingLeft: 22, color: "var(--da-text-strong)", fontSize: 15, listStyleType: block.ordered ? "decimal" : "disc" }}>
          {items.map((it, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              <input
                style={{ ...baseInput, fontSize: 15 }}
                value={it}
                placeholder="Listenpunkt"
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  onChange({ ...block, items: next });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const next = [...items];
                    next.splice(i + 1, 0, "");
                    onChange({ ...block, items: next });
                  }
                  if (e.key === "Backspace" && it === "" && items.length > 1) {
                    e.preventDefault();
                    const next = items.filter((_, j) => j !== i);
                    onChange({ ...block, items: next });
                  }
                }}
              />
            </li>
          ))}
        </ul>
      );
    }
    if (block.type === "image") {
      const updateImage = (patch: Partial<typeof block>) => onChange({ ...block, ...patch });
      const setSize = (size: ImageSize) => updateImage({ size });
      const setAlign = (alignment: ImageAlignment) => updateImage({ alignment });

      if (!block.url) {
        // Noch kein Bild → Uploader-Zone zeigen.
        return (
          <ImageUploader
            articleId={articleId}
            onUploadComplete={(url) => {
              const filename = url.split("/").pop() ?? "image";
              updateImage({ url, filename });
            }}
          />
        );
      }

      return (
        <div>
          <ImageUploader
            articleId={articleId}
            currentImageUrl={block.url}
            onUploadComplete={(url) => {
              const filename = url.split("/").pop() ?? "image";
              updateImage({ url, filename });
            }}
          />

          <label style={labelStyle}>Alt-Text (Pflicht für Accessibility)</label>
          <input
            style={boxedInput}
            value={block.alt}
            onChange={(e) => updateImage({ alt: e.target.value })}
            placeholder="Was zeigt das Bild?"
          />

          <label style={labelStyle}>Bildunterschrift</label>
          <input
            style={boxedInput}
            value={block.caption ?? ""}
            onChange={(e) => updateImage({ caption: e.target.value })}
            placeholder="z.B. 'Drohnenaufnahme der Lagunenstadt'"
          />

          <label style={labelStyle}>Quelle</label>
          <input
            style={boxedInput}
            value={block.source ?? ""}
            onChange={(e) => updateImage({ source: e.target.value })}
            placeholder="z.B. 'Bild: BFU'"
          />

          <label style={labelStyle}>Grösse</label>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" style={block.size === "small" ? toggleBtnActive : toggleBtn} onClick={() => setSize("small")}>Klein</button>
            <button type="button" style={block.size === "normal" ? toggleBtnActive : toggleBtn} onClick={() => setSize("normal")}>Normal</button>
            <button type="button" style={block.size === "full" ? toggleBtnActive : toggleBtn} onClick={() => setSize("full")}>Volle Breite</button>
          </div>

          {block.size !== "full" && (
            <>
              <label style={labelStyle}>Ausrichtung</label>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" style={block.alignment === "left" ? toggleBtnActive : toggleBtn} onClick={() => setAlign("left")}>Links</button>
                <button type="button" style={block.alignment === "center" ? toggleBtnActive : toggleBtn} onClick={() => setAlign("center")}>Mitte</button>
                <button type="button" style={block.alignment === "right" ? toggleBtnActive : toggleBtn} onClick={() => setAlign("right")}>Rechts</button>
              </div>
            </>
          )}
        </div>
      );
    }
    if (block.type === "statbox") {
      const setItem = (i: 0 | 1 | 2, patch: Partial<StatBoxItem>) => {
        const next = [...block.items] as [StatBoxItem, StatBoxItem, StatBoxItem];
        next[i] = { ...next[i], ...patch };
        onChange({ ...block, items: next });
      };
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            background: "rgba(255,140,66,0.06)",
            border: "1px solid var(--da-orange)",
            borderRadius: 8,
            padding: 16,
          }}
        >
          {([0, 1, 2] as const).map((i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                style={{
                  ...baseInput,
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: "var(--da-font-display)",
                  color: "var(--da-orange)",
                }}
                value={block.items[i].value}
                placeholder="Zahl"
                onChange={(e) => setItem(i, { value: e.target.value })}
              />
              <textarea
                rows={2}
                style={{ ...baseInput, fontSize: 13, color: "var(--da-text)" }}
                value={block.items[i].label}
                placeholder="Beschreibung"
                onChange={(e) => setItem(i, { label: e.target.value })}
              />
            </div>
          ))}
        </div>
      );
    }
    if (block.type === "disclaimer") {
      const applyTemplate = (lang: "de" | "en") => {
        if (lang === "de") {
          onChange({
            ...block,
            text: "AI war beteiligt. Verantwortung übernehmen wir.",
            linkText: "So machen wir das",
            linkUrl: "/ki-transparenz",
          });
        } else {
          onChange({
            ...block,
            text: "AI contributed. The responsibility stays with us.",
            linkText: "How we handle it",
            linkUrl: "/ki-transparenz",
          });
        }
      };
      return (
        <div
          style={{
            border: "1px solid var(--da-orange)",
            background: "rgba(255,140,66,0.04)",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <label style={{ ...labelStyle, marginTop: 0 }}>Vorlage</label>
          <select
            style={{
              ...boxedInput,
              cursor: "pointer",
              appearance: "auto",
            }}
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v === "de" || v === "en") applyTemplate(v);
              e.target.value = "";
            }}
          >
            <option value="">— Vorlage wählen —</option>
            <option value="de">AI-Transparenz-Hinweis (DE)</option>
            <option value="en">AI-Transparency-Disclaimer (EN)</option>
          </select>

          <label style={labelStyle}>Text</label>
          <textarea
            rows={2}
            style={{ ...baseInput, fontSize: 14, color: "var(--da-text)" }}
            value={block.text}
            placeholder="z.B. 'AI war beteiligt. Verantwortung übernehmen wir.'"
            onChange={(e) => onChange({ ...block, text: e.target.value })}
          />
          <label style={labelStyle}>Link-Text (optional)</label>
          <input
            style={boxedInput}
            value={block.linkText ?? ""}
            placeholder="z.B. 'So machen wir das'"
            onChange={(e) => onChange({ ...block, linkText: e.target.value || undefined })}
          />
          <label style={labelStyle}>Link-URL (optional)</label>
          <input
            style={boxedInput}
            value={block.linkUrl ?? ""}
            placeholder="https://… oder /seite"
            onChange={(e) => onChange({ ...block, linkUrl: e.target.value || undefined })}
          />
        </div>
      );
    }
    if (block.type === "internalArticleCard") {
      const handlePick = () => {
        if (!onRequestArticlePick) return;
        onRequestArticlePick((result) => {
          onChange({
            ...block,
            articleSlug: result.slug,
            cachedTitle: result.title,
            cachedCoverUrl: result.cover_image_url ?? undefined,
            cachedExcerpt: result.excerpt ?? undefined,
          });
        });
      };

      return (
        <div
          style={{
            background: "var(--da-card)",
            border: "1px dashed var(--da-border)",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <p style={{ color: "var(--da-muted-soft)", fontSize: 11, fontFamily: "var(--da-font-mono)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
            Verwandter Artikel
          </p>

          {block.articleSlug ? (
            <div>
              <div style={{ background: "var(--da-darker)", border: "1px solid var(--da-border)", borderRadius: 4, padding: 12, marginBottom: 10 }}>
                <div style={{ color: "var(--da-text)", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  {block.cachedTitle || "(ohne Titel)"}
                </div>
                <div style={{ color: "var(--da-muted-soft)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
                  /artikel/{block.articleSlug}
                </div>
                {block.cachedExcerpt && (
                  <div style={{ color: "var(--da-muted)", fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                    {block.cachedExcerpt}
                  </div>
                )}
              </div>
              <button
                type="button"
                style={toggleBtn}
                onClick={handlePick}
                disabled={!onRequestArticlePick}
              >
                Anderen Artikel wählen
              </button>
            </div>
          ) : (
            <button
              type="button"
              style={{
                width: "100%",
                background: "var(--da-darker)",
                color: "var(--da-text)",
                border: "1px dashed var(--da-border)",
                padding: "12px 14px",
                borderRadius: 4,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
              onClick={handlePick}
              disabled={!onRequestArticlePick}
            >
              Artikel auswählen…
            </button>
          )}
        </div>
      );
    }
    if (block.type === "divider") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", padding: "8px 0" }}>
          <div style={{ width: "100%", textAlign: "center" }}>
            {block.variant === "short" ? (
              <hr style={{ display: "inline-block", width: 80, height: 1, border: 0, background: "var(--da-border)" }} />
            ) : (
              <hr style={{ border: 0, borderTop: "1px solid var(--da-border)", margin: 0 }} />
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              style={block.variant === "full" ? toggleBtnActive : toggleBtn}
              onClick={() => onChange({ ...block, variant: "full" })}
            >
              Volle Linie
            </button>
            <button
              type="button"
              style={block.variant === "short" ? toggleBtnActive : toggleBtn}
              onClick={() => onChange({ ...block, variant: "short" })}
            >
              Kurz zentriert
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ position: "relative", padding: "12px 0" }}
    >
      <div
        style={{
          position: "absolute",
          left: -64,
          top: 12,
          display: hov ? "flex" : "none",
          gap: 4,
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={() => onMoveUp(block.id)}
          disabled={isFirst}
          title="Nach oben"
          style={{ ...handleBtn, opacity: isFirst ? 0.4 : 1, cursor: isFirst ? "not-allowed" : "pointer" }}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(block.id)}
          disabled={isLast}
          title="Nach unten"
          style={{ ...handleBtn, opacity: isLast ? 0.4 : 1, cursor: isLast ? "not-allowed" : "pointer" }}
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => onAddBelow(block.id)}
          title="Block darunter einfügen"
          style={handleBtn}
        >
          +
        </button>
        <button type="button" onClick={() => onDelete(block.id)} title="Löschen" style={handleBtn}>
          ×
        </button>
      </div>
      {renderBody()}
    </div>
  );
}
