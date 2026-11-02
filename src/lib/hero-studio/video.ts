// Hero-Animation als MP4 im Browser: Canvas-Frames der Engine, H.264 ueber
// WebCodecs, gemuxt mit Mediabunny (MPL-2.0, exakt gepinnt). Ersetzt mp4-muxer
// des Prototyps (shell.js pickEncoderConfig / renderMp4). Nur im Browser.
//
// Das MP4 beginnt beim Titelmoment heroP, eine Schleife, 30 fps, Keyframe alle
// 2 s, Bitrate W·H·30·0,14 geklemmt auf 3 bis 14 Mbit/s. Mediabunny uebernimmt
// VideoEncoder, VideoFrame, Backpressure und Codec-String.

import type { HeroEngine, HeroSpec, HeroViewId } from "./vendor";

export const HERO_FPS = 30;
export const HERO_VIDEO_MAX_BYTES = 5 * 1024 * 1024;
export const HERO_VIDEO_WIDTH = 1280;

export type RenderMp4Result = { blob: Blob; w: number; h: number; bytes: number } | { error: "encoder" | "cancelled" | "failed" };

export type RenderMp4Options = {
  onProgress?: (frac: number, label: string) => void;
  signal?: AbortSignal;
  /** 1 = Standard; 0.6 fuer den zweiten Versuch, wenn die Datei ueber 5 MB liegt */
  bitrateScale?: number;
  /**
   * Nur fuer Tests in Umgebungen ohne H.264-Encoder (Headless-Chromium im
   * Container): anderer Codec und Container. Die Oberflaeche nutzt immer avc/mp4.
   */
  codec?: "avc" | "vp9" | "vp8";
  container?: "mp4" | "webm";
};

let encoderCheck: Promise<boolean> | null = null;

// Einmal pro Seite: kann dieser Browser 1280×720 H.264 kodieren?
export function canRenderMp4(): Promise<boolean> {
  if (!encoderCheck) {
    encoderCheck = (async () => {
      try {
        if (typeof window === "undefined" || typeof VideoEncoder !== "function") return false;
        const { canEncodeVideo } = await import("mediabunny");
        return await canEncodeVideo("avc", { width: HERO_VIDEO_WIDTH, height: 720, frameRate: HERO_FPS });
      } catch {
        return false;
      }
    })();
  }
  return encoderCheck;
}

export function heroBitrate(w: number, h: number, scale = 1): number {
  return Math.round(Math.min(14e6, Math.max(3e6, w * h * HERO_FPS * 0.14)) * scale);
}

export async function renderMp4(engine: HeroEngine, spec: HeroSpec, viewId: HeroViewId, outW: number, opts: RenderMp4Options = {}): Promise<RenderMp4Result> {
  const view = engine.VIEW_BY_ID[viewId];
  const f = engine.FORMATS[view.fmt];
  const sc = outW / f.w;
  const W = Math.round((f.w * sc) / 2) * 2;
  const H = Math.round((f.h * sc) / 2) * 2;
  const codec = opts.codec ?? "avc";
  const container = opts.container ?? "mp4";
  let mb: typeof import("mediabunny");
  try {
    mb = await import("mediabunny");
    if (typeof VideoEncoder !== "function") return { error: "encoder" };
    if (!(await mb.canEncodeVideo(codec, { width: W, height: H, frameRate: HERO_FPS }))) return { error: "encoder" };
  } catch {
    return { error: "encoder" };
  }
  const T = engine.loopOf(spec);
  const p0 = engine.heroP(spec);
  const total = Math.max(1, Math.round(T * HERO_FPS));
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return { error: "failed" };

  const format = container === "webm" ? new mb.WebMOutputFormat() : new mb.Mp4OutputFormat({ fastStart: "in-memory" });
  const target = new mb.BufferTarget();
  const output = new mb.Output({ format, target });
  const source = new mb.CanvasSource(c, { codec, bitrate: heroBitrate(W, H, opts.bitrateScale ?? 1), keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: HERO_FPS });
  try {
    await output.start();
    for (let i = 0; i < total; i++) {
      if (opts.signal?.aborted) {
        await output.cancel();
        return { error: "cancelled" };
      }
      engine.renderSpec(ctx, spec, { p: p0 + i / total }, view, sc);
      await source.add(i / HERO_FPS, 1 / HERO_FPS);
      if (i % 6 === 0 || i === total - 1) {
        opts.onProgress?.((i + 1) / total, `Bild ${i + 1} von ${total}`);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    source.close();
    await output.finalize();
  } catch (err) {
    console.error(err);
    try { await output.cancel(); } catch { /* bereits beendet */ }
    return { error: "failed" };
  }
  const buffer = target.buffer;
  if (!buffer) return { error: "failed" };
  return { blob: new Blob([buffer], { type: container === "webm" ? "video/webm" : "video/mp4" }), w: W, h: H, bytes: buffer.byteLength };
}
