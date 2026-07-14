"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import AuthorCard from "@/components/author/AuthorCard";
import InternalArticleAutocomplete from "@/components/editor/InternalArticleAutocomplete";
import type { ArticleSearchResult } from "@/lib/articleSearchActions";
import { createPodcast, updatePodcast, type PodcastInput } from "@/lib/podcastActions";
import { PODCAST_LANGUAGES } from "@/lib/mappers/podcastMappers";
import { uploadPodcastAudio, uploadPodcastCover } from "@/lib/podcast/upload";
import {
  formatDuration,
  formatFileSize,
  validatePodcastSource,
  type PodcastSourceType,
} from "@/lib/podcast/format";
import type { PodcastWithRecommender } from "@/lib/podcastApi";
import type { Database } from "@/lib/database.types";

type PodcastRow = Database["public"]["Tables"]["podcasts"]["Row"];

type Props = {
  initial?: PodcastWithRecommender;
  onSaved: (saved: PodcastRow) => void;
  onCancel: () => void;
};

const CATEGORIES = [
  "KI & Forschung",
  "KI im Business",
  "News & Updates",
  "Tech & Society",
  "Future Tech",
  "Swiss AI",
  "Tools & Praxis",
];

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "var(--da-faint)",
  fontSize: 10,
  fontWeight: 700,
  fontFamily: "var(--da-font-mono)",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--da-dark)",
  border: "1px solid var(--da-border)",
  borderRadius: 4,
  color: "var(--da-text)",
  padding: "9px 12px",
  fontSize: 13,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export default function PodcastForm({ initial, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [cover, setCover] = useState(initial?.cover_image_url ?? "");
  const [language, setLanguage] = useState<PodcastInput["language"]>(
    (initial?.language as PodcastInput["language"]) ?? "de",
  );
  const [category, setCategory] = useState(initial?.podcast_category ?? CATEGORIES[0]);

  const [sourceType, setSourceType] = useState<PodcastSourceType>(
    (initial?.source_type as PodcastSourceType) ?? "external",
  );
  const [audioUrl, setAudioUrl] = useState(initial?.audio_url ?? "");
  const [durationSeconds, setDurationSeconds] = useState<number | null>(
    initial?.duration_seconds ?? null,
  );
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(
    initial?.file_size_bytes ?? null,
  );
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [coverMode, setCoverMode] = useState<"url" | "upload">("url");
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  const [aiGenerated, setAiGenerated] = useState(initial?.ai_generated ?? false);

  const [spotifyUrl, setSpotifyUrl] = useState(initial?.spotify_url ?? "");
  const [appleUrl, setAppleUrl] = useState(initial?.apple_podcasts_url ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtube_url ?? "");
  const [soundcloudUrl, setSoundcloudUrl] = useState(initial?.soundcloud_url ?? "");
  const [audibleUrl, setAudibleUrl] = useState(initial?.audible_url ?? "");
  const [note, setNote] = useState(initial?.recommended_by_note ?? "");
  const [relatedSlug, setRelatedSlug] = useState(initial?.related_article_slug ?? "");
  // Anzeige-Infos des gewaehlten Artikels (Chip). Beim Bearbeiten ist nur der
  // Slug bekannt -> als Label verwenden, bis der Editor neu auswaehlt.
  const [relatedArticle, setRelatedArticle] = useState<{
    slug: string;
    title: string;
    cover: string | null;
  } | null>(
    initial?.related_article_slug
      ? { slug: initial.related_article_slug, title: initial.related_article_slug, cover: null }
      : null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function validate(): string | null {
    if (!title.trim()) return "Titel fehlt.";
    if (title.length > 120) return "Titel zu lang (max 120).";
    if (description && description.length > 1500) return "Beschreibung zu lang (max 1500).";
    if (note && note.length > 280) return "Empfehlungs-Note zu lang (max 280).";
    const sourceError = validatePodcastSource({
      title,
      sourceType,
      audioUrl: audioUrl || null,
      externalUrls: [spotifyUrl, appleUrl, youtubeUrl, soundcloudUrl, audibleUrl],
    });
    if (sourceError) return sourceError;
    return null;
  }

  async function handleAudioSelect(file: File | undefined) {
    if (!file) return;
    setAudioError(null);
    setAudioBusy(true);
    try {
      const { url, sizeBytes, durationSeconds: dur } = await uploadPodcastAudio(file);
      setAudioUrl(url);
      setFileSizeBytes(sizeBytes);
      setDurationSeconds(dur > 0 ? dur : null);
    } catch (e) {
      setAudioError(e instanceof Error ? e.message : "Audio-Upload fehlgeschlagen.");
    } finally {
      setAudioBusy(false);
    }
  }

  async function handleCoverSelect(file: File | undefined) {
    if (!file) return;
    setCoverError(null);
    setCoverBusy(true);
    try {
      const { url } = await uploadPodcastCover(file);
      setCover(url);
    } catch (e) {
      setCoverError(e instanceof Error ? e.message : "Cover-Upload fehlgeschlagen.");
    } finally {
      setCoverBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    const isSelf = sourceType === "self_hosted";
    const input: PodcastInput = {
      title: title.trim(),
      description: description.trim() || null,
      cover_image_url: cover.trim() || null,
      language,
      podcast_category: category,
      source_type: sourceType,
      audio_url: isSelf ? audioUrl.trim() || null : null,
      duration_seconds: isSelf ? durationSeconds : null,
      file_size_bytes: isSelf ? fileSizeBytes : null,
      ai_generated: aiGenerated,
      // Plattform-Links nur fuer externe Podcasts.
      spotify_url: isSelf ? null : spotifyUrl.trim() || null,
      apple_podcasts_url: isSelf ? null : appleUrl.trim() || null,
      youtube_url: isSelf ? null : youtubeUrl.trim() || null,
      soundcloud_url: isSelf ? null : soundcloudUrl.trim() || null,
      audible_url: isSelf ? null : audibleUrl.trim() || null,
      recommended_by_note: note.trim() || null,
      related_article_slug: relatedSlug.trim() || null,
    };
    startTransition(async () => {
      try {
        const saved = initial
          ? await updatePodcast(initial.id, input)
          : await createPodcast(input);
        onSaved(saved);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <AuthorCard padding={28}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {error && (
          <div
            style={{
              background: "rgba(255,92,92,0.12)",
              border: "1px solid var(--da-red, #ff5c5c)",
              color: "var(--da-red, #ff5c5c)",
              padding: "10px 14px",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div>
          <span style={labelStyle}>Quellentyp</span>
          <div style={{ display: "flex", gap: 8 }}>
            {(["external", "self_hosted"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSourceType(st)}
                aria-pressed={sourceType === st}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  background: sourceType === st ? "var(--da-green)" : "transparent",
                  color: sourceType === st ? "var(--da-dark)" : "var(--da-muted-soft)",
                  border: `1px solid ${sourceType === st ? "var(--da-green)" : "var(--da-border)"}`,
                }}
              >
                {st === "external" ? "Externer Podcast" : "Self-hosted (Audio-Upload)"}
              </button>
            ))}
          </div>
        </div>

        {sourceType === "self_hosted" && (
          <div>
            <label style={labelStyle} htmlFor="pf-audio">Audio-File (MP3/M4A, max 200 MB)</label>
            <input
              id="pf-audio"
              type="file"
              accept="audio/mpeg,audio/mp4,audio/aac,audio/x-m4a,audio/wav,.m4a"
              disabled={audioBusy}
              onChange={(e) => handleAudioSelect(e.target.files?.[0])}
              style={{ ...inputStyle, padding: "7px 12px" }}
            />
            {audioBusy && (
              <p style={{ color: "var(--da-muted)", fontSize: 12, marginTop: 6 }}>Lädt hoch…</p>
            )}
            {audioError && (
              <p style={{ color: "var(--da-red, #ff5c5c)", fontSize: 12, marginTop: 6 }}>{audioError}</p>
            )}
            {audioUrl && !audioBusy && (
              <p style={{ color: "var(--da-green)", fontSize: 12, marginTop: 6, fontFamily: "var(--da-font-mono)" }}>
                ✓ Audio gesetzt{durationSeconds ? ` · ${formatDuration(durationSeconds)}` : ""}
                {fileSizeBytes ? ` · ${formatFileSize(fileSizeBytes)}` : ""}
              </p>
            )}
          </div>
        )}

        <div>
          <label style={labelStyle} htmlFor="pf-title">Titel</label>
          <input
            id="pf-title"
            style={inputStyle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Der ARD KI-Podcast"
            maxLength={120}
            required
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="pf-desc">Beschreibung</label>
          <textarea
            id="pf-desc"
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="1-2 Sätze, was diesen Podcast hörenswert macht."
            maxLength={1500}
          />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ ...labelStyle, marginBottom: 0 }}>Cover</span>
            <div style={{ display: "flex", gap: 6 }}>
              {(["url", "upload"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setCoverMode(m)}
                  aria-pressed={coverMode === m}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 3,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "var(--da-font-mono)",
                    cursor: "pointer",
                    background: coverMode === m ? "var(--da-green)" : "transparent",
                    color: coverMode === m ? "var(--da-dark)" : "var(--da-muted-soft)",
                    border: `1px solid ${coverMode === m ? "var(--da-green)" : "var(--da-border)"}`,
                  }}
                >
                  {m === "url" ? "Externe URL" : "Upload"}
                </button>
              ))}
            </div>
          </div>
          {coverMode === "url" ? (
            <input
              id="pf-cover"
              type="url"
              style={inputStyle}
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              placeholder="https://... (z.B. Apple-Podcast-Cover)"
            />
          ) : (
            <input
              id="pf-cover-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={coverBusy}
              onChange={(e) => handleCoverSelect(e.target.files?.[0])}
              style={{ ...inputStyle, padding: "7px 12px" }}
            />
          )}
          {coverBusy && (
            <p style={{ color: "var(--da-muted)", fontSize: 12, marginTop: 6 }}>Verarbeite & lade hoch…</p>
          )}
          {coverError && (
            <p style={{ color: "var(--da-red, #ff5c5c)", fontSize: 12, marginTop: 6 }}>{coverError}</p>
          )}
          {cover && !coverBusy && (
            <p style={{ color: "var(--da-green)", fontSize: 12, marginTop: 6, fontFamily: "var(--da-font-mono)", wordBreak: "break-all" }}>
              ✓ {cover}
            </p>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle} htmlFor="pf-lang">Sprache</label>
            <select
              id="pf-lang"
              style={inputStyle}
              value={language}
              onChange={(e) => setLanguage(e.target.value as PodcastInput["language"])}
            >
              {PODCAST_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.short} · {l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="pf-cat">Kategorie</label>
            <select
              id="pf-cat"
              style={inputStyle}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {sourceType === "external" && (
        <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle} htmlFor="pf-spotify">Spotify-URL</label>
            <input
              id="pf-spotify"
              type="url"
              style={inputStyle}
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              placeholder="https://open.spotify.com/..."
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="pf-apple">Apple Podcasts URL</label>
            <input
              id="pf-apple"
              type="url"
              style={inputStyle}
              value={appleUrl}
              onChange={(e) => setAppleUrl(e.target.value)}
              placeholder="https://podcasts.apple.com/..."
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle} htmlFor="pf-youtube">YouTube-URL</label>
            <input
              id="pf-youtube"
              type="url"
              style={inputStyle}
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/..."
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="pf-soundcloud">SoundCloud-URL</label>
            <input
              id="pf-soundcloud"
              type="url"
              style={inputStyle}
              value={soundcloudUrl}
              onChange={(e) => setSoundcloudUrl(e.target.value)}
              placeholder="https://soundcloud.com/..."
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="pf-audible">Audible-URL</label>
            <input
              id="pf-audible"
              type="url"
              style={inputStyle}
              value={audibleUrl}
              onChange={(e) => setAudibleUrl(e.target.value)}
              placeholder="https://audible.com/..."
            />
          </div>
        </div>
        </>
        )}

        <div>
          <label style={labelStyle} htmlFor="pf-note">Empfehlungs-Note (optional, max 280)</label>
          <textarea
            id="pf-note"
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Warum empfiehlst du das?"
            maxLength={280}
          />
        </div>

        <div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={aiGenerated}
              onChange={(e) => setAiGenerated(e.target.checked)}
              style={{ marginTop: 2, accentColor: "var(--da-green)" }}
            />
            <span style={{ fontSize: 13, color: "var(--da-text)", lineHeight: 1.5 }}>
              KI-generiert (z.B. NotebookLM)
              <span style={{ display: "block", color: "var(--da-muted)", fontSize: 12 }}>
                Zeigt einen Transparenz-Hinweis auf Karte und Detailseite.
              </span>
            </span>
          </label>
        </div>

        <div>
          <span style={labelStyle}>Verwandter Artikel (optional)</span>
          {relatedArticle ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 10px",
                background: "var(--da-dark)",
                border: "1px solid var(--da-border)",
                borderRadius: 4,
              }}
            >
              <div style={{ position: "relative", width: 48, height: 32, flexShrink: 0, borderRadius: 3, overflow: "hidden", background: "var(--da-darker)" }}>
                {relatedArticle.cover && (
                  <Image src={relatedArticle.cover} alt="" fill sizes="48px" unoptimized style={{ objectFit: "cover" }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--da-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {relatedArticle.title}
              </div>
              <button
                type="button"
                onClick={() => {
                  setRelatedArticle(null);
                  setRelatedSlug("");
                }}
                aria-label="Verwandten Artikel entfernen"
                style={{
                  flexShrink: 0,
                  background: "transparent",
                  border: "1px solid var(--da-border)",
                  color: "var(--da-muted-soft)",
                  borderRadius: 4,
                  padding: "4px 8px",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Entfernen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              style={{
                width: "100%",
                background: "transparent",
                border: "1px dashed var(--da-border)",
                color: "var(--da-muted-soft)",
                borderRadius: 4,
                padding: "10px 12px",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              + Verwandten Artikel auswählen
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            style={{
              background: "transparent",
              color: "var(--da-muted-soft)",
              border: "1px solid var(--da-border)",
              padding: "9px 16px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={pending}
            style={{
              background: "var(--da-green)",
              color: "var(--da-dark)",
              border: "none",
              padding: "9px 18px",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 700,
              cursor: pending ? "wait" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {pending ? "Speichert…" : initial ? "Aktualisieren" : "Empfehlen"}
          </button>
        </div>
      </form>

      <InternalArticleAutocomplete
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(r: ArticleSearchResult) => {
          setRelatedSlug(r.slug);
          setRelatedArticle({ slug: r.slug, title: r.title, cover: r.cover_image_url });
        }}
      />
    </AuthorCard>
  );
}
