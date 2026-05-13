"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import {
  uploadArticleImage,
  deleteArticleImage,
} from "@/lib/storageActions";

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

type State =
  | { kind: "idle" }
  | { kind: "compressing" }
  | { kind: "uploading"; progress: number }
  | { kind: "success"; url: string }
  | { kind: "error"; message: string };

type Props = {
  articleId: string;
  onUploadComplete: (url: string) => void;
  onUploadError?: (error: Error) => void;
  currentImageUrl?: string;
};

// Extrahiert den Filename aus einer Supabase-Public-URL des articles-Buckets.
// Format: .../storage/v1/object/public/articles/<articleId>/<filename>
function extractArticleImageFilename(url: string): string | null {
  const match = url.match(/\/articles\/[^/]+\/([^?]+)$/);
  return match ? match[1] : null;
}

export default function ImageUploader({
  articleId,
  onUploadComplete,
  onUploadError,
  currentImageUrl,
}: Props) {
  const [state, setState] = useState<State>(
    currentImageUrl
      ? { kind: "success", url: currentImageUrl }
      : { kind: "idle" },
  );
  const [hovering, setHovering] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    if (!ALLOWED_MIMES.includes(file.type)) {
      const message = "Nur JPEG, PNG, WebP oder GIF erlaubt.";
      setState({ kind: "error", message });
      onUploadError?.(new Error(message));
      return;
    }
    if (file.size > MAX_BYTES) {
      const message = "Datei zu gross (max 5 MB).";
      setState({ kind: "error", message });
      onUploadError?.(new Error(message));
      return;
    }

    try {
      // GIFs durchlassen — Compression würde die Animation zerstören.
      let toUpload: File = file;
      if (file.type !== "image/gif") {
        setState({ kind: "compressing" });
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 2400,
          useWebWorker: true,
          fileType: "image/webp",
          initialQuality: 0.85,
        });
        const newName = file.name.replace(/\.[^.]+$/, ".webp");
        toUpload = new File([compressed], newName, { type: "image/webp" });
      }

      setState({ kind: "uploading", progress: 0 });
      const formData = new FormData();
      formData.append("file", toUpload);

      // Supabase JS-Client v2 hat kein eingebautes Progress-Event. Wir zeigen
      // einen indeterminierten Progress (50%) während der Upload läuft.
      setState({ kind: "uploading", progress: 50 });
      const { url } = await uploadArticleImage(articleId, formData);

      // Falls ein vorheriges Bild ersetzt wurde: alten File aus dem Bucket
      // entfernen. Best-Effort — Fehler werden geschluckt, das neue Bild ist
      // wichtiger als der Cleanup.
      if (currentImageUrl && currentImageUrl !== url) {
        const oldFilename = extractArticleImageFilename(currentImageUrl);
        if (oldFilename) {
          try {
            await deleteArticleImage(articleId, oldFilename);
          } catch {
            // ignore
          }
        }
      }

      setState({ kind: "success", url });
      onUploadComplete(url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload fehlgeschlagen.";
      setState({ kind: "error", message });
      onUploadError?.(err instanceof Error ? err : new Error(message));
    }
  }

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setHovering(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const isBusy = state.kind === "compressing" || state.kind === "uploading";
  const previewUrl = state.kind === "success" ? state.url : null;

  return (
    <>
      <style>{`
        .img-up {
          position: relative;
          border: 2px dashed var(--da-border);
          border-radius: 8px;
          background: var(--da-darker);
          padding: 24px;
          text-align: center;
          cursor: pointer;
          transition: border-color var(--t-fast, 150ms), background var(--t-fast, 150ms);
          font-family: var(--da-font-body);
        }
        .img-up--hover {
          border-color: var(--da-green);
          background: rgba(50, 255, 126, 0.04);
        }
        .img-up--busy { cursor: progress; }
        .img-up__icon {
          font-size: 28px;
          color: var(--da-muted);
          margin-bottom: 8px;
        }
        .img-up__hint {
          color: var(--da-muted);
          font-size: 13px;
        }
        .img-up__hint-sub {
          color: var(--da-faint);
          font-size: 11px;
          font-family: var(--da-font-mono);
          margin-top: 6px;
        }
        .img-up__status {
          color: var(--da-green);
          font-size: 13px;
          font-weight: 600;
          font-family: var(--da-font-mono);
        }
        .img-up__error {
          color: var(--da-red);
          font-size: 13px;
          font-weight: 600;
        }
        .img-up__progress {
          margin-top: 10px;
          height: 4px;
          background: var(--da-card);
          border-radius: 2px;
          overflow: hidden;
        }
        .img-up__progress-bar {
          height: 100%;
          background: var(--da-green);
          transition: width 200ms ease;
        }
        .img-up__preview-wrap {
          position: relative;
          display: inline-block;
          max-width: 100%;
        }
        .img-up__preview {
          display: block;
          max-width: 100%;
          max-height: 320px;
          width: auto;
          height: auto;
          border-radius: 6px;
          object-fit: contain;
        }
        .img-up__replace {
          margin-top: 12px;
          background: transparent;
          color: var(--da-muted);
          border: 1px solid var(--da-border);
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-family: var(--da-font-mono);
          cursor: pointer;
        }
        .img-up__replace:hover {
          color: var(--da-text);
          border-color: var(--da-muted);
        }
        .img-up__hidden { display: none; }
      `}</style>

      <div
        className={`img-up${hovering ? " img-up--hover" : ""}${isBusy ? " img-up--busy" : ""}`}
        onClick={() => !isBusy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setHovering(true);
        }}
        onDragLeave={() => setHovering(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIMES.join(",")}
          onChange={onSelect}
          className="img-up__hidden"
        />

        {previewUrl ? (
          <div onClick={(e) => e.stopPropagation()}>
            <div className="img-up__preview-wrap">
              <Image
                src={previewUrl}
                alt="Vorschau"
                width={800}
                height={320}
                className="img-up__preview"
                style={{ maxHeight: 320 }}
                unoptimized
              />
            </div>
            <button
              type="button"
              className="img-up__replace"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              Bild ersetzen
            </button>
          </div>
        ) : state.kind === "idle" ? (
          <>
            <div className="img-up__icon">⤓</div>
            <div className="img-up__hint">
              Bild hier ablegen oder klicken
            </div>
            <div className="img-up__hint-sub">
              JPEG · PNG · WebP · GIF · max 5 MB
            </div>
          </>
        ) : state.kind === "compressing" ? (
          <>
            <div className="img-up__status">Komprimiere…</div>
          </>
        ) : state.kind === "uploading" ? (
          <>
            <div className="img-up__status">Lade hoch…</div>
            <div className="img-up__progress">
              <div
                className="img-up__progress-bar"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </>
        ) : state.kind === "error" ? (
          <>
            <div className="img-up__error">{state.message}</div>
            <div className="img-up__hint-sub">Klicken um erneut zu versuchen</div>
          </>
        ) : null}
      </div>
    </>
  );
}
