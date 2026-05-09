"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import AuthorCard from "@/components/author/AuthorCard";
import AuthorShell from "@/components/author/AuthorShell";
import PageTitle from "@/components/author/PageTitle";
import PodcastForm from "@/components/author/PodcastForm";
import DemoBanner from "@/components/DemoBanner";
import ExternalBadge from "@/components/ExternalBadge";
import { getArticleTitleBySlug } from "@/lib/articleSlugRegistry";
import { getAuthors, getCurrentAuthor } from "@/lib/mockAuthorApi";
import {
  createPodcast,
  deletePodcast,
  getPodcasts,
  updatePodcast,
} from "@/lib/mockPodcastApi";
import { PODCAST_LANGUAGES, type Podcast, type PodcastInput } from "@/types/podcast";
import type { Author } from "@/types/author";

type Mode = "list" | "create" | { type: "edit"; id: string };

export default function AutorPodcastsPage() {
  const currentAuthor = useMemo(() => getCurrentAuthor(), []);
  const [tick, setTick] = useState(0);
  const [mode, setMode] = useState<Mode>("list");
  const [toast, setToast] = useState<string | null>(null);

  // `tick` is a cache-buster — bumped by `refresh()` after mutations to re-read mock state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const podcasts = useMemo(() => getPodcasts(), [tick]);
  const authorsById = useMemo<Record<string, Author>>(() => {
    const out: Record<string, Author> = {};
    for (const a of getAuthors()) out[a.id] = a;
    return out;
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const refresh = () => setTick((n) => n + 1);

  const handleCreate = (input: PodcastInput) => {
    createPodcast(input);
    setMode("list");
    setToast("✓ Empfehlung hinzugefügt");
    refresh();
  };

  const handleUpdate = (id: string) => (input: PodcastInput) => {
    updatePodcast(id, input);
    setMode("list");
    setToast("✓ Empfehlung aktualisiert");
    refresh();
  };

  const handleDelete = (p: Podcast) => {
    if (!window.confirm(`Empfehlung „${p.title}" wirklich löschen?`)) return;
    deletePodcast(p.id);
    setToast("✓ Empfehlung gelöscht");
    refresh();
  };

  const editing = typeof mode === "object" && mode.type === "edit"
    ? podcasts.find((p) => p.id === mode.id) ?? null
    : null;

  return (
    <AuthorShell>
      <DemoBanner message="Daten persistieren nicht — Supabase-Integration folgt. Was du hier änderst, ist beim nächsten Reload verschwunden." />

      <PageTitle
        title="Podcasts"
        subtitle="Empfehlungen aus der Redaktion und unseren Autoren — alle laufen auf /podcasts."
        right={
          mode === "list" ? (
            <button
              type="button"
              onClick={() => setMode("create")}
              style={{
                background: "var(--da-green)",
                color: "var(--da-dark)",
                border: "none",
                padding: "11px 18px",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              + Podcast empfehlen
            </button>
          ) : null
        }
      />

      {toast && (
        <div
          role="status"
          style={{
            background: "rgba(50,255,126,0.08)",
            border: "1px solid var(--da-green)",
            color: "var(--da-green)",
            padding: "10px 14px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 18,
            animation: "da-fadein 0.25s ease",
          }}
        >
          {toast}
        </div>
      )}

      <style>{`
        .ap-row {
          display: grid;
          grid-template-columns: 64px minmax(0, 1fr) auto;
          gap: 16px; padding: 14px;
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 8px;
          align-items: center;
          margin-bottom: 10px;
        }
        .ap-cover { width: 64px; height: 64px; border-radius: 4px; object-fit: cover; display: block; }
        .ap-meta {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          margin-bottom: 4px;
          font-size: 11px;
        }
        .ap-cat {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
        }
        .ap-lang {
          font-family: var(--da-font-mono);
          font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
          padding: 2px 6px;
          border: 1px solid var(--da-faint);
          color: var(--da-muted);
          border-radius: 3px;
          line-height: 1;
        }
        .ap-row__title {
          color: var(--da-text); font-size: 14px; font-weight: 600;
          line-height: 1.35;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          margin-bottom: 4px;
        }
        .ap-row__by {
          color: var(--da-muted); font-size: 12px;
          display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;
        }
        .ap-row__by strong { color: var(--da-text-strong); font-weight: 600; }
        .ap-row__article {
          color: var(--da-faint); font-size: 11px;
          font-family: var(--da-font-mono);
        }
        .ap-actions { display: flex; gap: 6px; }
        .ap-btn {
          background: transparent; color: var(--da-text);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 12px; font-weight: 600;
          cursor: pointer;
          font-family: inherit;
        }
        .ap-btn:hover { border-color: var(--da-green); color: var(--da-green); }
        .ap-btn--danger:hover { border-color: var(--da-red); color: var(--da-red); }
        .ap-readonly {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
        }
        @media (max-width: 720px) {
          .ap-row { grid-template-columns: 56px 1fr; }
          .ap-cover { width: 56px; height: 56px; }
          .ap-actions { grid-column: 1 / -1; justify-content: flex-end; }
        }
      `}</style>

      {mode === "list" && (
        <>
          {podcasts.length === 0 ? (
            <AuthorCard padding={28}>
              <p style={{ color: "var(--da-muted)", fontSize: 13 }}>
                Noch keine Empfehlungen. Klick rechts oben auf <strong>+ Podcast empfehlen</strong>.
              </p>
            </AuthorCard>
          ) : (
            podcasts.map((p) => {
              const isOwn = p.recommendedByAuthorId === currentAuthor.id;
              const author = authorsById[p.recommendedByAuthorId];
              const langShort = PODCAST_LANGUAGES.find((l) => l.code === p.language)?.short ?? p.language.toUpperCase();
              const articleTitle = p.relatedArticleSlug ? getArticleTitleBySlug(p.relatedArticleSlug) : null;
              return (
                <div key={p.id} className="ap-row">
                  <Image
                    src={p.cover}
                    alt={p.title}
                    width={64}
                    height={64}
                    className="ap-cover"
                    unoptimized
                  />
                  <div style={{ minWidth: 0 }}>
                    <div className="ap-meta">
                      <span className="ap-cat">{p.category}</span>
                      <span className="ap-lang">{langShort}</span>
                    </div>
                    <p className="ap-row__title">{p.title}</p>
                    <div className="ap-row__by">
                      <span>
                        Empfohlen von <strong>{author?.name ?? "Unbekannt"}</strong>
                      </span>
                      {author?.type === "external" && <ExternalBadge size="xs" />}
                      {articleTitle && (
                        <>
                          <span style={{ color: "var(--da-faint)" }}>·</span>
                          <span className="ap-row__article">→ {articleTitle}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="ap-actions">
                    {isOwn ? (
                      <>
                        <button
                          type="button"
                          className="ap-btn"
                          onClick={() => setMode({ type: "edit", id: p.id })}
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          className="ap-btn ap-btn--danger"
                          onClick={() => handleDelete(p)}
                        >
                          Löschen
                        </button>
                      </>
                    ) : (
                      <span className="ap-readonly" title="Nur eigene Empfehlungen sind editierbar">Read-only</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {mode === "create" && (
        <PodcastForm
          authorId={currentAuthor.id}
          onSubmit={handleCreate}
          onCancel={() => setMode("list")}
        />
      )}

      {typeof mode === "object" && mode.type === "edit" && editing && (
        <PodcastForm
          initial={editing}
          authorId={currentAuthor.id}
          onSubmit={handleUpdate(editing.id)}
          onCancel={() => setMode("list")}
        />
      )}

      {typeof mode === "object" && mode.type === "edit" && !editing && (
        <AuthorCard padding={28}>
          <p style={{ color: "var(--da-red)", fontSize: 13 }}>
            Empfehlung nicht gefunden — vielleicht zwischenzeitlich gelöscht?{" "}
            <button
              type="button"
              onClick={() => setMode("list")}
              style={{ background: "none", border: "none", color: "var(--da-green)", cursor: "pointer", fontWeight: 600 }}
            >
              Zurück zur Liste
            </button>
          </p>
        </AuthorCard>
      )}
    </AuthorShell>
  );
}
