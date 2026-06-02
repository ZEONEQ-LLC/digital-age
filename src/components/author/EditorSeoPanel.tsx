"use client";

import { useState, useTransition } from "react";
import AuthorCard from "./AuthorCard";
import MonoCaption from "./MonoCaption";
import KeywordPillInput from "./KeywordPillInput";
import {
  analyzeSeoEntry,
  generateSeoFields,
  regenerateSeoDescription,
  regenerateSeoKeyword,
  regenerateSeoSlug,
  regenerateSeoTitle,
  type SeoFields,
  type SeoReview,
  type SeoReviewSeverity,
  type SeoReviewCategory,
} from "@/lib/ai/seoActions";
import type { AiErrorKind, AiResult } from "@/lib/ai/types";

export type SeoState = {
  title: string;
  description: string;
  slug: string;
  keyword: string;
  // Sekundär-Keywords (semantische Begriffe, gesetzt = werden persistiert).
  // Initial aus article.seo_keywords_secondary; Pipeline-Vorschläge landen
  // hier NICHT automatisch — sie werden separat in pipelineFields.semanticTerms
  // gehalten und per Klick übernommen.
  secondaryKeywords: string[];
};

type EditorSeoPanelProps = {
  seo: SeoState;
  onChange: (next: SeoState) => void;
  articleId: string;
  articleTitle?: string;
  articleBodyText?: string;
  articleFirstParagraph?: string;
  articleHeadingsLevel2?: string[];
  locale: "de-CH" | "en";
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

// AiButton bleibt rückwärtskompatibel: ohne `onClick`-Prop disabled mit
// Standard-Tooltip. Die sieben anderen AI-Stub-Buttons (4 in EditorSidebar,
// 3 hier im Panel für Description/Slug/Keyword) lassen den Prop weg.
const aiBtnStyleBase: React.CSSProperties = {
  background: "rgba(220,214,247,0.1)",
  color: "var(--da-purple)",
  border: "1px solid var(--da-purple)",
  borderRadius: 3,
  padding: "5px 10px",
  fontSize: 11,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontFamily: "inherit",
};

const AI_TOOLTIP = "AI-Features kommen in einer späteren Phase";

function AiButton({
  ariaLabel,
  onClick,
  loading,
}: {
  ariaLabel: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  const interactive = typeof onClick === "function";
  const isDisabled = !interactive || loading === true;
  return (
    <button
      type="button"
      disabled={isDisabled}
      title={interactive ? (loading ? "Generiere…" : undefined) : AI_TOOLTIP}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      onClick={interactive ? onClick : undefined}
      style={{
        ...aiBtnStyleBase,
        cursor: isDisabled ? (loading ? "wait" : "not-allowed") : "pointer",
        opacity: isDisabled ? (loading ? 0.85 : 0.6) : 1,
      }}
    >
      {loading ? "⏳" : "✨"} AI
    </button>
  );
}

// AiErrorKind plus "invalid_json" deutsche Texte.
function errorMessageFor(kind: AiErrorKind): string {
  switch (kind) {
    case "rate_limit":
      return "Limit erreicht, später erneut versuchen.";
    case "auth":
    case "config":
      return "AI aktuell nicht verfügbar.";
    case "timeout":
      return "Zeitüberschreitung — bitte erneut versuchen.";
    case "invalid_json":
      return "Antwort konnte nicht ausgelesen werden. Bitte erneut versuchen.";
    case "unknown":
    default:
      return "Vorschläge konnten nicht erstellt werden.";
  }
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

// ─────────────────────────────────────────────────────────────────────────
// Subkomponenten für die Vorschlags-Boxen
// ─────────────────────────────────────────────────────────────────────────

const suggestionBoxStyle: React.CSSProperties = {
  background: "rgba(220,214,247,0.08)",
  border: "1px solid var(--da-purple)",
  borderRadius: 4,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const suggestionCaptionStyle: React.CSSProperties = {
  color: "var(--da-purple)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontFamily: "var(--da-font-mono)",
  margin: 0,
};

const acceptBtnStyle: React.CSSProperties = {
  background: "var(--da-purple)",
  color: "var(--da-dark)",
  border: "none",
  borderRadius: 3,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const dismissBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--da-muted-soft)",
  border: "1px solid var(--da-border)",
  borderRadius: 3,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

function CountChip({ value, ideal }: { value: number; ideal?: [number, number] }) {
  const ok = ideal ? value >= ideal[0] && value <= ideal[1] : true;
  const color = ok ? "var(--da-green)" : "var(--da-orange)";
  return (
    <span
      style={{
        color,
        fontSize: 11,
        fontFamily: "var(--da-font-mono)",
      }}
    >
      {value}
      {ideal && ` · ideal ${ideal[0]}–${ideal[1]}`}
    </span>
  );
}

// Severity- + Category-Mapping für die Review-Karten. Severity steuert
// Streifen + Badge-Farbe, Category liefert nur das DE-Label am Badge.
const SEVERITY_STYLE: Record<
  SeoReviewSeverity,
  { stripe: string; badgeBg: string; badgeFg: string; label: string }
> = {
  critical: {
    stripe: "var(--da-red)",
    badgeBg: "rgba(255,80,80,0.15)",
    badgeFg: "var(--da-red)",
    label: "Kritisch",
  },
  important: {
    stripe: "var(--da-orange)",
    badgeBg: "rgba(255,140,66,0.15)",
    badgeFg: "var(--da-orange)",
    label: "Wichtig",
  },
  nice_to_have: {
    stripe: "var(--da-border)",
    badgeBg: "rgba(160,160,160,0.12)",
    badgeFg: "var(--da-muted)",
    label: "Nice-to-have",
  },
};

const CATEGORY_LABEL: Record<SeoReviewCategory, string> = {
  keyword: "Keyword",
  length: "Länge",
  numbers: "Zahlen",
  powerwords: "Powerwords",
  hook: "Hook",
  readability: "Lesbarkeit",
};

export default function EditorSeoPanel({
  seo,
  onChange,
  articleId,
  articleTitle = "",
  articleBodyText = "",
  articleFirstParagraph = "",
  articleHeadingsLevel2 = [],
  locale,
}: EditorSeoPanelProps) {
  // Master-Pipeline-State: Vorschläge + Loading + Error.
  // `dismissedKeys` trackt, welche Boxen der User per Verwerfen geschlossen
  // hat. Übernehmen schliesst nicht zwingend — der User sieht weiter den
  // Vergleich (z.B. 3 Titel-Kandidaten). Eine "Übernehmen"-Aktion auf einem
  // Title-Kandidaten dismisst das gesamte Title-Set, weil dann eine
  // konkrete Auswahl getroffen wurde.
  const [pipelineFields, setPipelineFields] = useState<SeoFields | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pipelinePending, startPipelineTransition] = useTransition();
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  // Review-State (read-only, kein Cache). "Analysieren" erneut zu klicken
  // ersetzt den State komplett, kein Append.
  const [review, setReview] = useState<SeoReview | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewPending, startReviewTransition] = useTransition();

  // Einzel-Re-Generate pro Feld. Ein gemeinsamer busy-Slot, weil immer nur
  // ein Re-Generate-Call gleichzeitig läuft (UX-konsistent). Error pro Feld
  // separat, damit ein Slug-Fehler den Title-Generate nicht überschreibt.
  type RegenField = "title" | "description" | "slug" | "keyword";
  const [regenBusy, setRegenBusy] = useState<RegenField | null>(null);
  const [regenErrors, setRegenErrors] = useState<
    Partial<Record<RegenField, string>>
  >({});

  function applyRegenResult(
    field: RegenField,
    targetKey: keyof SeoState,
    result: AiResult,
  ) {
    if (!result.ok) {
      setRegenErrors((prev) => ({ ...prev, [field]: errorMessageFor(result.kind) }));
      return;
    }
    const text = result.text.trim();
    if (!text) {
      setRegenErrors((prev) => ({ ...prev, [field]: "Generierung lieferte leeren Text." }));
      return;
    }
    onChange({ ...seo, [targetKey]: text });
  }

  // Confirm-Dialog vor Überschreiben eines nicht-leeren Felds. Analog zum
  // Abstract-Generate-Confirm im EditorClient.
  function confirmReplace(label: string, current: string): boolean {
    if (current.trim() === "") return true;
    return window.confirm(
      `Bestehender ${label} wird ersetzt. Fortfahren?`,
    );
  }

  function handleRegenerateTitle() {
    if (regenBusy) return;
    if (!confirmReplace("SEO-Titel", seo.title)) return;
    setRegenBusy("title");
    setRegenErrors((prev) => ({ ...prev, title: undefined }));
    void (async () => {
      try {
        const result = await regenerateSeoTitle({
          title: articleTitle,
          bodyText: articleBodyText,
          focusKeyword: seo.keyword || null,
          secondaryKeywords: seo.secondaryKeywords,
          currentValue: seo.title || null,
          locale,
        });
        applyRegenResult("title", "title", result);
      } finally {
        setRegenBusy(null);
      }
    })();
  }

  function handleRegenerateDescription() {
    if (regenBusy) return;
    if (!confirmReplace("Meta-Description", seo.description)) return;
    setRegenBusy("description");
    setRegenErrors((prev) => ({ ...prev, description: undefined }));
    void (async () => {
      try {
        const result = await regenerateSeoDescription({
          title: articleTitle,
          bodyText: articleBodyText,
          focusKeyword: seo.keyword || null,
          secondaryKeywords: seo.secondaryKeywords,
          currentValue: seo.description || null,
          locale,
        });
        applyRegenResult("description", "description", result);
      } finally {
        setRegenBusy(null);
      }
    })();
  }

  function handleRegenerateSlug() {
    if (regenBusy) return;
    if (!confirmReplace("URL-Slug", seo.slug)) return;
    setRegenBusy("slug");
    setRegenErrors((prev) => ({ ...prev, slug: undefined }));
    void (async () => {
      try {
        const result = await regenerateSeoSlug({
          title: articleTitle,
          focusKeyword: seo.keyword || null,
          currentValue: seo.slug || null,
          locale,
        });
        applyRegenResult("slug", "slug", result);
      } finally {
        setRegenBusy(null);
      }
    })();
  }

  function handleRegenerateKeyword() {
    if (regenBusy) return;
    if (!confirmReplace("Focus-Keyword", seo.keyword)) return;
    setRegenBusy("keyword");
    setRegenErrors((prev) => ({ ...prev, keyword: undefined }));
    void (async () => {
      try {
        const result = await regenerateSeoKeyword({
          title: articleTitle,
          bodyText: articleBodyText,
          currentValue: seo.keyword || null,
          locale,
        });
        applyRegenResult("keyword", "keyword", result);
      } finally {
        setRegenBusy(null);
      }
    })();
  }

  function dismiss(key: string) {
    setDismissedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }

  function handleGenerate() {
    setPipelineError(null);
    setPipelineFields(null);
    setDismissedKeys(new Set());
    startPipelineTransition(async () => {
      const result = await generateSeoFields({
        title: articleTitle,
        bodyText: articleBodyText,
        locale,
        articleId,
      });
      if (!result.ok) {
        setPipelineError(errorMessageFor(result.error));
        return;
      }
      setPipelineFields(result.fields);
    });
  }

  function handleAnalyze() {
    setReviewError(null);
    setReview(null);
    startReviewTransition(async () => {
      const result = await analyzeSeoEntry({
        title: articleTitle,
        firstParagraph: articleFirstParagraph,
        headingsLevel2: articleHeadingsLevel2,
        focusKeyword: seo.keyword.trim() === "" ? null : seo.keyword,
        secondaryKeywords: seo.secondaryKeywords,
        locale,
        articleId,
      });
      if (!result.ok) {
        setReviewError(errorMessageFor(result.error));
        return;
      }
      setReview(result.review);
    });
  }

  function handleCloseReview() {
    setReview(null);
    setReviewError(null);
  }

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

  const showThemenprofil = pipelineFields && !dismissedKeys.has("themenprofil");
  const showKeyword = pipelineFields && !dismissedKeys.has("keyword");
  const showTitles = pipelineFields && !dismissedKeys.has("titles");
  const showDescription = pipelineFields && !dismissedKeys.has("description");
  const showSlug = pipelineFields && !dismissedKeys.has("slug");

  // Sekundär-Keywords-Vorschläge: anzeigen, wenn die Pipeline welche
  // geliefert hat und der User die Box nicht verworfen hat. Pro Begriff
  // einzeln "Übernehmen" möglich (landet in seo.secondaryKeywords) oder
  // "Alle übernehmen".
  const showSemantic =
    pipelineFields &&
    pipelineFields.semanticTerms.length > 0 &&
    !dismissedKeys.has("semantic");
  // Begriffe filtern, die schon im State sind — keine Doppel-Pills.
  const newSemanticSuggestions = pipelineFields
    ? pipelineFields.semanticTerms.filter(
        (t) =>
          !seo.secondaryKeywords.some(
            (k) => k.toLowerCase() === t.toLowerCase(),
          ),
      )
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Master-Button — prominent oben im Tab. */}
      <AuthorCard padding={20} accent="var(--da-purple)">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div>
            <MonoCaption>AI-Pipeline</MonoCaption>
            <p style={{ color: "var(--da-muted)", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
              Generiert mit einem Klick Themenprofil, Focus-Keyword, drei
              Title-Kandidaten, Meta-Description und Slug-Vorschlag.
              Sprache richtet sich nach der Artikel-Locale ({locale}).
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={pipelinePending}
            style={{
              background: "var(--da-purple)",
              color: "var(--da-dark)",
              border: "none",
              borderRadius: 4,
              padding: "12px 18px",
              fontSize: 14,
              fontWeight: 700,
              cursor: pipelinePending ? "not-allowed" : "pointer",
              opacity: pipelinePending ? 0.7 : 1,
              fontFamily: "inherit",
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {pipelinePending ? "⏳ Generiere SEO-Vorschläge…" : "✨ SEO generieren"}
          </button>
          {pipelineError && (
            <p
              role="alert"
              style={{
                color: "#ff8e8e",
                fontSize: 12,
                margin: 0,
                fontFamily: "var(--da-font-mono)",
              }}
            >
              {pipelineError}
            </p>
          )}
        </div>
      </AuthorCard>

      {/* Vorschlags-Boxen — erscheinen nur nach erfolgreichem Generate. */}
      {pipelineFields && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {showThemenprofil && (
            <div style={suggestionBoxStyle}>
              <p style={suggestionCaptionStyle}>Themenprofil (intern)</p>
              <p
                style={{
                  color: "var(--da-text)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {pipelineFields.themenprofil}
              </p>
              <p style={{ color: "var(--da-muted-soft)", fontSize: 11, margin: 0 }}>
                Nicht persistiert — nur als Orientierung.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => dismiss("themenprofil")}
                  style={dismissBtnStyle}
                >
                  Schliessen
                </button>
              </div>
            </div>
          )}

          {showKeyword && (
            <div style={suggestionBoxStyle}>
              <p style={suggestionCaptionStyle}>Focus-Keyword</p>
              <p
                style={{
                  color: "var(--da-text)",
                  fontSize: 15,
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {pipelineFields.focusKeyword}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    set("keyword", pipelineFields.focusKeyword);
                    dismiss("keyword");
                  }}
                  style={acceptBtnStyle}
                >
                  Übernehmen
                </button>
                <button
                  type="button"
                  onClick={() => dismiss("keyword")}
                  style={dismissBtnStyle}
                >
                  Verwerfen
                </button>
              </div>
            </div>
          )}

          {showTitles && (
            <div style={suggestionBoxStyle}>
              <p style={suggestionCaptionStyle}>Title-Kandidaten (50–60 Zeichen)</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pipelineFields.titleCandidates.map((cand, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--da-dark)",
                      border: "1px solid var(--da-border)",
                      borderRadius: 3,
                      padding: 10,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 12,
                      }}
                    >
                      <p
                        style={{
                          color: "var(--da-text)",
                          fontSize: 13,
                          lineHeight: 1.45,
                          margin: 0,
                          wordBreak: "break-word",
                          flex: 1,
                        }}
                      >
                        {cand}
                      </p>
                      <CountChip value={cand.length} ideal={[50, 60]} />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          set("title", cand);
                          dismiss("titles");
                        }}
                        style={acceptBtnStyle}
                      >
                        Übernehmen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => dismiss("titles")}
                  style={dismissBtnStyle}
                >
                  Alle verwerfen
                </button>
              </div>
            </div>
          )}

          {showDescription && (
            <div style={suggestionBoxStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 12,
                }}
              >
                <p style={suggestionCaptionStyle}>Meta-Description</p>
                <CountChip value={pipelineFields.metaDescription.length} ideal={[140, 160]} />
              </div>
              <p
                style={{
                  color: "var(--da-text)",
                  fontSize: 13,
                  lineHeight: 1.55,
                  margin: 0,
                  wordBreak: "break-word",
                }}
              >
                {pipelineFields.metaDescription}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    set("description", pipelineFields.metaDescription);
                    dismiss("description");
                  }}
                  style={acceptBtnStyle}
                >
                  Übernehmen
                </button>
                <button
                  type="button"
                  onClick={() => dismiss("description")}
                  style={dismissBtnStyle}
                >
                  Verwerfen
                </button>
              </div>
            </div>
          )}

          {showSemantic && (
            <div style={suggestionBoxStyle}>
              <p style={suggestionCaptionStyle}>
                Semantische Begriffe ({newSemanticSuggestions.length} Vorschläge)
              </p>
              <p style={{ color: "var(--da-muted-soft)", fontSize: 11, margin: 0 }}>
                Beim Body-Schreiben natürlich einbauen, nicht stuffen.
                Übernommene Begriffe werden als Sekundär-Keywords gespeichert.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {newSemanticSuggestions.map((term, i) => (
                  <button
                    key={`${term}-${i}`}
                    type="button"
                    onClick={() => {
                      const key = term.toLowerCase();
                      if (seo.secondaryKeywords.some((k) => k.toLowerCase() === key)) return;
                      set("secondaryKeywords", [...seo.secondaryKeywords, term]);
                    }}
                    style={{
                      background: "rgba(220,214,247,0.10)",
                      border: "1px solid var(--da-purple)",
                      color: "var(--da-text-strong)",
                      padding: "4px 10px",
                      borderRadius: 3,
                      fontSize: 12,
                      fontFamily: "var(--da-font-mono)",
                      cursor: "pointer",
                    }}
                    aria-label={`${term} übernehmen`}
                  >
                    + {term}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    const merged = [...seo.secondaryKeywords];
                    const seen = new Set(merged.map((k) => k.toLowerCase()));
                    for (const term of newSemanticSuggestions) {
                      if (!seen.has(term.toLowerCase())) {
                        merged.push(term);
                        seen.add(term.toLowerCase());
                      }
                    }
                    set("secondaryKeywords", merged);
                    dismiss("semantic");
                  }}
                  style={acceptBtnStyle}
                >
                  Alle übernehmen
                </button>
                <button
                  type="button"
                  onClick={() => dismiss("semantic")}
                  style={dismissBtnStyle}
                >
                  Verwerfen
                </button>
              </div>
            </div>
          )}

          {showSlug && (
            <div style={suggestionBoxStyle}>
              <p style={suggestionCaptionStyle}>Slug-Vorschlag</p>
              <p
                style={{
                  color: "var(--da-text)",
                  fontSize: 14,
                  margin: 0,
                  fontFamily: "var(--da-font-mono)",
                  wordBreak: "break-word",
                }}
              >
                digital-age.ch/artikel/{pipelineFields.slugSuggestion}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    set("slug", pipelineFields.slugSuggestion);
                    dismiss("slug");
                  }}
                  style={acceptBtnStyle}
                >
                  Übernehmen
                </button>
                <button
                  type="button"
                  onClick={() => dismiss("slug")}
                  style={dismissBtnStyle}
                >
                  Verwerfen
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verbesserungsvorschläge — read-only-Analyse */}
      <AuthorCard padding={20}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <MonoCaption>Verbesserungsvorschläge</MonoCaption>
            <p style={{ color: "var(--da-muted)", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
              Analysiert H1, ersten Absatz und H2-Überschriften nach SEO-Kriterien. Ändert nichts.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={reviewPending}
            style={{
              background: "var(--da-purple)",
              color: "var(--da-dark)",
              border: "none",
              borderRadius: 4,
              padding: "12px 18px",
              fontSize: 14,
              fontWeight: 700,
              cursor: reviewPending ? "not-allowed" : "pointer",
              opacity: reviewPending ? 0.7 : 1,
              fontFamily: "inherit",
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {reviewPending ? "⏳ Analysiere…" : "✨ Analysieren"}
          </button>
          {reviewError && (
            <p
              role="alert"
              style={{
                color: "#ff8e8e",
                fontSize: 12,
                margin: 0,
                fontFamily: "var(--da-font-mono)",
              }}
            >
              {reviewError}
            </p>
          )}

          {review && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
              <div
                style={{
                  background: "rgba(220,214,247,0.08)",
                  border: "1px solid var(--da-purple)",
                  borderRadius: 4,
                  padding: 12,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1.2 }}>✨</span>
                <p
                  style={{
                    color: "var(--da-text)",
                    fontSize: 14,
                    lineHeight: 1.5,
                    margin: 0,
                    fontStyle: "italic",
                  }}
                >
                  {review.overallAssessment}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {review.suggestions.map((s, i) => {
                  const style = SEVERITY_STYLE[s.severity];
                  return (
                    <div
                      key={i}
                      style={{
                        background: "var(--da-dark)",
                        border: "1px solid var(--da-border)",
                        borderLeft: `4px solid ${style.stripe}`,
                        borderRadius: 3,
                        padding: "12px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span
                          style={{
                            background: style.badgeBg,
                            color: style.badgeFg,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            padding: "3px 8px",
                            borderRadius: 3,
                            fontFamily: "var(--da-font-mono)",
                          }}
                        >
                          {style.label}
                        </span>
                        <span
                          style={{
                            color: "var(--da-muted)",
                            fontSize: 10,
                            fontFamily: "var(--da-font-mono)",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {CATEGORY_LABEL[s.category]}
                        </span>
                      </div>
                      <p
                        style={{
                          color: "var(--da-text)",
                          fontSize: 13,
                          fontWeight: 600,
                          margin: 0,
                          lineHeight: 1.45,
                        }}
                      >
                        {s.finding}
                      </p>
                      <p
                        style={{
                          color: "var(--da-muted-soft)",
                          fontSize: 13,
                          margin: 0,
                          lineHeight: 1.55,
                        }}
                      >
                        {s.recommendation}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleCloseReview}
                  style={dismissBtnStyle}
                >
                  Schliessen
                </button>
              </div>
            </div>
          )}
        </div>
      </AuthorCard>

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
            <AiButton
              ariaLabel="AI-Vorschlag für Titel"
              onClick={handleRegenerateTitle}
              loading={regenBusy === "title"}
            />
          </div>
          {regenErrors.title && (
            <p role="alert" style={{ color: "#ff8e8e", fontSize: 12, marginTop: 6, fontFamily: "var(--da-font-mono)" }}>
              {regenErrors.title}
            </p>
          )}
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
            <AiButton
              ariaLabel="AI-Vorschlag für Description"
              onClick={handleRegenerateDescription}
              loading={regenBusy === "description"}
            />
          </div>
          {regenErrors.description && (
            <p role="alert" style={{ color: "#ff8e8e", fontSize: 12, marginTop: 6, fontFamily: "var(--da-font-mono)" }}>
              {regenErrors.description}
            </p>
          )}
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
            <AiButton
              ariaLabel="AI-Vorschlag für Slug"
              onClick={handleRegenerateSlug}
              loading={regenBusy === "slug"}
            />
          </div>
          {regenErrors.slug && (
            <p role="alert" style={{ color: "#ff8e8e", fontSize: 12, marginTop: 6, fontFamily: "var(--da-font-mono)" }}>
              {regenErrors.slug}
            </p>
          )}
        </div>

        <div style={{ marginBottom: 18 }}>
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
            <AiButton
              ariaLabel="AI-Vorschlag für Keyword"
              onClick={handleRegenerateKeyword}
              loading={regenBusy === "keyword"}
            />
          </div>
          {regenErrors.keyword && (
            <p role="alert" style={{ color: "#ff8e8e", fontSize: 12, marginTop: 6, fontFamily: "var(--da-font-mono)" }}>
              {regenErrors.keyword}
            </p>
          )}
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ color: "var(--da-text-strong)", fontSize: 13, fontWeight: 600 }}>
              Sekundär-Keywords ({seo.secondaryKeywords.length})
            </span>
            <span style={{ color: "var(--da-muted)", fontSize: 11 }}>
              Semantische Begriffe für den Body
            </span>
          </div>
          <KeywordPillInput
            value={seo.secondaryKeywords}
            onChange={(next) => set("secondaryKeywords", next)}
          />
          <p style={{ color: "var(--da-muted-soft)", fontSize: 11, marginTop: 6 }}>
            Diese Begriffe sollten im Body natürlich vorkommen. Werden im
            HTML-Meta-Tag und JSON-LD ausgespielt (Editor-Hilfe primär,
            Public-Render-Effekt gering).
          </p>
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
