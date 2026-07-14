// Client-seitige Uploads fuer self-hosted Podcasts. Laufen ueber den
// Browser-Supabase-Client DIREKT in den Storage (RLS-geschuetzt), NICHT
// ueber Server Actions — Audio-Files sprengen das 5-MB-Body-Limit der
// Server Actions. Nur im Browser aufrufbar (nutzt Audio/canvas/URL).

import { createClient } from "@/lib/supabase/client";
import { slugifyPodcast } from "@/lib/podcastSlug";

const AUDIO_BUCKET = "podcast-audio";
const COVER_BUCKET = "podcast-covers";
const IMMUTABLE_CACHE = "31536000"; // 1 Jahr, Files sind immutable

function safeName(filename: string, fallbackExt: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot + 1).toLowerCase() : fallbackExt;
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
  const path = `${Date.now()}-${safeName(file.name, "mp3")}`;
  const { error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(path, file, {
      cacheControl: IMMUTABLE_CACHE,
      contentType: file.type || "audio/mpeg",
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

// Cover quadratisch zuschneiden (Center-Crop), auf `size` skalieren und als
// WebP exportieren. Podcast-Standard ist quadratisch; 1400px reicht fuer Web.
async function resizeCoverToWebpSquare(file: File, size = 1400): Promise<Blob> {
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
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("WebP-Export fehlgeschlagen."))),
      "image/webp",
      0.85,
    );
  });
}

// Cover hochladen (quadratisch, WebP). Liefert public URL.
export async function uploadPodcastCover(file: File): Promise<{ url: string }> {
  const blob = await resizeCoverToWebpSquare(file);
  const supabase = createClient();
  const path = `${Date.now()}-${safeName(file.name, "webp").replace(/\.[^.]+$/, ".webp")}`;
  const { error } = await supabase.storage
    .from(COVER_BUCKET)
    .upload(path, blob, {
      cacheControl: IMMUTABLE_CACHE,
      contentType: "image/webp",
      upsert: false,
    });
  if (error) throw new Error(`Cover-Upload fehlgeschlagen: ${error.message}`);
  const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
