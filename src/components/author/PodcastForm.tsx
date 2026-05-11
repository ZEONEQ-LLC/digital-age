"use client";

import { useState, useTransition } from "react";
import AuthorCard from "@/components/author/AuthorCard";
import { createPodcast, updatePodcast, type PodcastInput } from "@/lib/podcastActions";
import { PODCAST_LANGUAGES } from "@/lib/mappers/podcastMappers";
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
  const [spotifyUrl, setSpotifyUrl] = useState(initial?.spotify_url ?? "");
  const [appleUrl, setAppleUrl] = useState(initial?.apple_podcasts_url ?? "");
  const [note, setNote] = useState(initial?.recommended_by_note ?? "");
  const [relatedSlug, setRelatedSlug] = useState(initial?.related_article_slug ?? "");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function validate(): string | null {
    if (!title.trim()) return "Titel fehlt.";
    if (title.length > 120) return "Titel zu lang (max 120).";
    if (description && description.length > 1500) return "Beschreibung zu lang (max 1500).";
    if (note && note.length > 280) return "Empfehlungs-Note zu lang (max 280).";
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    const input: PodcastInput = {
      title: title.trim(),
      description: description.trim() || null,
      cover_image_url: cover.trim() || null,
      language,
      podcast_category: category,
      spotify_url: spotifyUrl.trim() || null,
      apple_podcasts_url: appleUrl.trim() || null,
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
          <label style={labelStyle} htmlFor="pf-cover">Cover-URL</label>
          <input
            id="pf-cover"
            type="url"
            style={inputStyle}
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            placeholder="https://..."
          />
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
          <label style={labelStyle} htmlFor="pf-related">Bezug zu Artikel-Slug (optional)</label>
          <input
            id="pf-related"
            style={inputStyle}
            value={relatedSlug}
            onChange={(e) => setRelatedSlug(e.target.value)}
            placeholder="z.B. gastbeitrag-edge-ai-mittelstand"
          />
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
    </AuthorCard>
  );
}
