// Standbild eines Vorschlags als PNG-Blob (Canvas → toBlob). Nur im Browser.

import type { HeroEngine, HeroSpec, HeroViewId } from "./vendor";

export function canvasToPngBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Bild-Export fehlgeschlagen."))), "image/png"));
}

export async function renderPng(engine: HeroEngine, spec: HeroSpec, view: HeroViewId, p: number): Promise<Blob> {
  const f = engine.FORMATS[engine.VIEW_BY_ID[view].fmt];
  const c = document.createElement("canvas");
  c.width = f.w;
  c.height = f.h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar.");
  engine.renderSpec(ctx, spec, { p }, view, 1);
  return canvasToPngBlob(c);
}

export function viewDims(engine: HeroEngine, view: HeroViewId): string {
  const f = engine.FORMATS[engine.VIEW_BY_ID[view].fmt];
  return `${f.w} × ${f.h}`;
}

export function articleUrl(slug: string): string {
  return `https://digital-age.ch/artikel/${slug}`;
}
