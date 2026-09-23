"use client";

import { useRef, useState } from "react";
import { deleteCreativeImage, uploadCreativeImage } from "@/lib/ads/imageActions";
import { moduleImageUrl } from "@/lib/ads/imagePath";
import { expectedSize, type PlacementCode } from "@/lib/ads/placements";

// Upload-Feld fuer Bild-Kreative (Admin). Drag-and-drop-UI und Zustands-
// maschine aus editor/ImageUploader.tsx uebernommen, ohne Kompression (G4):
// die Datei geht unveraendert an uploadCreativeImage, das Masse und Format
// serverseitig prueft (G2).
export type CreativeImage = { path: string; width: number; height: number };

type State =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "error"; message: string };

type Props = {
  campaignId: string;
  variant: "desktop" | "mobile";
  placementCode: PlacementCode | null;
  value: CreativeImage | null;
  onChange: (next: CreativeImage | null) => void;
};

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 2 * 1024 * 1024;

export function formatHint(placementCode: PlacementCode | null, variant: "desktop" | "mobile"): string {
  if (!placementCode) return "Zuerst Platzierung wählen.";
  const exp = expectedSize(placementCode, variant);
  if (!exp) return "Diese Platzierung liefert in dieser Variante nicht aus.";
  return `${exp.w} × ${exp.h} px (oder ${exp.w * 2} × ${exp.h * 2} für Retina), max 2 MB, JPG/PNG/WebP/GIF`;
}

export default function CreativeImageUploader({ campaignId, variant, placementCode, value, onChange }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [hovering, setHovering] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const busy = state.kind === "uploading";

  async function handleFile(file: File) {
    if (!placementCode) { setState({ kind: "error", message: "Bitte zuerst eine Platzierung wählen." }); return; }
    if (!ALLOWED.includes(file.type)) { setState({ kind: "error", message: "Nur JPG, PNG, WebP oder GIF erlaubt." }); return; }
    if (file.size > MAX_BYTES) { setState({ kind: "error", message: "Datei zu gross (max 2 MB)." }); return; }
    setState({ kind: "uploading" });
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadCreativeImage(campaignId, variant, placementCode, fd);
    if (!res.ok) { setState({ kind: "error", message: res.error }); return; }
    // Vorheriges, noch nicht gespeichertes Motiv im Bucket entfernen.
    if (value && value.path !== res.path) { try { await deleteCreativeImage(value.path); } catch { /* ignore */ } }
    setState({ kind: "idle" });
    onChange({ path: res.path, width: res.width, height: res.height });
  }

  async function remove() {
    if (!value) return;
    try { await deleteCreativeImage(value.path); } catch { /* ignore */ }
    onChange(null);
  }

  return (
    <>
      <style>{`
        .cr-up {
          position: relative; border: 2px dashed var(--da-border); border-radius: 8px;
          background: var(--da-darker); padding: 20px; text-align: center; cursor: pointer;
          transition: border-color var(--t-fast, 150ms), background var(--t-fast, 150ms);
        }
        .cr-up--hover { border-color: var(--da-green); background: rgba(50, 255, 126, 0.04); }
        .cr-up--busy { cursor: progress; }
        .cr-up__hint { color: var(--da-muted); font-size: 13px; }
        .cr-up__sub { color: var(--da-faint); font-size: 11px; font-family: var(--da-font-mono); margin-top: 6px; }
        .cr-up__err { color: #ff6b6b; font-size: 13px; font-weight: 600; margin-top: 8px; }
        .cr-up__pic { display: block; max-width: 100%; max-height: 320px; width: auto; height: auto; margin: 0 auto; border-radius: 6px; }
        .cr-up__meta { color: var(--da-muted); font-size: 12px; font-family: var(--da-font-mono); margin-top: 8px; }
        .cr-up__btn { margin: 10px 4px 0; background: transparent; color: var(--da-muted); border: 1px solid var(--da-border); padding: 5px 10px; border-radius: 4px; font-size: 12px; font-family: var(--da-font-mono); cursor: pointer; }
        .cr-up__btn:hover { color: var(--da-text); border-color: var(--da-muted); }
        .cr-up__hidden { display: none; }
      `}</style>
      <div
        className={`cr-up${hovering ? " cr-up--hover" : ""}${busy ? " cr-up--busy" : ""}`}
        onClick={() => !busy && !value && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setHovering(true); }}
        onDragLeave={() => setHovering(false)}
        onDrop={(e) => { e.preventDefault(); setHovering(false); const f = e.dataTransfer.files?.[0]; if (f && !busy) void handleFile(f); }}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          className="cr-up__hidden"
          type="file"
          accept={ALLOWED.join(",")}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
        />
        {value ? (
          <div onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="cr-up__pic" src={moduleImageUrl(value.path)} alt="" />
            <div className="cr-up__meta">{value.width} × {value.height} px</div>
            <button type="button" className="cr-up__btn" disabled={busy} onClick={() => inputRef.current?.click()}>Ersetzen</button>
            <button type="button" className="cr-up__btn" disabled={busy} onClick={() => void remove()}>Entfernen</button>
          </div>
        ) : (
          <>
            <div className="cr-up__hint">{busy ? "Wird hochgeladen …" : "Motiv hierher ziehen oder klicken"}</div>
            <div className="cr-up__sub">{formatHint(placementCode, variant)}</div>
          </>
        )}
        {state.kind === "error" && <div className="cr-up__err">{state.message}</div>}
      </div>
    </>
  );
}
