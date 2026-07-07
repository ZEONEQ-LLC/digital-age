"use client";

import { forwardRef, useImperativeHandle, useState, useTransition } from "react";
import AuthorCard from "./AuthorCard";
import MonoCaption from "./MonoCaption";
import KeywordPillInput from "./KeywordPillInput";
import {
  analyzeSeoEntry,
  saveSeoReviewDone,
  generateSeoFields,
  generateSeoKeywordCandidates,
  generateSeoFromKeyword,
  type SeoFields,
  type SeoDerivedFields,
  type SeoReview,
  type SeoReviewSeverity,
  type SeoReviewCategory,
} from "@/lib/ai/seoActions";
import type { AiErrorKind } from "@/lib/ai/types";
import { isReviewStale, truncateQuote } from "@/lib/ai/seoReview";
import { normalizeArticleSlug } from "@/lib/articleSlug";

function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const reviewActionBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--da-purple)",
  border: "1px solid var(--da-purple)",
  borderRadius: 3,
  padding: "4px 10px",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

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
  // Persistiertes Review + dessen Zeitstempel (aus article.seo_review[_at]).
  initialReview?: SeoReview | null;
  initialReviewAt?: string | null;
  // article.updated_at für die Staleness-Prüfung (updated_at > reviewAt).
  articleUpdatedAt?: string | null;
  // "Im Text anzeigen": in den Inhalt-Tab wechseln + targetQuote highlighten.
  onShowInText?: (quote: string) => void;
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

// Imperativer Handle: erlaubt dem Co-Pilot (EditorClient), ein frisch
// generiertes Review direkt in den Panel-State zu spiegeln, ohne dass der
// Panel selbst analysieren muss (die Analyse laeuft im Co-Pilot-Lauf).
export type EditorSeoPanelHandle = {
  applyCopilotReview: (review: SeoReview, reviewedAt: string | null) => void;
};

const EditorSeoPanel = forwardRef<EditorSeoPanelHandle, EditorSeoPanelProps>(
  function EditorSeoPanel({
  seo,
  onChange,
  articleId,
  articleTitle = "",
  articleBodyText = "",
  articleFirstParagraph = "",
  articleHeadingsLevel2 = [],
  locale,
  initialReview = null,
  initialReviewAt = null,
  articleUpdatedAt = null,
  onShowInText,
}: EditorSeoPanelProps, ref) {
  // Master-Pipeline-State: Vorschläge + Loading + Error.
  // `dismissedKeys` trackt, welche Boxen der User per Verwerfen geschlossen
  // hat. Übernehmen schliesst nicht zwingend — der User sieht weiter den
  // Vergleich (z.B. 3 Titel-Kandidaten). Eine "Übernehmen"-Aktion auf einem
  // Title-Kandidaten dismisst das gesamte Title-Set, weil dann eine
  // konkrete Auswahl getroffen wurde.
  // Stufe 1 — Focus-Keyword-Kandidaten. `rejectedKeywords` kumuliert die über
  // mehrere Runden verworfenen Vorschläge (Session-State, nicht persistiert)
  // und geht als Negativ-Liste in den nächsten Stage-1-Call.
  const [keywordCandidates, setKeywordCandidates] = useState<string[] | null>(
    null,
  );
  const [rejectedKeywords, setRejectedKeywords] = useState<string[]>([]);
  const [keywordPending, startKeywordTransition] = useTransition();
  const [keywordError, setKeywordError] = useState<string | null>(null);

  // Stufe 2 — abgeleitete Felder aus dem gewählten Keyword. `derivingKeyword`
  // merkt sich das Keyword für den Retry, falls Stufe 2 fehlschlägt.
  const [pipelineFields, setPipelineFields] = useState<SeoDerivedFields | null>(
    null,
  );
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pipelinePending, startPipelineTransition] = useTransition();
  const [derivingKeyword, setDerivingKeyword] = useState<string | null>(null);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  // Review-State. Seed aus dem persistierten Review (überlebt Reload).
  // "Analysieren" erneut zu klicken ersetzt den State komplett, kein Append.
  // `reviewAt` ist der Persistenz-Zeitstempel (seo_review_at) für "Stand:"
  // und die Staleness-Prüfung. `copiedIndex` steuert das "Kopiert ✓"-Feedback.
  const [review, setReview] = useState<SeoReview | null>(initialReview);
  const [reviewAt, setReviewAt] = useState<string | null>(initialReviewAt);
  // Kam das aktuelle Review aus einem Co-Pilot-Lauf? Dann erklaert der
  // Staleness-Hinweis, dass der Body NACH der Analyse (Highlights/ALTs)
  // geaendert wurde — statt "erneut analysieren" (Fix 4).
  const [reviewFromCopilot, setReviewFromCopilot] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      applyCopilotReview: (r, at) => {
        setReview(r);
        setReviewAt(at);
        setReviewError(null);
        setReviewFromCopilot(true);
      },
    }),
    [],
  );
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewPending, startReviewTransition] = useTransition();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Einzel-Re-Generate pro Feld. Beide Pfade (Master "SEO generieren" und
  // die 4 Einzel-Buttons) rufen dieselbe Server-Action generateSeoFields —
  // Single Source of Truth, kein Prompt-Drift. Die Einzel-Buttons picken
  // aus dem Master-Ergebnis nur das Ziel-Feld und schreiben es ins State.
  // Die anderen Felder werden bewusst NICHT übernommen — der Editor hat
  // sie nicht angefordert.
  //
  // Ein gemeinsamer busy-Slot, weil immer nur ein Re-Generate-Call
  // gleichzeitig läuft. Error pro Feld separat, damit ein Slug-Fehler
  // den Title-Generate nicht überschreibt.
  type RegenField = "title" | "description" | "slug" | "keyword";
  const [regenBusy, setRegenBusy] = useState<RegenField | null>(null);
  const [regenErrors, setRegenErrors] = useState<
    Partial<Record<RegenField, string>>
  >({});

  // Confirm-Dialog vor Überschreiben eines nicht-leeren Felds. Analog zum
  // Abstract-Generate-Confirm im EditorClient.
  function confirmReplace(label: string, current: string): boolean {
    if (current.trim() === "") return true;
    return window.confirm(
      `Bestehender ${label} wird ersetzt. Fortfahren?`,
    );
  }

  // Gemeinsamer Re-Generate-Pfad: rufe Master-Pipeline, picke das vom
  // Caller spezifizierte Feld und schreibe es ins State. Andere Felder
  // bleiben unangetastet.
  function runRegenerate(
    field: RegenField,
    pick: (fields: SeoFields) => string,
  ) {
    setRegenBusy(field);
    setRegenErrors((prev) => ({ ...prev, [field]: undefined }));
    void (async () => {
      try {
        const result = await generateSeoFields({
          title: articleTitle,
          bodyText: articleBodyText,
          locale,
          articleId,
        });
        if (!result.ok) {
          setRegenErrors((prev) => ({
            ...prev,
            [field]: errorMessageFor(result.error),
          }));
          return;
        }
        const value = pick(result.fields).trim();
        if (!value) {
          setRegenErrors((prev) => ({
            ...prev,
            [field]: "Generierung lieferte leeren Text.",
          }));
          return;
        }
        // Ein onChange-Call mit dem Ziel-Feld. Die übrigen Master-Felder
        // werden verworfen — der Editor hat nur dieses eine angefordert.
        onChange({ ...seo, [fieldToStateKey(field)]: value });
      } finally {
        setRegenBusy(null);
      }
    })();
  }

  function fieldToStateKey(field: RegenField): keyof SeoState {
    switch (field) {
      case "title": return "title";
      case "description": return "description";
      case "slug": return "slug";
      case "keyword": return "keyword";
    }
  }

  function handleRegenerateTitle() {
    if (regenBusy) return;
    if (!confirmReplace("SEO-Titel", seo.title)) return;
    runRegenerate("title", (f) => f.titleCandidates[0]);
  }

  function handleRegenerateDescription() {
    if (regenBusy) return;
    if (!confirmReplace("Meta-Description", seo.description)) return;
    runRegenerate("description", (f) => f.metaDescription);
  }

  function handleRegenerateSlug() {
    if (regenBusy) return;
    if (!confirmReplace("URL-Slug", seo.slug)) return;
    // Slug-Format defensiv erzwingen — LLM ist nicht 100% zuverlässig
    // bei der Slug-Konvention. Derselbe Helper wird beim Master-Pfad
    // angewendet (siehe set("slug", normalizeArticleSlug(...)) unten),
    // damit beide Pfade identische Slugs liefern.
    runRegenerate("slug", (f) => normalizeArticleSlug(f.slugSuggestion));
  }

  function handleRegenerateKeyword() {
    if (regenBusy) return;
    if (!confirmReplace("Focus-Keyword", seo.keyword)) return;
    runRegenerate("keyword", (f) => f.focusKeyword);
  }

  function dismiss(key: string) {
    setDismissedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }

  // Stufe 1 starten (Master-Button). Setzt Negativ-Liste + Stage-2-Reste
  // zurück — ein frischer Lauf beginnt ohne Alt-Ausschlüsse.
  function handleGenerateCandidates() {
    setKeywordError(null);
    setKeywordCandidates(null);
    setRejectedKeywords([]);
    setPipelineFields(null);
    setPipelineError(null);
    setDerivingKeyword(null);
    setDismissedKeys(new Set());
    startKeywordTransition(async () => {
      const result = await generateSeoKeywordCandidates({
        title: articleTitle,
        bodyText: articleBodyText,
        locale,
        articleId,
        rejectedKeywords: [],
      });
      if (!result.ok) {
        setKeywordError(errorMessageFor(result.error));
        return;
      }
      setKeywordCandidates(result.candidates);
    });
  }

  // "Alle verwerfen": aktuelle Kandidaten in die Negativ-Liste aufnehmen und
  // neue generieren. Alte Kandidaten bleiben sichtbar (Buttons disabled), bis
  // der neue Satz da ist — weniger Flackern.
  function handleRejectAllCandidates() {
    const current = keywordCandidates ?? [];
    const nextRejected = [...rejectedKeywords];
    const seen = new Set(nextRejected.map((k) => k.toLowerCase()));
    for (const c of current) {
      const key = c.toLowerCase();
      if (!seen.has(key)) {
        nextRejected.push(c);
        seen.add(key);
      }
    }
    setRejectedKeywords(nextRejected);
    setKeywordError(null);
    startKeywordTransition(async () => {
      const result = await generateSeoKeywordCandidates({
        title: articleTitle,
        bodyText: articleBodyText,
        locale,
        articleId,
        rejectedKeywords: nextRejected,
      });
      if (!result.ok) {
        setKeywordError(errorMessageFor(result.error));
        return;
      }
      setKeywordCandidates(result.candidates);
    });
  }

  // Kandidat auswählen: Keyword in den seo-State übernehmen (wie das heutige
  // Übernehmen), Kandidaten-Box schliessen, Stufe 2 automatisch starten.
  function handleSelectKeyword(candidate: string) {
    onChange({ ...seo, keyword: candidate });
    setKeywordCandidates(null);
    runDerive(candidate);
  }

  // Stufe 2: Ableitung aus dem gewählten Keyword. Auch der Retry-Pfad.
  function runDerive(keyword: string) {
    setPipelineError(null);
    setPipelineFields(null);
    setDismissedKeys(new Set());
    setDerivingKeyword(keyword);
    startPipelineTransition(async () => {
      const result = await generateSeoFromKeyword({
        title: articleTitle,
        bodyText: articleBodyText,
        chosenKeyword: keyword,
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

  // Stufe-2-Fehler: erneut versuchen, ohne Stufe 1 zu wiederholen. Das
  // gewählte Keyword bleibt übernommen.
  function handleRetryDerive() {
    if (derivingKeyword) runDerive(derivingKeyword);
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
      setReviewFromCopilot(false);
      setReviewAt(result.reviewedAt);
      setCopiedIndex(null);
    });
  }

  function handleCloseReview() {
    // Nur die In-Session-Anzeige schliessen; der persistierte Stand bleibt in
    // der DB und wird beim nächsten Laden wieder gezeigt.
    setReview(null);
    setReviewAt(null);
    setReviewError(null);
    setCopiedIndex(null);
  }

  // Abhaken: done-Flag lokal togglen + sofort persistieren (fire-and-forget).
  // seo_review_at bleibt unangetastet (RPC + Trigger-Ausnahme) → "Stand:" und
  // Staleness bleiben stabil.
  function handleToggleDone(index: number) {
    if (!review) return;
    const next = {
      ...review,
      suggestions: review.suggestions.map((s, i) =>
        i === index ? { ...s, done: !s.done } : s,
      ),
    };
    setReview(next);
    void saveSeoReviewDone(articleId, next);
  }

  function handleCopyRecommendation(index: number, text: string) {
    if (!navigator.clipboard) return;
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedIndex(index);
        setTimeout(
          () => setCopiedIndex((cur) => (cur === index ? null : cur)),
          1500,
        );
      })
      .catch(() => {});
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
              Schritt 1: Focus-Keyword-Kandidaten vorschlagen. Nach deiner
              Auswahl leitet Schritt 2 Themenprofil, Title-Kandidaten,
              Meta-Description, Slug und semantische Begriffe daraus ab.
              Sprache richtet sich nach der Artikel-Locale ({locale}).
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateCandidates}
            disabled={keywordPending || pipelinePending}
            style={{
              background: "var(--da-purple)",
              color: "var(--da-dark)",
              border: "none",
              borderRadius: 4,
              padding: "12px 18px",
              fontSize: 14,
              fontWeight: 700,
              cursor: keywordPending || pipelinePending ? "not-allowed" : "pointer",
              opacity: keywordPending || pipelinePending ? 0.7 : 1,
              fontFamily: "inherit",
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {keywordPending ? "⏳ Generiere Keyword-Kandidaten…" : "✨ SEO generieren"}
          </button>
          {keywordError && (
            <p
              role="alert"
              style={{
                color: "#ff8e8e",
                fontSize: 12,
                margin: 0,
                fontFamily: "var(--da-font-mono)",
              }}
            >
              {keywordError}
            </p>
          )}
        </div>
      </AuthorCard>

      {/* Stufe 1 — Focus-Keyword-Kandidaten. */}
      {keywordCandidates && keywordCandidates.length > 0 && (
        <div style={suggestionBoxStyle}>
          <p style={suggestionCaptionStyle}>Focus-Keyword-Kandidaten</p>
          <p style={{ color: "var(--da-muted-soft)", fontSize: 11, margin: 0 }}>
            Wähle ein Keyword — daraus werden Titel, Meta-Description und
            semantische Begriffe abgeleitet.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {keywordCandidates.map((cand, i) => (
              <div
                key={`${cand}-${i}`}
                style={{
                  background: "var(--da-dark)",
                  border: "1px solid var(--da-border)",
                  borderRadius: 3,
                  padding: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <p
                  style={{
                    color: "var(--da-text)",
                    fontSize: 14,
                    fontWeight: 600,
                    margin: 0,
                    wordBreak: "break-word",
                    flex: 1,
                  }}
                >
                  {cand}
                </p>
                <button
                  type="button"
                  onClick={() => handleSelectKeyword(cand)}
                  disabled={keywordPending || pipelinePending}
                  style={{
                    ...acceptBtnStyle,
                    cursor: keywordPending || pipelinePending ? "not-allowed" : "pointer",
                    opacity: keywordPending || pipelinePending ? 0.6 : 1,
                    flex: "0 0 auto",
                  }}
                >
                  Auswählen
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleRejectAllCandidates}
              disabled={keywordPending || pipelinePending}
              style={{
                ...dismissBtnStyle,
                cursor: keywordPending || pipelinePending ? "not-allowed" : "pointer",
                opacity: keywordPending || pipelinePending ? 0.6 : 1,
              }}
            >
              {keywordPending ? "⏳ Generiere…" : "Alle verwerfen → neue Vorschläge"}
            </button>
            {rejectedKeywords.length > 0 && (
              <span style={{ color: "var(--da-muted-soft)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
                {rejectedKeywords.length} verworfen
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stufe 2 — Ableitungs-Status: Loading bzw. Fehler mit Retry. */}
      {pipelinePending && (
        <p
          style={{
            color: "var(--da-muted)",
            fontSize: 13,
            margin: 0,
            fontFamily: "var(--da-font-mono)",
          }}
        >
          ⏳ Leite SEO-Felder aus dem Keyword ab…
        </p>
      )}
      {pipelineError && !pipelinePending && (
        <div style={suggestionBoxStyle}>
          <p role="alert" style={{ color: "#ff8e8e", fontSize: 13, margin: 0 }}>
            {pipelineError}
          </p>
          {derivingKeyword && (
            <p style={{ color: "var(--da-muted-soft)", fontSize: 11, margin: 0 }}>
              Keyword „{derivingKeyword}“ bleibt übernommen.
            </p>
          )}
          <div>
            <button type="button" onClick={handleRetryDerive} style={acceptBtnStyle}>
              Erneut versuchen
            </button>
          </div>
        </div>
      )}

      {/* Vorschlags-Boxen — erscheinen nur nach erfolgreicher Ableitung. */}
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
                digital-age.ch/artikel/{normalizeArticleSlug(pipelineFields.slugSuggestion)}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    // Slug normalisieren — derselbe Helper wie der Einzel-
                    // Slug-Button. Damit liefern beide Pfade identische Slugs.
                    set("slug", normalizeArticleSlug(pipelineFields.slugSuggestion));
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
              {reviewAt && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      color: "var(--da-muted-soft)",
                      fontSize: 11,
                      fontFamily: "var(--da-font-mono)",
                    }}
                  >
                    Stand: {formatReviewDate(reviewAt)}
                  </span>
                  {isReviewStale(articleUpdatedAt, reviewAt) && (
                    <span style={{ color: "var(--da-orange, #ff9f0a)", fontSize: 11 }}>
                      {reviewFromCopilot
                        ? "Analyse aus Co-Pilot-Lauf — Body wurde danach noch angepasst (Highlights/ALT)."
                        : "Artikel wurde seit der Analyse geändert — ggf. erneut analysieren."}
                    </span>
                  )}
                </div>
              )}
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
                        opacity: s.done ? 0.55 : 1,
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            cursor: "pointer",
                            color: "var(--da-muted-soft)",
                            fontSize: 11,
                            fontFamily: "var(--da-font-mono)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={s.done}
                            onChange={() => handleToggleDone(i)}
                            aria-label="Empfehlung als erledigt markieren"
                          />
                          Erledigt
                        </label>
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
                      {s.targetQuote.trim() !== "" && (
                        <p
                          style={{
                            color: "var(--da-muted-soft)",
                            fontSize: 12,
                            margin: 0,
                            lineHeight: 1.5,
                            fontFamily: "var(--da-font-mono)",
                          }}
                        >
                          Betrifft: „{truncateQuote(s.targetQuote)}“
                        </p>
                      )}
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
                      {s.proposedText.trim() !== "" && (
                        <div
                          style={{
                            background: "var(--da-darker)",
                            border: "1px solid var(--da-border)",
                            borderRadius: 3,
                            padding: "8px 10px",
                          }}
                        >
                          <div
                            style={{
                              color: "var(--da-faint)",
                              fontSize: 9,
                              fontFamily: "var(--da-font-mono)",
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              marginBottom: 4,
                            }}
                          >
                            Text zum Einsetzen
                          </div>
                          <div
                            style={{
                              color: "var(--da-text)",
                              fontSize: 13,
                              fontFamily: "var(--da-font-mono)",
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.5,
                              wordBreak: "break-word",
                            }}
                          >
                            {s.proposedText}
                          </div>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyRecommendation(
                              i,
                              // proposedText ist der einsetzbare Wortlaut;
                              // Fallback recommendation fuer Alt-Daten ohne Feld.
                              s.proposedText.trim() !== ""
                                ? s.proposedText
                                : s.recommendation,
                            )
                          }
                          style={reviewActionBtnStyle}
                        >
                          {copiedIndex === i ? "Kopiert ✓" : "Vorschlag kopieren"}
                        </button>
                        {s.targetQuote.trim() !== "" && onShowInText && (
                          <button
                            type="button"
                            onClick={() => onShowInText(s.targetQuote)}
                            style={reviewActionBtnStyle}
                          >
                            Im Text anzeigen
                          </button>
                        )}
                      </div>
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
});

export default EditorSeoPanel;
