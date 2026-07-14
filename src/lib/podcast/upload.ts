// Client-seitige Uploads fuer self-hosted Podcasts. Laufen ueber den
// Browser-Supabase-Client DIREKT in den Storage (RLS-geschuetzt), NICHT
// ueber Server Actions — Audio-Files sprengen das 5-MB-Body-Limit der
// Server Actions. Nur im Browser aufrufbar (nutzt Audio/canvas/URL).

import { createClient } from "@/lib/supabase/client";
import { slugifyPodcast } from "@/lib/podcastSlug";

const AUDIO_BUCKET = "podcast-audio";
const COVER_BUCKET = "podcast-covers";
const IMMUTABLE_CACHE = "31536000"; // 1 Jahr, Files sind immutable
const MAX_COVER_SOURCE_BYTES = 2 * 1024 * 1024; // Quelle max 2 MB

// Content-Type-Fallback aus der Extension, wenn file.type leer ist (kommt bei
// M4A/AAC in manchen Browsern vor).
const AUDIO_CONTENT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
};

function extOf(filename: string, fallback: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(dot + 1).toLowerCase() : fallback;
}

function safeName(filename: string, fallbackExt: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = extOf(filename, fallbackExt);
  const slug = slugifyPodcast(base).slice(0, 60);
  return `${slug}.${ext}`;
}

// MP3-Dauer (Sekunden, gerundet) aus dem File lesen. 0 bei Fehler.
export function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const a = document.createElement("audio");
    a.preload = "metadata";
    const url = URL.createObjectURL(file);
    a.onloadedmetadata = () => {
      const d = a.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) && d > 0 ? Math.round(d) : 0);
    };
    a.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    a.src = url;
  });
}

// Audio hochladen. Liefert public URL + Groesse + Dauer.
export async function uploadPodcastAudio(
  file: File,
): Promise<{ url: string; sizeBytes: number; durationSeconds: number }> {
  const durationSeconds = await readAudioDuration(file);
  const supabase = createClient();
  const ext = extOf(file.name, "mp3");
  const path = `${Date.now()}-${safeName(file.name, "mp3")}`;
  const contentType = file.type || AUDIO_CONTENT_TYPES[ext] || "audio/mpeg";
  const { error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(path, file, {
      cacheControl: IMMUTABLE_CACHE,
      contentType,
      upsert: false,
    });
  if (error) throw new Error(`Audio-Upload fehlgeschlagen: ${error.message}`);
  const { data } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, sizeBytes: file.size, durationSeconds };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild konnte nicht geladen werden."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

// Cover quadratisch zuschneiden (Center-Crop) auf `size` und als WebP
// exportieren. Robuster Fallback: Browser ohne WebP-Encode (aeltere Safari)
// ignorieren "image/webp" in toBlob und liefern PNG (mehrere MB) — in dem Fall
// re-encoden wir als JPEG (ueberall unterstuetzt, ~200-400 KB). Podcast-Cover
// sind quadratisch; 1400px reicht fuer Web.
async function resizeCoverSquare(
  file: File,
  size = 1400,
): Promise<{ blob: Blob; ext: string; contentType: string }> {
  const img = await loadImage(file);
  const min = Math.min(img.width, img.height);
  const sx = (img.width - min) / 2;
  const sy = (img.height - min) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas-Kontext nicht verfuegbar.");
  ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);

  const webp = await canvasToBlob(canvas, "image/webp", 0.85);
  if (webp && webp.type === "image/webp") {
    return { blob: webp, ext: "webp", contentType: "image/webp" };
  }
  // WebP nicht unterstuetzt -> JPEG-Fallback.
  const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.85);
  if (jpeg) return { blob: jpeg, ext: "jpg", contentType: "image/jpeg" };
  throw new Error("Bild-Export fehlgeschlagen.");
}

// Cover hochladen (quadratisch, WebP mit JPEG-Fallback). Liefert public URL.
export async function uploadPodcastCover(file: File): Promise<{ url: string }> {
  if (file.size > MAX_COVER_SOURCE_BYTES) {
    throw new Error("Cover-Quelle zu gross (max 2 MB).");
  }
  const { blob, ext, contentType } = await resizeCoverSquare(file);
  const supabase = createClient();
  const base = safeName(file.name, ext).replace(/\.[^.]+$/, `.${ext}`);
  const path = `${Date.now()}-${base}`;
  const { error } = await supabase.storage
    .from(COVER_BUCKET)
    .upload(path, blob, {
      cacheControl: IMMUTABLE_CACHE,
      contentType,
      upsert: false,
    });
  if (error) throw new Error(`Cover-Upload fehlgeschlagen: ${error.message}`);
  const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
