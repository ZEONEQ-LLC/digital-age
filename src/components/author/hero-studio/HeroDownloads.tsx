"use client";

// Downloads (Stufe D): Website-Dateien, Social-Media-Formate und das ZIP-Paket.
// Port von shell.js renderDownloads/dlItem/dlRun/runZip/zipEntries. Alle Dateien
// werden lokal aus dem Rezept gerendert (auch nach erneutem Oeffnen), Videos beim
// ersten Klick, danach zwischengespeichert (im Session-Zustand des Editors).

import { useCallback, useId, useRef, useState } from "react";
import { renderPng, viewDims, articleUrl } from "@/lib/hero-studio/render";
import { renderMp4 } from "@/lib/hero-studio/video";
import { fmtSize, joinDe, makeZip, saveBlob, type ZipEntry } from "@/lib/hero-studio/zip";
import type { HeroTakeResult } from "@/lib/hero-studio/types";
import type { HeroEngine, HeroViewId } from "@/lib/hero-studio/vendor";

type Social = { view: "portrait" | "story"; key: string; label: string; use: string };
const SOCIAL: Social[] = [
  { view: "portrait", key: "feed-4x5", label: "Feed 4:5", use: "Instagram- und LinkedIn-Feed" },
  { view: "story", key: "story-9x16", label: "Story 9:16", use: "Instagram Story und Reels, WhatsApp-Status" },
];

type Status = { msg: string; tone?: "ok" | "warn" | "busy" } | null;

type Props = {
  engine: HeroEngine;
  take: HeroTakeResult;
  article: { headline: string; slug: string };
  canVideo: boolean;
  disabled: boolean;
  onBusy: (busy: boolean) => void;
  onTakeUpdate: (next: HeroTakeResult) => void;
};

type DlButton = { k: string; label: string; sub: string; act: (setLabel: (s: string | null) => void) => Promise<void> };

export default function HeroDownloads({ engine, take, article, canVideo, disabled, onBusy, onTakeUpdate }: Props) {
  const zipId = useId();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [prog, setProg] = useState(0);
  const [status, setStatus] = useState<Status>(null);
  const [zipVid, setZipVid] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const takeRef = useRef(take);
  takeRef.current = take;

  const slug = article.slug;
  const secs = Math.round(engine.loopOf(take.spec));
  const p0 = engine.heroP(take.spec);
  const names = {
    hero: `hero-${slug}.png`, og: `og-${slug}.png`, video: `hero-${slug}.mp4`,
    social: (sv: Social, ext: "png" | "mp4") => `${sv.key}-${slug}.${ext}`,
  };

  const patchTake = useCallback((fn: (t: HeroTakeResult) => HeroTakeResult) => {
    const next = fn(takeRef.current);
    takeRef.current = next;
    onTakeUpdate(next);
    return next;
  }, [onTakeUpdate]);

  // Blobs lokal aus dem Rezept erzeugen und zwischenspeichern.
  const ensurePng = useCallback(async (which: "hero" | "og" | "portrait" | "story"): Promise<Blob> => {
    const t = takeRef.current;
    const have = which === "hero" ? t.hero : which === "og" ? t.og : t.social[which].png;
    if (have) return have;
    const blob = await renderPng(engine, t.spec, which as HeroViewId, p0);
    patchTake((cur) => which === "hero" ? { ...cur, hero: blob } : which === "og" ? { ...cur, og: blob }
      : { ...cur, social: { ...cur.social, [which]: { ...cur.social[which], png: blob } } });
    return blob;
  }, [engine, p0, patchTake]);

  type VideoResult = { blob: Blob } | { error: "encoder" | "cancelled" | "failed" };
  const ensureVideo = useCallback(async (which: "hero" | "portrait" | "story", from: number, span: number): Promise<VideoResult> => {
    const t = takeRef.current;
    const have = which === "hero" ? t.video : t.social[which].mp4;
    if (have) return { blob: have };
    if (which === "hero" && t.videoUrl && !canVideo) {
      // Ohne Encoder: die am Beitrag gespeicherte Animation holen.
      const res = await fetch(t.videoUrl);
      if (!res.ok) return { error: "failed" };
      const blob = await res.blob();
      patchTake((cur) => ({ ...cur, video: blob }));
      return { blob };
    }
    const ctl = new AbortController();
    abortRef.current = ctl;
    const r = await renderMp4(engine, t.spec, which === "hero" ? "hero" : which, which === "hero" ? 1280 : 1080, {
      signal: ctl.signal,
      onProgress: (frac, label) => { setProg(from + span * frac); setStatus({ msg: `Video ${which === "hero" ? "Hero" : SOCIAL.find((s) => s.view === which)?.label}: ${label}`, tone: "busy" }); },
    });
    abortRef.current = null;
    if ("error" in r) return { error: r.error };
    patchTake((cur) => which === "hero" ? { ...cur, video: r.blob } : { ...cur, social: { ...cur.social, [which]: { ...cur.social[which], mp4: r.blob } } });
    return { blob: r.blob };
  }, [engine, canVideo, patchTake]);

  // Jeder Download laeuft hier durch: ein Auftrag aufs Mal, Fortschritt im Knopf, Status unter dem Paket.
  const dlRun = useCallback(async (k: string, fn: (setLabel: (s: string | null) => void) => Promise<void>) => {
    if (busyKey) {
      if (busyKey === k && abortRef.current) abortRef.current.abort();
      return;
    }
    setBusyKey(k); setProg(0); onBusy(true);
    try { await fn(setBusyLabel); }
    catch (err) { console.error(err); setStatus({ msg: "Das hat nicht geklappt. Nochmals versuchen.", tone: "warn" }); }
    finally { setBusyLabel(null); setBusyKey(null); setProg(0); abortRef.current = null; onBusy(false); }
  }, [busyKey, onBusy]);

  const offer = (blob: Blob, filename: string) => { saveBlob(blob, filename); setStatus({ msg: `Gespeichert: ${filename}`, tone: "ok" }); };

  const videoFailText = (e: "encoder" | "cancelled" | "failed") =>
    e === "cancelled" ? "Abgebrochen." : e === "encoder" ? "Dieser Browser kann hier kein MP4 erzeugen. In Chrome, Edge oder Safari öffnen." : "Das Video konnte nicht berechnet werden. Nochmals versuchen.";

  const getSocialVideo = (sv: Social) => dlRun(sv.key + "-mp4", async (setLabel) => {
    if (!takeRef.current.social[sv.view].mp4) {
      setLabel("Abbrechen");
      const r = await ensureVideo(sv.view, 0, 1);
      setLabel(null);
      if ("error" in r) { setStatus({ msg: videoFailText(r.error), tone: r.error === "cancelled" ? undefined : "warn" }); return; }
    }
    offer(takeRef.current.social[sv.view].mp4 as Blob, names.social(sv, "mp4"));
  });

  const hasVideo = take.recipe.animated && (!!take.video || !!take.videoUrl);
  const socialDone = SOCIAL.every((sv) => take.social[sv.view].mp4);
  const wantVid = canVideo && zipVid;

  const zipEntries = (withVideos: boolean): ZipEntry[] => {
    const t = takeRef.current;
    const root = `digital-age_${slug}_hero-paket/`;
    const hl = article.headline.trim(), url = articleUrl(slug);
    const E: ZipEntry[] = [], list: [string, string][] = [];
    const add = (path: string, data: Blob | string, what?: string) => { E.push({ name: root + path, data }); if (what) list.push([path, what]); };
    if (t.hero) add("website/" + names.hero, t.hero, `Hero-Bild ${viewDims(engine, "hero")}, ohne Logo und Headline. Beitrag, Listen, Spotlight, Rubrikseite.`);
    if (t.og) add("website/" + names.og, t.og, `Bild zum Teilen ${viewDims(engine, "og")}, mit Logo und Headline. Linkvorschau beim Teilen.`);
    if (t.video) add("website/" + names.video, t.video, "Hero-Animation 1280 × 720 für die Beitragsseite.");
    for (const sv of SOCIAL) {
      const slot = t.social[sv.view];
      if (slot.png) add(`social/${names.social(sv, "png")}`, slot.png, `${sv.label} ${viewDims(engine, sv.view)}, Bild. ${sv.use}.`);
      if (withVideos && slot.mp4) add(`social/${names.social(sv, "mp4")}`, slot.mp4, `${sv.label} ${viewDims(engine, sv.view)}, Video. ${sv.use}.`);
    }
    const altLines = [`ALT-Texte · ${hl}`, "", `Hero-Bild (website/${names.hero})`, t.altStatic, ""];
    if (t.video) altLines.push(`Hero-Animation (website/${names.video})`, t.altAnim, "");
    altLines.push("Bild zum Teilen, Feed und Story (mit Logo und Headline)", t.altSocial, "");
    add("texte/alt-texte.txt", altLines.join("\n"), "ALT-Texte für Website und Social Media.");
    if (t.posts && t.posts.li.trim()) add("texte/linkedin.txt", t.posts.li.trim() + "\n", "Posttext LinkedIn.");
    if (t.posts && t.posts.ig.trim()) add("texte/instagram.txt", t.posts.ig.trim() + "\n", "Posttext Instagram.");
    const recipeJson = {
      cover_recipe: t.recipe, cover_image_url: t.heroUrl, cover_image_alt: t.altStatic, og_image_url: t.ogUrl,
      cover_video_url: t.videoUrl, cover_video_alt: t.videoUrl ? t.altAnim : null,
    };
    add("rezept.json", JSON.stringify(recipeJson, null, 2) + "\n", "Die Werte, die am Beitrag gespeichert sind. Damit lässt sich das Hero jederzeit neu berechnen.");
    const w = Math.max(...list.map(([p]) => p.length));
    const readme = ["Hero-Paket · digital-age.ch", hl, url, "",
      "website/ ist am Beitrag gespeichert. social/ ist für eigene Posts, mit Logo, Headline und Signatur.", "",
      ...list.map(([p, what]) => `${p.padEnd(w)}  ${what}`), "",
      `Erstellt mit dem Hero Studio am ${new Date().toLocaleDateString("de-CH")}.`, ""].join("\n");
    E.push({ name: root + "LIESMICH.txt", data: readme });
    return E;
  };

  const runZip = () => dlRun("zip", async (setLabel) => {
    await ensurePng("hero"); await ensurePng("og"); await ensurePng("portrait"); await ensurePng("story");
    let warn = "";
    if (hasVideo && !takeRef.current.video) {
      const r = await ensureVideo("hero", 0, 0.3);
      if ("error" in r && r.error === "cancelled") { setStatus({ msg: "Abgebrochen." }); return; }
    }
    if (wantVid) {
      const todo = SOCIAL.filter((sv) => !takeRef.current.social[sv.view].mp4);
      if (todo.length) setLabel("Abbrechen");
      for (let i = 0; i < todo.length; i++) {
        const r = await ensureVideo(todo[i].view, 0.3 + (i * 0.62) / todo.length, 0.62 / todo.length);
        if ("error" in r) {
          if (r.error === "cancelled") { setStatus({ msg: "Abgebrochen." }); return; }
          warn = r.error === "encoder" ? "Dieser Browser kann hier kein MP4 erzeugen, das Paket enthält nur die Bilder." : `Das Video ${todo[i].label} fehlt, es konnte nicht berechnet werden.`;
          break;
        }
      }
      setLabel(null);
    }
    setProg(0.95); setStatus({ msg: "Paket wird gepackt.", tone: "busy" });
    const name = `digital-age_${slug}_hero-paket.zip`;
    const zip = await makeZip(zipEntries(wantVid));
    setProg(1);
    saveBlob(zip, name);
    setStatus({ msg: `Gespeichert: ${name}.${warn ? " " + warn : ""}`, tone: warn ? "warn" : "ok" });
  });

  const btn = (b: DlButton, primary = false) => {
    const busy = busyKey === b.k;
    return (
      <button
        key={b.k} type="button" className={`hs-btn prog${primary ? " primary" : ""}`} data-k={b.k} data-busy={busy ? "true" : undefined}
        style={{ ["--p" as string]: busy ? prog.toFixed(3) : 0 }}
        disabled={disabled || (!!busyKey && !busy)}
        aria-label={`${b.label}${b.sub ? ", " + b.sub : ""}`}
        onClick={() => dlRun(b.k, b.act)}
      >
        <span>{busy && busyLabel ? busyLabel : b.label}</span>
        <small>{b.sub}</small>
      </button>
    );
  };

  const item = (thumb: React.ReactNode, title: string, meta: string, buttons: DlButton[]) => (
    <div className="hs-dl-item">
      <div className="hs-dl-thumb">{thumb}</div>
      <div className="hs-dl-info">
        <b>{title}</b>
        <small>{meta}</small>
        <div className="hs-dl-btns">{buttons.map((b) => btn(b))}</div>
      </div>
    </div>
  );

  const thumbCanvas = (view: HeroViewId) => (
    <canvas
      aria-hidden="true"
      style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }}
      ref={(c) => {
        if (!c) return;
        const f = engine.FORMATS[engine.VIEW_BY_ID[view].fmt];
        const w = 192, h = Math.round((w * f.h) / f.w);
        if (c.width !== w) { c.width = w; c.height = h; }
        const ctx = c.getContext("2d");
        if (ctx) engine.renderSpec(ctx, take.spec, { p: p0 }, view, w / f.w);
      }}
    />
  );

  const packRows: [string, string][] = [
    ["website/", joinDe(["Hero-Bild", "Bild zum Teilen"].concat(hasVideo ? ["Hero-Animation"] : []))],
    ["social/", `Feed 4:5 und Story 9:16, je als Bild${wantVid ? " und Video" : ""}`],
    ["texte/", joinDe(["ALT-Texte"].concat(take.posts ? ["Posttexte LinkedIn und Instagram"] : []))],
    ["rezept.json", "Werte des Beitrags, plus LIESMICH.txt"],
  ];

  return (
    <div className="hs-dl">
      <div className="hs-dl-pack">
        <div className="hs-dl-pack-txt">
          <b>Alles in einem Paket</b>
          <ul className="hs-dl-tree">{packRows.map(([k, v]) => <li key={k}><code>{k}</code><span>{v}</span></li>)}</ul>
          {canVideo && (
            <label className="hs-dl-opt" htmlFor={zipId}>
              <input type="checkbox" id={zipId} checked={zipVid} onChange={(e) => setZipVid(e.target.checked)} />
              Social-Videos mitpacken
              <em>{socialDone ? "bereits berechnet" : `je ${secs} s, werden beim Packen berechnet`}</em>
            </label>
          )}
        </div>
        {btn({ k: "zip", label: "ZIP herunterladen", sub: "", act: async () => { await runZip(); } }, true)}
        <p className="hs-note" role="status" aria-live="polite" data-tone={status?.tone}>{status?.msg ?? ""}</p>
      </div>
      <div className="hs-dl-groups">
        <div className="hs-dl-group">
          <p className="hs-sub-h">Website <span>am Beitrag gespeichert</span></p>
          <div className="hs-dl-items">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {item(<img src={take.heroUrl} alt="" />, "Hero-Bild", `${viewDims(engine, "hero")} · Beitrag, Listen, Spotlight, Rubrikseite`, [
              { k: "hero", label: "Bild PNG", sub: take.hero ? fmtSize(take.hero.size) : "", act: async () => { offer(await ensurePng("hero"), names.hero); } },
            ])}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {item(<img src={take.ogUrl} alt="" />, "Bild zum Teilen", `${viewDims(engine, "og")} · Linkvorschau auf LinkedIn, WhatsApp, X`, [
              { k: "og", label: "Bild PNG", sub: take.og ? fmtSize(take.og.size) : "", act: async () => { offer(await ensurePng("og"), names.og); } },
            ])}
            {hasVideo ? (
              // eslint-disable-next-line @next/next/no-img-element
              item(<img src={take.heroUrl} alt="" />, "Hero-Animation", `1280 × 720 · ${secs} s Loop · nur auf der Beitragsseite`, [
                { k: "herovid", label: "Video MP4", sub: take.video ? fmtSize(take.video.size) : `${secs} s`, act: async (setLabel) => {
                  if (!takeRef.current.video) {
                    setLabel("Abbrechen");
                    const r = await ensureVideo("hero", 0, 1);
                    setLabel(null);
                    if ("error" in r) { setStatus({ msg: videoFailText(r.error), tone: r.error === "cancelled" ? undefined : "warn" }); return; }
                  }
                  offer(takeRef.current.video as Blob, names.video);
                } },
              ])
            ) : (
              <p className="hs-hint">Eine Hero-Animation entsteht, wenn oben «Im Beitrag animiert abspielen» aktiv ist und das Hero nochmals übernommen wird.</p>
            )}
          </div>
        </div>
        <div className="hs-dl-group">
          <p className="hs-sub-h">Social Media <span>mit Logo, Headline und Signatur</span></p>
          <div className="hs-dl-items">
            {SOCIAL.map((sv) => {
              const slot = take.social[sv.view];
              const buttons: DlButton[] = [
                { k: sv.key + "-png", label: "Bild PNG", sub: slot.png ? fmtSize(slot.png.size) : "", act: async () => { offer(await ensurePng(sv.view), names.social(sv, "png")); } },
              ];
              if (canVideo) buttons.push({ k: sv.key + "-mp4", label: "Video MP4", sub: slot.mp4 ? fmtSize(slot.mp4.size) : `${secs} s`, act: async () => { await getSocialVideo(sv); } });
              return <div key={sv.key}>{item(thumbCanvas(sv.view), sv.label, `${viewDims(engine, sv.view)} · ${sv.use}`, buttons)}</div>;
            })}
            {!canVideo && <p className="hs-hint">Videos lassen sich in diesem Browser nicht erzeugen. In Chrome, Edge oder Safari öffnen.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
