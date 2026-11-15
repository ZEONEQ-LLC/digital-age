"use client";

import { useEffect, useRef, useState } from "react";

import {
  PREVIEW_MSG_DRAFT,
  PREVIEW_MSG_READY,
  PREVIEW_VIEWPORTS,
  draftPreviewPath,
  fitScale,
  type PreviewOverrides,
  type PreviewViewportId,
} from "@/lib/articles/preview";
import EditorPreviewLink from "@/components/author/EditorPreviewLink";

// Tab «Vorschau» im Editor. Zeigt den Beitrag in der echten Ansicht der
// publizierten Seite: Die Entwurfsseite (/vorschau/artikel/entwurf/<id>) laeuft
// in einem Rahmen mit der Breite des gewaehlten Geraets und wird auf den Platz
// im Editor verkleinert. Der Editor schickt ihr den aktuellen Stand, also auch
// Ungespeichertes (PREVIEW_MSG_DRAFT). Darueber, nur fuer die Redaktion: der
// Vorschau-Link zum Weitergeben samt Rueckmeldung.
type Props = {
  articleId: string;
  title: string;
  isEditor: boolean;
  published: boolean;
  dirty: boolean;
  overrides: PreviewOverrides;
};

export default function EditorPreviewTab({ articleId, title, isEditor, published, dirty, overrides }: Props) {
  const [viewport, setViewport] = useState<PreviewViewportId>("desktop");
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);
  // Nach dem Speichern neu laden: Der Rahmen holt dann den gespeicherten Stand
  // samt allem, was nur der Server kennt (Bild und Bio eines neuen Autors).
  const [reloads, setReloads] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const wasDirty = useRef(dirty);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStage({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Der Rahmen meldet sich, sobald er zuhoert.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow) return;
      if ((e.data as { type?: unknown } | null)?.type === PREVIEW_MSG_READY) setReady(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    frameRef.current?.contentWindow?.postMessage({ type: PREVIEW_MSG_DRAFT, overrides }, window.location.origin);
  }, [ready, overrides]);

  useEffect(() => {
    if (wasDirty.current && !dirty) {
      setReady(false);
      setReloads((n) => n + 1);
    }
    wasDirty.current = dirty;
  }, [dirty]);

  const vp = PREVIEW_VIEWPORTS.find((v) => v.id === viewport) ?? PREVIEW_VIEWPORTS[0];
  const scale = fitScale(stage.width, vp.width);
  const frameHeight = stage.height > 0 ? Math.round(stage.height / scale) : 800;

  return (
    <div className="epv">
      <style>{`
        .epv { display: flex; flex-direction: column; gap: 16px; }
        .epv__bar { display: flex; align-items: center; justify-content: space-between; gap: 12px 20px; flex-wrap: wrap; }
        .epv__seg { display: inline-flex; border: 1px solid var(--da-border); border-radius: 4px; overflow: hidden; }
        .epv__seg button { background: transparent; border: 0; border-right: 1px solid var(--da-border); color: var(--da-muted); padding: 8px 14px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .epv__seg button:last-child { border-right: 0; }
        .epv__seg button[aria-pressed="true"] { background: var(--da-card); color: var(--da-text); }
        .epv__note { color: var(--da-muted); font-size: 13px; white-space: nowrap; }
        .epv__note b { color: var(--da-orange); font-weight: 600; }
        .epv__open { color: var(--da-green); font-size: 13px; font-weight: 600; text-decoration: none; white-space: nowrap; }
        .epv__open:hover { text-decoration: underline; }
        .epv__stage { height: calc(100vh - 150px); min-height: 520px; display: flex; justify-content: center; overflow: hidden; }
        .epv__frame { position: relative; overflow: hidden; border: 1px solid var(--da-border); border-radius: 6px; background: #1c1c1e; }
        .epv__frame iframe { position: absolute; top: 0; left: 0; border: 0; transform-origin: 0 0; background: #1c1c1e; }
      `}</style>

      {isEditor && <EditorPreviewLink articleId={articleId} title={title} published={published} dirty={dirty} reloads={reloads} />}

      <div className="epv__bar">
        <div className="epv__seg" role="group" aria-label="Darstellung">
          {PREVIEW_VIEWPORTS.map((v) => (
            <button key={v.id} type="button" aria-pressed={viewport === v.id} onClick={() => setViewport(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        <span className="epv__note">
          {dirty ? <>So erscheint der Beitrag, <b>mit den ungespeicherten Änderungen</b></> : "So erscheint der Beitrag (gespeicherter Stand)"}
        </span>
        <a className="epv__open" href={draftPreviewPath(articleId)} target="_blank" rel="noopener">
          Gespeicherten Stand in neuem Tab öffnen ↗
        </a>
      </div>

      <div className="epv__stage" ref={stageRef}>
        {stage.width > 0 && (
          <div className="epv__frame" style={{ width: Math.round(vp.width * scale), height: stage.height }}>
            <iframe
              key={reloads}
              ref={frameRef}
              src={draftPreviewPath(articleId, true)}
              title="Vorschau des Beitrags"
              style={{ width: vp.width, height: frameHeight, transform: `scale(${scale})` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
