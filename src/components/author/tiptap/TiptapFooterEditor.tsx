"use client";

import { useState } from "react";
import InternalArticleAutocomplete from "@/components/editor/InternalArticleAutocomplete";
import type { ArticleSearchResult } from "@/lib/articleSearchActions";

// Disclaimer-Vorlagen — 1:1 wie src/components/author/Block.tsx:364-381.
const DISCLAIMER_TEMPLATES = {
  de: {
    text: "AI war beteiligt. Verantwortung übernehmen wir.",
    linkText: "So machen wir das",
    linkUrl: "/ki-transparenz",
  },
  en: {
    text: "AI contributed. The responsibility stays with us.",
    linkText: "How we handle it",
    linkUrl: "/ki-transparenz",
  },
};

export type DisclaimerValue = {
  text: string;
  linkText: string;
  linkUrl: string;
} | null;

export type InternalCard = {
  articleSlug: string;
  cachedTitle: string;
  cachedCoverUrl?: string;
  cachedExcerpt?: string;
};

const btnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--da-border, rgba(255,255,255,0.18))",
  color: "var(--da-text, rgba(255,255,255,0.78))",
  borderRadius: 4,
  padding: "4px 10px",
  fontSize: 12,
  fontFamily: "inherit",
  cursor: "pointer",
};

function DisclaimerEditor({
  value,
  onChange,
}: {
  value: DisclaimerValue;
  onChange: (next: DisclaimerValue) => void;
}) {
  const labelStyle: React.CSSProperties = {
    color: "var(--da-faint)",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--da-font-mono)",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    margin: "12px 0 5px",
    display: "block",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--da-darker)",
    color: "var(--da-text)",
    border: "1px solid var(--da-border)",
    borderRadius: 4,
    padding: "8px 10px",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
  };

  if (!value) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, border: "1px dashed var(--da-border)", borderRadius: 6 }}>
        <span style={{ color: "var(--da-muted)", fontSize: 13 }}>Kein Disclaimer gesetzt.</span>
        <button type="button" onClick={() => onChange({ text: "", linkText: "", linkUrl: "" })} style={btnStyle}>
          + Disclaimer hinzufügen
        </button>
      </div>
    );
  }

  const applyTemplate = (lang: "de" | "en") => {
    const tpl = DISCLAIMER_TEMPLATES[lang];
    onChange({ text: tpl.text, linkText: tpl.linkText, linkUrl: tpl.linkUrl });
  };

  return (
    <div style={{ border: "1px solid var(--da-orange)", background: "rgba(255,140,66,0.04)", borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ color: "var(--da-orange)", fontSize: 11, fontFamily: "var(--da-font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
          Disclaimer
        </span>
        <button type="button" onClick={() => onChange(null)} style={{ ...btnStyle, borderColor: "var(--da-red, #ff5c5c)", color: "var(--da-red, #ff5c5c)" }}>Entfernen</button>
      </div>
      <label style={{ ...labelStyle, marginTop: 0 }}>Vorlage</label>
      <select
        style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
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
        style={{ ...inputStyle, fontSize: 14, resize: "vertical" }}
        value={value.text}
        placeholder="z.B. 'AI war beteiligt. Verantwortung übernehmen wir.'"
        onChange={(e) => onChange({ ...value, text: e.target.value })}
      />
      <label style={labelStyle}>Link-Text (optional)</label>
      <input
        style={inputStyle}
        value={value.linkText}
        placeholder="z.B. 'So machen wir das'"
        onChange={(e) => onChange({ ...value, linkText: e.target.value })}
      />
      <label style={labelStyle}>Link-URL (optional)</label>
      <input
        style={inputStyle}
        value={value.linkUrl}
        placeholder="https://… oder /seite"
        onChange={(e) => onChange({ ...value, linkUrl: e.target.value })}
      />
    </div>
  );
}

function RelatedArticlesEditor({
  items,
  onChange,
  onOpenPicker,
}: {
  items: InternalCard[];
  onChange: (next: InternalCard[]) => void;
  onOpenPicker: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.length === 0 && (
        <div style={{ padding: 14, border: "1px dashed var(--da-border)", borderRadius: 6, color: "var(--da-muted)", fontSize: 13 }}>
          Keine verwandten Artikel.
        </div>
      )}
      {items.map((it, i) => (
        <div key={i} style={{ background: "var(--da-darker)", border: "1px solid var(--da-border)", borderRadius: 6, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "var(--da-text)", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {it.cachedTitle || "(ohne Titel)"}
            </div>
            <div style={{ color: "var(--da-muted-soft)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
              /artikel/{it.articleSlug}
            </div>
          </div>
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ ...btnStyle, borderColor: "var(--da-red, #ff5c5c)", color: "var(--da-red, #ff5c5c)", flex: "0 0 auto" }}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={onOpenPicker} style={{ ...btnStyle, alignSelf: "flex-start" }}>
        + Artikel hinzufügen
      </button>
    </div>
  );
}

type Props = {
  disclaimer: DisclaimerValue;
  onChangeDisclaimer: (next: DisclaimerValue) => void;
  relatedArticles: InternalCard[];
  onChangeRelatedArticles: (next: InternalCard[]) => void;
};

export default function TiptapFooterEditor({
  disclaimer,
  onChangeDisclaimer,
  relatedArticles,
  onChangeRelatedArticles,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div style={{ background: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: 8, padding: 24, display: "flex", flexDirection: "column", gap: 18, marginTop: 14 }}>
      <div>
        <span style={{ display: "block", color: "var(--da-faint)", fontSize: 10, fontFamily: "var(--da-font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
          Footer-Elemente
        </span>
        <p style={{ color: "var(--da-muted)", fontSize: 12, margin: 0 }}>
          Werden am Artikel-Ende gerendert — Reihenfolge: Disclaimer, dann verwandte Artikel.
        </p>
      </div>
      <DisclaimerEditor value={disclaimer} onChange={onChangeDisclaimer} />
      <RelatedArticlesEditor
        items={relatedArticles}
        onChange={onChangeRelatedArticles}
        onOpenPicker={() => setPickerOpen(true)}
      />
      <InternalArticleAutocomplete
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(r: ArticleSearchResult) => {
          onChangeRelatedArticles([
            ...relatedArticles,
            {
              articleSlug: r.slug,
              cachedTitle: r.title,
              cachedCoverUrl: r.cover_image_url ?? undefined,
              cachedExcerpt: r.excerpt ?? undefined,
            },
          ]);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
