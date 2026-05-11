"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import AuthorCard from "@/components/author/AuthorCard";
import PodcastForm from "@/components/author/PodcastForm";
import { deletePodcast } from "@/lib/podcastActions";
import { PODCAST_LANGUAGES } from "@/lib/mappers/podcastMappers";
import type { PodcastWithRecommender } from "@/lib/podcastApi";

type Mode = "list" | "create" | { type: "edit"; id: string };

type Props = {
  initialPodcasts: PodcastWithRecommender[];
  isEditor: boolean;
  myAuthorId: string | null;
};

export default function PodcastsManager({
  initialPodcasts,
  isEditor,
  myAuthorId,
}: Props) {
  const [podcasts, setPodcasts] = useState(initialPodcasts);
  const [mode, setMode] = useState<Mode>("list");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const canManage = (p: PodcastWithRecommender): boolean => {
    if (isEditor) return true;
    return p.recommended_by_id === myAuthorId;
  };

  function handleDelete(p: PodcastWithRecommender) {
    if (!confirm(`Empfehlung „${p.title}" wirklich löschen?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deletePodcast(p.id);
        setPodcasts((prev) => prev.filter((x) => x.id !== p.id));
        setToast("✓ Empfehlung gelöscht");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      }
    });
  }

  const editing =
    typeof mode === "object" && mode.type === "edit"
      ? podcasts.find((p) => p.id === mode.id) ?? null
      : null;

  return (
    <>
      <style>{`
        .ap-toolbar { display: flex; justify-content: flex-end; margin-bottom: 18px; }
        .ap-toolbar__btn {
          background: var(--da-green); color: var(--da-dark);
          border: none; padding: 11px 18px;
          border-radius: 4px; font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: inherit;
        }
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
        .ap-cover-fb { width: 64px; height: 64px; border-radius: 4px; background: var(--da-dark); }
        .ap-meta {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          margin-bottom: 4px; font-size: 11px;
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
        }
        .ap-row__by strong { color: var(--da-text-strong); font-weight: 600; }
        .ap-actions { display: flex; gap: 6px; }
        .ap-btn {
          background: transparent; color: var(--da-text);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: inherit;
        }
        .ap-btn:hover { border-color: var(--da-green); color: var(--da-green); }
        .ap-btn--danger:hover { border-color: var(--da-red, #ff5c5c); color: var(--da-red, #ff5c5c); }
        .ap-readonly {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
        }
        @media (max-width: 720px) {
          .ap-row { grid-template-columns: 56px 1fr; }
          .ap-cover, .ap-cover-fb { width: 56px; height: 56px; }
          .ap-actions { grid-column: 1 / -1; justify-content: flex-end; }
        }
      `}</style>

      {mode === "list" && (
        <div className="ap-toolbar">
          <button
            type="button"
            className="ap-toolbar__btn"
            onClick={() => setMode("create")}
          >
            + Podcast empfehlen
          </button>
        </div>
      )}

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
          }}
        >
          {toast}
        </div>
      )}
      {error && (
        <div
          style={{
            background: "rgba(255,92,92,0.12)",
            border: "1px solid var(--da-red, #ff5c5c)",
            color: "var(--da-red, #ff5c5c)",
            padding: "10px 14px",
            borderRadius: 6,
            fontSize: 13,
            marginBottom: 18,
          }}
        >
          {error}
        </div>
      )}

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
              const manageable = canManage(p);
              const langShort =
                PODCAST_LANGUAGES.find((l) => l.code === p.language)?.short ??
                p.language.toUpperCase();
              return (
                <div key={p.id} className="ap-row">
                  {p.cover_image_url ? (
                    <Image
                      src={p.cover_image_url}
                      alt={p.title}
                      width={64}
                      height={64}
                      className="ap-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="ap-cover-fb" />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div className="ap-meta">
                      <span className="ap-cat">{p.podcast_category}</span>
                      <span className="ap-lang">{langShort}</span>
                    </div>
                    <p className="ap-row__title">{p.title}</p>
                    <p className="ap-row__by">
                      Empfohlen von <strong>{p.recommended_by?.display_name ?? "—"}</strong>
                    </p>
                  </div>
                  <div className="ap-actions">
                    {manageable ? (
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
                          disabled={pending}
                        >
                          Löschen
                        </button>
                      </>
                    ) : (
                      <span className="ap-readonly" title="Nur eigene Empfehlungen sind editierbar">
                        Read-only
                      </span>
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
          onSaved={(saved) => {
            setPodcasts((prev) => [
              { ...saved, recommended_by: null },
              ...prev,
            ]);
            setMode("list");
            setToast("✓ Empfehlung hinzugefügt");
          }}
          onCancel={() => setMode("list")}
        />
      )}

      {typeof mode === "object" && mode.type === "edit" && editing && (
        <PodcastForm
          initial={editing}
          onSaved={(saved) => {
            setPodcasts((prev) =>
              prev.map((p) =>
                p.id === saved.id ? { ...saved, recommended_by: p.recommended_by } : p,
              ),
            );
            setMode("list");
            setToast("✓ Empfehlung aktualisiert");
          }}
          onCancel={() => setMode("list")}
        />
      )}

      {typeof mode === "object" && mode.type === "edit" && !editing && (
        <AuthorCard padding={28}>
          <p style={{ color: "var(--da-red, #ff5c5c)", fontSize: 13 }}>
            Empfehlung nicht gefunden.{" "}
            <button
              type="button"
              onClick={() => setMode("list")}
              style={{
                background: "none",
                border: "none",
                color: "var(--da-green)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Zurück zur Liste
            </button>
          </p>
        </AuthorCard>
      )}
    </>
  );
}
