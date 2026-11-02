"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approvePodcastDraft, discardPodcastDraft, retryPodcastIngest } from "@/lib/podcasts/approvalActions";
import type { ApprovalItem } from "@/lib/podcasts/approvalsApi";
import { PODCAST_LANGUAGES } from "@/lib/mappers/podcastMappers";

type Props = { items: ApprovalItem[] };

function langLabel(code: string): string {
  return PODCAST_LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

function formatDuration(sec: number | null): string | null {
  if (!sec) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h} Std. ${m} Min.` : `${m} Min.`;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("de-CH", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" });
}

export default function FreigabenClient({ items }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(id: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const res = await fn();
      setBusyId(null);
      if (!res.ok) { setError(res.error ?? "Fehler."); return; }
      router.refresh();
    });
  }

  return (
    <div className="fg">
      <style>{`
        .fg { display: flex; flex-direction: column; gap: 16px; max-width: 720px; }
        .fg__empty { color: var(--da-muted); font-size: 15px; padding: 32px 0; text-align: center; }
        .fg__error { color: #ff6b6b; font-size: 14px; margin: 0; }
        .fg__card { background: var(--da-card, #141416); border: 1px solid var(--da-border); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
        .fg__head { display: flex; gap: 14px; align-items: flex-start; }
        .fg__cover { width: 84px; height: 84px; border-radius: 10px; object-fit: cover; flex: none; background: var(--da-border); }
        .fg__cover--empty { display: flex; align-items: center; justify-content: center; color: var(--da-muted); font-size: 24px; }
        .fg__title { color: var(--da-text); font-family: var(--da-font-display); font-size: 18px; font-weight: 700; line-height: 1.25; margin: 0 0 6px; }
        .fg__meta { color: var(--da-muted); font-size: 12px; line-height: 1.5; display: flex; flex-wrap: wrap; gap: 4px 10px; }
        .fg__pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; }
        .fg__pill--ready { background: rgba(74, 222, 128, 0.14); color: var(--da-green); }
        .fg__pill--pending { background: rgba(251, 191, 36, 0.14); color: var(--da-orange); }
        .fg__pill--failed { background: rgba(255, 107, 107, 0.14); color: #ff6b6b; }
        .fg__desc { color: var(--da-text); font-size: 15px; line-height: 1.55; margin: 0; }
        .fg__note { color: var(--da-muted); font-size: 13px; line-height: 1.5; margin: 0; }
        .fg__links { display: flex; flex-wrap: wrap; gap: 6px; }
        .fg__chip { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 600; border: 1px solid var(--da-border); color: var(--da-text); text-decoration: none; }
        .fg__chip:hover { border-color: var(--da-muted); }
        .fg__chip--missing { color: var(--da-muted); border-style: dashed; }
        .fg__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .fg__btn { border-radius: 10px; padding: 14px 12px; font-size: 15px; font-weight: 700; border: 1px solid var(--da-border); background: transparent; color: var(--da-text); cursor: pointer; }
        .fg__btn:disabled { opacity: 0.5; cursor: default; }
        .fg__btn--primary { background: var(--da-green); border-color: var(--da-green); color: #0b0b0c; }
        .fg__btn--danger { color: #ff6b6b; }
        .fg__foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
        .fg__link { color: var(--da-muted); font-size: 13px; text-decoration: none; }
        .fg__link:hover { color: var(--da-text); text-decoration: underline; }
        .fg__small { padding: 8px 12px; font-size: 13px; font-weight: 600; }
        @media (min-width: 640px) { .fg__actions { max-width: 480px; } }
      `}</style>

      {error && <p className="fg__error">{error}</p>}
      {items.length === 0 && <p className="fg__empty">Nichts offen. Geteilte Folgen erscheinen hier, sobald der Kurzbefehl sie geschickt hat.</p>}

      {items.map((it) => {
        const status = it.ingest_status ?? "ready";
        const busy = pending && busyId === it.id;
        const kind = it.apple_episode_id ? "Folge" : "Podcast";
        const dur = formatDuration(it.duration_seconds);
        return (
          <article key={it.id} className="fg__card">
            <div className="fg__head">
              {it.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="fg__cover" src={it.cover_image_url} alt="" />
              ) : (
                <div className="fg__cover fg__cover--empty" aria-hidden>♫</div>
              )}
              <div style={{ minWidth: 0 }}>
                <h2 className="fg__title">{it.title}</h2>
                <div className="fg__meta">
                  <span className={`fg__pill fg__pill--${status}`}>
                    {status === "ready" ? "Bereit" : status === "pending" ? "KI ergänzt …" : "Fehlgeschlagen"}
                  </span>
                  <span>{kind}</span>
                  <span>{it.podcast_category}</span>
                  <span>{langLabel(it.language)}</span>
                  {dur && <span>{dur}</span>}
                  <span>Erhalten {formatWhen(it.recommended_at)}</span>
                </div>
              </div>
            </div>

            {it.description ? (
              <p className="fg__desc">{it.description}</p>
            ) : status === "pending" ? (
              <p className="fg__note">Beschreibung, Kategorie und Sprache werden gerade ergänzt. Seite in ein paar Sekunden neu laden.</p>
            ) : (
              <p className="fg__note">Keine Beschreibung. Veröffentlichen ist trotzdem möglich, besser zuerst am Desktop ergänzen.</p>
            )}
            {status === "failed" && it.ingest_error && (
              <p className="fg__note">Grund: {it.ingest_error}</p>
            )}

            {status !== "pending" && (
              <div className="fg__links" aria-label="Plattform-Links">
                {it.apple_podcasts_url && <a className="fg__chip" href={it.apple_podcasts_url} target="_blank" rel="noopener">Apple Podcasts</a>}
                {it.spotify_url ? <a className="fg__chip" href={it.spotify_url} target="_blank" rel="noopener">Spotify</a> : <span className="fg__chip fg__chip--missing">Spotify fehlt</span>}
                {it.youtube_url ? <a className="fg__chip" href={it.youtube_url} target="_blank" rel="noopener">YouTube</a> : <span className="fg__chip fg__chip--missing">YouTube fehlt</span>}
              </div>
            )}

            <div className="fg__actions">
              <button type="button" className="fg__btn fg__btn--primary" disabled={pending || status === "pending"} onClick={() => run(it.id, () => approvePodcastDraft(it.id))}>
                {busy ? "…" : "Veröffentlichen"}
              </button>
              <button type="button" className="fg__btn fg__btn--danger" disabled={pending} onClick={() => { if (confirm(`«${it.title}» verwerfen? Der Entwurf wird gelöscht.`)) run(it.id, () => discardPodcastDraft(it.id)); }}>
                Verwerfen
              </button>
            </div>

            <div className="fg__foot">
              <span style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <Link className="fg__link" href="/autor/podcasts">Am Desktop bearbeiten</Link>
              </span>
              {status !== "pending" && (
                <button type="button" className="fg__btn fg__small" disabled={pending} onClick={() => run(it.id, () => retryPodcastIngest(it.id))}>
                  {status === "failed" ? "Erneut versuchen" : "KI neu erzeugen"}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
