"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, useTransition } from "react";

import {
  formatDayCH,
  formatDecisionTime,
  previewMailto,
  previewWhatsapp,
} from "@/lib/articles/preview";
import {
  confirmPreviewApproval,
  createPreviewLink,
  getPreviewLink,
  revokePreviewLink,
  type PreviewLinkInfo,
} from "@/lib/articles/previewActions";

// Vorschau-Link im Tab «Vorschau» (nur Redaktion): erstellen, kopieren, per
// E-Mail oder WhatsApp weitergeben, sperren, und die Rueckmeldung lesen
// (Freigabe oder Aenderungswunsch). EditorPreviewLink holt und aendert den
// Link, PreviewLinkView zeigt ihn. Seit S3b: Wurde der Beitrag nach einer
// Freigabe nur noch in Kleinigkeiten geaendert, kann die Redaktion die
// Freigabe auf die aktuelle Fassung uebertragen (Unternehmensbeitraege lassen
// sich sonst nicht publizieren).
//
// Gestaltung: ein Band zwischen zwei Linien, keine Karte. Die Rueckmeldung
// steht an einer farbigen Linie links wie die Interessenbindung am Artikel.

const noSubscribe = () => () => {};

type Props = { articleId: string; title: string; published: boolean; dirty: boolean; reloads: number };

export default function EditorPreviewLink({ articleId, title, published, dirty, reloads }: Props) {
  // undefined = wird geladen, null = kein Link.
  const [info, setInfo] = useState<PreviewLinkInfo | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");

  // Beim Oeffnen und nach jedem Speichern (reloads): Ob eine Freigabe noch
  // fuer die aktuelle Fassung gilt, haengt am gespeicherten Inhalt.
  const load = useCallback(() => {
    startTransition(async () => {
      const res = await getPreviewLink(articleId);
      if (res.ok) {
        setInfo(res.link);
        setError(null);
      } else {
        setInfo(null);
        setError(res.error);
      }
    });
  }, [articleId]);
  useEffect(() => { load(); }, [load, reloads]);

  function run(action: () => ReturnType<typeof createPreviewLink>) {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const res = await action();
      if (res.ok) setInfo(res.link);
      else setError(res.error);
    });
  }

  async function copy() {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(`${origin}${info.path}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kopieren hat nicht geklappt. Bitte den Link im Feld markieren und kopieren.");
    }
  }

  return (
    <PreviewLinkView
      info={info}
      origin={origin}
      title={title}
      published={published}
      dirty={dirty}
      pending={pending}
      copied={copied}
      error={error}
      onCreate={() => run(() => createPreviewLink(articleId))}
      onRevoke={() => {
        if (window.confirm("Link sperren? Wer ihn hat, sieht den Beitrag danach nicht mehr.")) run(() => revokePreviewLink(articleId));
      }}
      onCopy={copy}
      onConfirm={() => {
        if (
          window.confirm(
            "Freigabe auf die aktuelle Fassung übertragen?\n\nNur bestätigen, wenn sich seit der Freigabe nichts Wesentliches geändert hat (Tippfehler, Tags, Bildbeschreibung). Bei inhaltlichen Änderungen bitte nochmals zur Freigabe schicken.",
          )
        ) {
          run(() => confirmPreviewApproval(articleId));
        }
      }}
    />
  );
}

type ViewProps = {
  info: PreviewLinkInfo | null | undefined;
  origin: string;
  title: string;
  published: boolean;
  dirty: boolean;
  pending: boolean;
  copied: boolean;
  error: string | null;
  onCreate: () => void;
  onRevoke: () => void;
  onCopy: () => void;
  onConfirm?: () => void;
};

export function PreviewLinkView({ info, origin, title, published, dirty, pending, copied, error, onCreate, onRevoke, onCopy, onConfirm }: ViewProps) {
  const url = info ? `${origin}${info.path}` : "";
  const st = info?.status;
  return (
    <section className="epl" aria-label="Vorschau-Link">
      <style>{`
        .epl { border-top: 1px solid var(--da-border); border-bottom: 1px solid var(--da-border); padding: 16px 0; display: flex; flex-direction: column; gap: 12px; }
        .epl__head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px 20px; flex-wrap: wrap; }
        .epl__title { color: var(--da-text); font-size: 14px; font-weight: 700; margin: 0; }
        .epl__text { color: var(--da-muted); font-size: 13px; line-height: 1.55; margin: 0; max-width: 760px; }
        .epl__row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .epl__url { flex: 1 1 320px; min-width: 0; background: var(--da-darker); border: 1px solid var(--da-border); border-radius: 4px; color: var(--da-text); padding: 9px 11px; font-family: var(--da-font-mono); font-size: 12px; }
        .epl__btn { background: transparent; color: var(--da-text); border: 1px solid var(--da-border); padding: 9px 14px; border-radius: 4px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: none; white-space: nowrap; line-height: 1.2; }
        .epl__btn--primary { background: var(--da-green); color: var(--da-dark); border-color: var(--da-green); font-weight: 700; }
        .epl__btn:disabled { opacity: 0.6; cursor: default; }
        .epl__quiet { background: none; border: 0; padding: 0; color: var(--da-muted); font: inherit; font-size: 12px; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; white-space: nowrap; }
        .epl__state { margin: 0; padding: 2px 0 2px 14px; border-left: 2px solid var(--da-border); color: var(--da-text-strong); font-size: 13px; line-height: 1.55; max-width: 760px; }
        .epl__state--ok { border-left-color: var(--da-green); }
        .epl__state--warn { border-left-color: var(--da-orange); }
        .epl__state strong { color: var(--da-text); font-weight: 600; }
        .epl__state span { display: block; white-space: pre-wrap; color: var(--da-muted); margin-top: 4px; }
        .epl__error { color: var(--da-red, #ff5c5c); font-size: 13px; margin: 0; }
      `}</style>

      <div className="epl__head">
        <h3 className="epl__title">Vorschau-Link</h3>
        {info && !info.expired && (
          <span className="epl__text">
            Gültig bis {formatDayCH(info.expiresAt)}{" · "}
            <button
              type="button"
              className="epl__quiet"
              disabled={pending}
              onClick={onRevoke}
            >
              Link sperren
            </button>
          </span>
        )}
      </div>

      {info === undefined ? (
        <p className="epl__text">Wird geladen …</p>
      ) : info === null ? (
        published ? (
          <p className="epl__text">Der Beitrag ist veröffentlicht. Zum Weitergeben reicht die öffentliche Adresse.</p>
        ) : (
          <>
            <p className="epl__text">
              Zum Weitergeben per E-Mail oder WhatsApp. Wer den Link hat, sieht den Beitrag ohne Login so, wie er erscheinen wird,
              und kann ihn unten auf der Seite freigeben oder Änderungen wünschen. Du bekommst dazu eine E-Mail.
            </p>
            <div className="epl__row">
              <button type="button" className="epl__btn epl__btn--primary" disabled={pending} onClick={onCreate}>
                {pending ? "Wird erstellt …" : "Link erstellen"}
              </button>
            </div>
          </>
        )
      ) : (
        <>
          {info.expired ? (
            <div className="epl__row">
              <p className="epl__text">Der Link ist am {formatDayCH(info.expiresAt)} abgelaufen.</p>
              {!published && (
                <button type="button" className="epl__btn" disabled={pending} onClick={onCreate}>
                  Neuen Link erstellen
                </button>
              )}
            </div>
          ) : (
            <div className="epl__row">
              <input className="epl__url" readOnly value={url} aria-label="Vorschau-Link" onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className="epl__btn epl__btn--primary" onClick={onCopy}>{copied ? "Kopiert" : "Link kopieren"}</button>
              <a className="epl__btn" href={previewMailto(title, url)}>E-Mail</a>
              <a className="epl__btn" href={previewWhatsapp(title, url)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            </div>
          )}

          {st && st.kind === "none" && !info.expired && (
            <p className="epl__state">Noch keine Rückmeldung.</p>
          )}
          {st && st.kind === "approved" && (
            <p className={`epl__state ${st.stale ? "epl__state--warn" : "epl__state--ok"}`}>
              <strong>Freigegeben am {formatDecisionTime(st.at)} von {st.by}.</strong>{" "}
              {st.stale
                ? "Der Beitrag wurde seither geändert: Die Freigabe gilt für die frühere Fassung."
                : published
                  ? ""
                  : st.confirmedAt
                    ? `Die Redaktion hat die Freigabe am ${formatDecisionTime(st.confirmedAt)} auf diese Fassung übertragen. Du kannst den Beitrag jetzt publizieren.`
                    : "Du kannst den Beitrag jetzt publizieren."}
              {st.note && <span>{st.note}</span>}
            </p>
          )}
          {st && st.kind === "approved" && st.stale && !published && onConfirm && (
            <div className="epl__row">
              <button type="button" className="epl__btn" disabled={pending || dirty} onClick={onConfirm}>
                Freigabe gilt auch für diese Fassung
              </button>
              <span className="epl__text">
                {dirty ? "Zuerst speichern." : "Nur bei Kleinigkeiten (Tippfehler, Tags, Bildbeschreibung). Sonst den Link nochmals schicken."}
              </span>
            </div>
          )}
          {st && st.kind === "changes" && (
            <p className="epl__state epl__state--warn">
              <strong>Änderungen gewünscht am {formatDecisionTime(st.at)} von {st.by}.</strong>{" "}
              {st.stale ? "Der Beitrag wurde seither geändert. Derselbe Link zeigt den neuen Stand." : ""}
              {st.note && <span>{st.note}</span>}
            </p>
          )}
          {dirty && !info.expired && (
            <p className="epl__text">Der Link zeigt den gespeicherten Stand. Ungespeicherte Änderungen sieht man dort erst nach dem Speichern.</p>
          )}
        </>
      )}
      {error && <p className="epl__error" role="alert">{error}</p>}
    </section>
  );
}
