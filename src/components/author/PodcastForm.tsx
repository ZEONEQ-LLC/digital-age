"use client";

import { useMemo, useState } from "react";
import AuthorCard from "./AuthorCard";
import MonoCaption from "./MonoCaption";
import { getArticleTitleBySlug } from "@/lib/articleSlugRegistry";
import { cleanListenLinks } from "@/lib/mockPodcastApi";
import {
  PODCAST_CATEGORIES,
  PODCAST_LANGUAGES,
  type Podcast,
  type PodcastCategory,
  type PodcastInput,
  type PodcastLanguage,
  type PodcastListenLinks,
} from "@/types/podcast";

type FormState = {
  title: string;
  cover: string;
  description: string;
  language: PodcastLanguage;
  category: PodcastCategory | "";
  tagsInput: string;
  spotify: string;
  applePodcasts: string;
  youtubeMusic: string;
  audible: string;
  soundcloud: string;
  relatedArticleSlug: string;
  recommendedByNote: string;
  publishedAt: string;
};

const today = (): string => new Date().toISOString().slice(0, 10);

const blank = (): FormState => ({
  title: "",
  cover: "",
  description: "",
  language: "de",
  category: "",
  tagsInput: "",
  spotify: "",
  applePodcasts: "",
  youtubeMusic: "",
  audible: "",
  soundcloud: "",
  relatedArticleSlug: "",
  recommendedByNote: "",
  publishedAt: today(),
});

const fromPodcast = (p: Podcast): FormState => ({
  title: p.title,
  cover: p.cover,
  description: p.description,
  language: p.language,
  category: p.category,
  tagsInput: (p.tags ?? []).join(", "),
  spotify: p.listenLinks.spotify ?? "",
  applePodcasts: p.listenLinks.applePodcasts ?? "",
  youtubeMusic: p.listenLinks.youtubeMusic ?? "",
  audible: p.listenLinks.audible ?? "",
  soundcloud: p.listenLinks.soundcloud ?? "",
  relatedArticleSlug: p.relatedArticleSlug ?? "",
  recommendedByNote: p.recommendedByNote ?? "",
  publishedAt: p.publishedAt.slice(0, 10),
});

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

const inputErrorStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: "var(--da-red)",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  color: "var(--da-text-strong)",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
};

const errorStyle: React.CSSProperties = {
  color: "var(--da-red)",
  fontSize: 12,
  marginTop: 6,
  fontFamily: "var(--da-font-mono)",
};

const helperStyle: React.CSSProperties = {
  color: "var(--da-muted-soft)",
  fontSize: 11,
  marginTop: 6,
  lineHeight: 1.5,
};

const MIN_DESC = 50;
const MAX_DESC = 1500;
const MAX_NOTE = 280;
const HTTPS_RE = /^https?:\/\/.+/i;

const LISTEN_FIELDS: { key: keyof PodcastListenLinks; label: string }[] = [
  { key: "spotify",       label: "Spotify" },
  { key: "applePodcasts", label: "Apple Podcasts" },
  { key: "youtubeMusic",  label: "YouTube Music" },
  { key: "audible",       label: "Audible" },
  { key: "soundcloud",    label: "SoundCloud" },
];

type FieldKey =
  | "title" | "cover" | "description" | "category"
  | "listenLinks" | "publishedAt";

type PodcastFormProps = {
  initial?: Podcast;
  authorId: string;
  onSubmit: (input: PodcastInput) => void;
  onCancel: () => void;
  submitLabel?: string;
};

export default function PodcastForm({
  initial,
  authorId,
  onSubmit,
  onCancel,
  submitLabel,
}: PodcastFormProps) {
  const [data, setData] = useState<FormState>(initial ? fromPodcast(initial) : blank());
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setData((p) => ({ ...p, [k]: v }));
  };

  const descLen = data.description.trim().length;
  const noteLen = data.recommendedByNote.length;

  const slugLookup = useMemo(() => {
    const slug = data.relatedArticleSlug.trim();
    if (!slug) return { state: "empty" as const };
    const title = getArticleTitleBySlug(slug);
    return title ? { state: "found" as const, title } : { state: "missing" as const };
  }, [data.relatedArticleSlug]);

  const buildLinks = (): PodcastListenLinks => cleanListenLinks({
    spotify:       data.spotify,
    applePodcasts: data.applePodcasts,
    youtubeMusic:  data.youtubeMusic,
    audible:       data.audible,
    soundcloud:    data.soundcloud,
  });

  const validate = (): Partial<Record<FieldKey, string>> => {
    const out: Partial<Record<FieldKey, string>> = {};
    if (data.title.trim().length < 3) out.title = "Titel muss mindestens 3 Zeichen lang sein.";
    if (!HTTPS_RE.test(data.cover.trim())) out.cover = "Cover-URL muss mit https:// beginnen.";
    if (descLen < MIN_DESC) out.description = `Mindestens ${MIN_DESC} Zeichen — aktuell ${descLen}.`;
    else if (descLen > MAX_DESC) out.description = `Maximal ${MAX_DESC} Zeichen.`;
    if (!data.category) out.category = "Bitte Kategorie wählen.";
    if (Object.keys(buildLinks()).length === 0) out.listenLinks = "Mindestens eine Hör-Plattform angeben.";
    if (!data.publishedAt) out.publishedAt = "Datum fehlt.";
    return out;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const tags = data.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const input: PodcastInput = {
      title: data.title.trim(),
      cover: data.cover.trim(),
      description: data.description.trim(),
      language: data.language,
      category: data.category as PodcastCategory,
      tags: tags.length ? tags : undefined,
      recommendedByAuthorId: authorId,
      recommendedByNote: data.recommendedByNote.trim() || undefined,
      listenLinks: buildLinks(),
      relatedArticleSlug: data.relatedArticleSlug.trim() || undefined,
      publishedAt: data.publishedAt,
    };
    onSubmit(input);
  };

  return (
    <AuthorCard padding={28}>
      <form onSubmit={handleSubmit} noValidate>
        <MonoCaption>{initial ? "Empfehlung bearbeiten" : "Neue Empfehlung"}</MonoCaption>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="pf-title" style={labelStyle}>
            <span>Titel <span style={{ color: "var(--da-green)" }}>*</span></span>
            <span style={{ color: "var(--da-faint)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
              {data.title.length}/120
            </span>
          </label>
          <input
            id="pf-title"
            type="text"
            maxLength={120}
            value={data.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder='z.B. "Data Skeptic"'
            style={errors.title ? inputErrorStyle : inputStyle}
            aria-invalid={!!errors.title}
          />
          {errors.title && <p style={errorStyle}>{errors.title}</p>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="pf-cover" style={labelStyle}>
            <span>Cover-URL <span style={{ color: "var(--da-green)" }}>*</span></span>
          </label>
          <input
            id="pf-cover"
            type="url"
            value={data.cover}
            onChange={(e) => set("cover", e.target.value)}
            placeholder="https://..."
            style={errors.cover ? inputErrorStyle : inputStyle}
            aria-invalid={!!errors.cover}
          />
          {errors.cover && <p style={errorStyle}>{errors.cover}</p>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="pf-description" style={labelStyle}>
            <span>Beschreibung <span style={{ color: "var(--da-green)" }}>*</span></span>
            <span
              style={{
                color:
                  descLen > MAX_DESC ? "var(--da-red)"
                  : descLen >= MIN_DESC ? "var(--da-green)"
                  : "var(--da-faint)",
                fontSize: 11,
                fontFamily: "var(--da-font-mono)",
              }}
            >
              {descLen}/{MAX_DESC} (min. {MIN_DESC})
            </span>
          </label>
          <textarea
            id="pf-description"
            rows={5}
            value={data.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Worum geht's bei diesem Podcast?"
            style={{ ...(errors.description ? inputErrorStyle : inputStyle), resize: "vertical", minHeight: 100, lineHeight: 1.55 }}
            aria-invalid={!!errors.description}
          />
          {errors.description && <p style={errorStyle}>{errors.description}</p>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>
              <span>Sprache <span style={{ color: "var(--da-green)" }}>*</span></span>
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PODCAST_LANGUAGES.map((l) => {
                const active = data.language === l.code;
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => set("language", l.code)}
                    style={{
                      background: active ? "var(--da-green)" : "var(--da-dark)",
                      color: active ? "var(--da-dark)" : "var(--da-text-strong)",
                      border: `1px solid ${active ? "var(--da-green)" : "var(--da-border)"}`,
                      borderRadius: 999,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                    aria-pressed={active}
                  >
                    {l.short} · {l.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label htmlFor="pf-category" style={labelStyle}>
              <span>Kategorie <span style={{ color: "var(--da-green)" }}>*</span></span>
            </label>
            <select
              id="pf-category"
              value={data.category}
              onChange={(e) => set("category", e.target.value as PodcastCategory | "")}
              style={errors.category ? inputErrorStyle : inputStyle}
              aria-invalid={!!errors.category}
            >
              <option value="">Bitte wählen …</option>
              {PODCAST_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.category && <p style={errorStyle}>{errors.category}</p>}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="pf-tags" style={labelStyle}>
            <span>
              Tags <span style={{ color: "var(--da-faint)", fontWeight: 400, fontSize: 12 }}>optional</span>
            </span>
          </label>
          <input
            id="pf-tags"
            type="text"
            value={data.tagsInput}
            onChange={(e) => set("tagsInput", e.target.value)}
            placeholder="comma, separated, tags"
            style={inputStyle}
          />
          <p style={helperStyle}>Komma-getrennt. Werden zu Array konvertiert.</p>
        </div>

        <div style={{ marginBottom: 18 }}>
          <p style={labelStyle}>
            <span>Hör-Plattformen <span style={{ color: "var(--da-green)" }}>*</span></span>
            <span style={{ color: "var(--da-faint)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
              mind. 1
            </span>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {LISTEN_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label
                  htmlFor={`pf-${key}`}
                  style={{
                    display: "block",
                    color: "var(--da-muted)",
                    fontFamily: "var(--da-font-mono)",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </label>
                <input
                  id={`pf-${key}`}
                  type="url"
                  value={data[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder="https://..."
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
          {errors.listenLinks && <p style={errorStyle}>{errors.listenLinks}</p>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="pf-related" style={labelStyle}>
            <span>
              Verknüpfter Artikel{" "}
              <span style={{ color: "var(--da-faint)", fontWeight: 400, fontSize: 12 }}>optional · Slug</span>
            </span>
          </label>
          <input
            id="pf-related"
            type="text"
            value={data.relatedArticleSlug}
            onChange={(e) => set("relatedArticleSlug", e.target.value)}
            placeholder="z.B. data-driven-banking"
            style={inputStyle}
          />
          {slugLookup.state === "found" && (
            <p style={{ ...helperStyle, color: "var(--da-green)" }}>
              ✓ {slugLookup.title}
            </p>
          )}
          {slugLookup.state === "missing" && (
            <p style={{ ...helperStyle, color: "var(--da-orange)" }}>
              ⚠ Kein Artikel mit diesem Slug gefunden — Link wird trotzdem gesetzt.
            </p>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="pf-note" style={labelStyle}>
            <span>
              Empfehlungs-Notiz{" "}
              <span style={{ color: "var(--da-faint)", fontWeight: 400, fontSize: 12 }}>optional</span>
            </span>
            <span
              style={{
                color: noteLen > MAX_NOTE ? "var(--da-red)" : "var(--da-faint)",
                fontSize: 11,
                fontFamily: "var(--da-font-mono)",
              }}
            >
              {noteLen}/{MAX_NOTE}
            </span>
          </label>
          <textarea
            id="pf-note"
            rows={3}
            maxLength={MAX_NOTE}
            value={data.recommendedByNote}
            onChange={(e) => set("recommendedByNote", e.target.value)}
            placeholder="Warum hörenswert? Wird auf der Card als Zitat gerendert."
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <div style={{ marginBottom: 22 }}>
          <label htmlFor="pf-published" style={labelStyle}>
            <span>Veröffentlicht am <span style={{ color: "var(--da-green)" }}>*</span></span>
          </label>
          <input
            id="pf-published"
            type="date"
            value={data.publishedAt}
            onChange={(e) => set("publishedAt", e.target.value)}
            style={errors.publishedAt ? inputErrorStyle : inputStyle}
            aria-invalid={!!errors.publishedAt}
          />
          {errors.publishedAt && <p style={errorStyle}>{errors.publishedAt}</p>}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="submit"
            style={{
              background: "var(--da-green)",
              color: "var(--da-dark)",
              border: "none",
              padding: "11px 20px",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {submitLabel ?? (initial ? "Änderungen speichern" : "Empfehlung hinzufügen")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "transparent",
              color: "var(--da-text)",
              border: "1px solid var(--da-border)",
              padding: "11px 20px",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Abbrechen
          </button>
        </div>
      </form>
    </AuthorCard>
  );
}
