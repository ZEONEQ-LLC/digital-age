"use client";

// Hero Studio, Wurzelkomponente (Tab im Artikel-Editor). Port der Shell des
// Prototyps (quellen/hero/shell.js) nach React: Vorschlaege, Anpassen,
// Uebernehmen. Genau ein rAF-Loop, nur solange Buehne und Tab sichtbar sind;
// Engine, Daten und Schriften werden beim Mount geladen (loadHeroEngine),
// beim Unmount cancelAnimationFrame + dispose().

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { loadHeroEngine } from "@/lib/hero-studio/engine";
import { loadHeroMemory } from "@/lib/hero-studio/memory";
import { HERO_RECIPE_MAX_BYTES, buildHeroRecipe, heroStaleChanges, recipeByteLength, recipeToSpec } from "@/lib/hero-studio/recipe";
import { deleteHeroAssets, uploadHeroAsset } from "@/lib/hero-studio/upload";
import { HERO_VIDEO_MAX_BYTES, HERO_VIDEO_WIDTH, canRenderMp4, renderMp4 } from "@/lib/hero-studio/video";
import type { HeroArticleInput, HeroSession, HeroStudioProps, HeroTakeResult } from "@/lib/hero-studio/types";
import type { HeroEngine, HeroOptionValue, HeroSpec, HeroViewId } from "@/lib/hero-studio/vendor";
import { HERO_STUDIO_CSS } from "./studioStyles";
import HeroFlow from "./HeroFlow";
import HeroProposals, { type HeroFilter, type ProposalCard } from "./HeroProposals";
import HeroStage from "./HeroStage";
import HeroPanel from "./HeroPanel";
import HeroTake, { type TakeStatus } from "./HeroTake";
import HeroDownloads from "./HeroDownloads";
import HeroPosts, { aiErrorText } from "./HeroPosts";
import { generateHeroProposals, saveHeroProposals } from "@/lib/ai/heroActions";
import { heroContentHash, type HeroProposalsPayload } from "@/lib/ai/heroPrompts";
import { renderPng as renderPngBlob } from "@/lib/hero-studio/render";
import { heroAltAnimated, heroAltStatic } from "@/lib/hero-studio/alt";
import { keywordFromTitle } from "@/lib/hero-studio/keyword";

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

// Hinweisbox in Schritt 1, solange es fuer den aktuellen Inhalt keine KI-Vorschlaege gibt.
const KI_NONE_MSG = "Noch keine KI-Vorschläge für diesen Beitrag. Claude liest den Beitrag und schlägt vier passende Varianten vor. Das dauert meist 10 bis 30 Sekunden.";

function subscribeReduced(cb: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const getReducedServer = () => false;

// Was die Dateien bestimmt: gewaehlte Variante mit Anpassungen, Animations-
// schalter und die Artikelfelder der Social-Formate (shell.js takeKey).
function takeKeyOf(s: HeroSpec, animated: boolean, a: { headline: string; author: string; date: string; rubrik: string }): string {
  return JSON.stringify([s.engine, s.variant || 0, s.overrides || {}, s.text != null ? s.text : "", s.figure || null, (s.kiMotifs || []).map((m) => m.id), animated, a.headline, a.author, a.date, a.rubrik]);
}

function visibleOf(list: HeroSpec[], filter: HeroFilter): HeroSpec[] {
  if (filter === "alle") {
    const l = list.filter((p) => p.engine === "line").slice(0, 2);
    const ty = list.filter((p) => p.engine === "typo").slice(0, 2);
    return [l[0], ty[0], l[1], ty[1]].filter((x): x is HeroSpec => !!x);
  }
  return list.filter((p) => p.engine === filter).slice(0, 4);
}

export default function HeroStudio({ article, recipe, proposals, saved, session, onSessionChange, onApply }: HeroStudioProps) {
  const reduceMotion = useSyncExternalStore(subscribeReduced, getReduced, getReducedServer);

  const [engine, setEngine] = useState<HeroEngine | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [props, setProps] = useState<HeroSpec[]>(() => session?.props ?? []);
  const [filter, setFilter] = useState<HeroFilter>(session?.filter ?? "alle");
  const [selId, setSelId] = useState<string | null>(session?.selId ?? null);
  const [viewId, setViewId] = useState<HeroViewId>(session?.viewId ?? "hero");
  const [animated, setAnimated] = useState<boolean>(session?.animated ?? recipe?.animated ?? false);
  const [chosen, setChosen] = useState<boolean>(session?.chosen ?? !!recipe);
  const [motifsOpen, setMotifsOpen] = useState<boolean>(session?.motifsOpen ?? false);
  const [kiKeyword, setKiKeyword] = useState<string>(session?.kiKeyword ?? "");
  const [kiRunning, setKiRunning] = useState(false);
  const [kiNote, setKiNote] = useState<{ msg: string; tone?: "ok" | "warn" | "busy" } | null>(
    session?.props.some((p) => p.source === "ki")
      ? { msg: "Vorschläge von Claude für diesen Beitrag.", tone: "ok" }
      : { msg: KI_NONE_MSG },
  );
  const [take, setTake] = useState<HeroTakeResult | null>(session?.take ?? null);
  const [takeBusy, setTakeBusy] = useState(false);
  const [status, setStatus] = useState<TakeStatus>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [memCount, setMemCount] = useState<number | null>(null);
  // Kann dieser Browser H.264 kodieren? null = wird geprueft (einmal beim Mount).
  const [videoOk, setVideoOk] = useState<boolean | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [encoding, setEncoding] = useState(false);

  const idSeq = useRef<number>(session?.propSeq ?? 0);
  const nextId = useCallback(() => { idSeq.current += 1; return "p" + idSeq.current; }, []);

  // Spiegel fuer den Loop (kein Re-Render pro Frame).
  const propsRef = useRef(props); useEffect(() => { propsRef.current = props; }, [props]);
  const selIdRef = useRef(selId); useEffect(() => { selIdRef.current = selId; }, [selId]);
  const viewIdRef = useRef(viewId); useEffect(() => { viewIdRef.current = viewId; }, [viewId]);
  const playingRef = useRef(playing); useEffect(() => { playingRef.current = playing; }, [playing]);
  const takeBusyRef = useRef(false);
  const reducedRef = useRef(reduceMotion); useEffect(() => { reducedRef.current = reduceMotion; }, [reduceMotion]);
  const tRef = useRef(0);
  const lastNowRef = useRef(0);
  const scrubbingRef = useRef(false);
  const cardCanvases = useRef(new Map<string, HTMLCanvasElement>());
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const scrubRef = useRef<HTMLInputElement | null>(null);
  const timeRef = useRef<HTMLSpanElement | null>(null);
  const dlHeadRef = useRef<HTMLParagraphElement | null>(null);

  const articleKey = JSON.stringify(article);
  const contentHash = useMemo(() => heroContentHash({ headline: article.headline, keyword: article.keyword, lead: article.lead, body: article.body, rubrik: article.rubrik }), [article.headline, article.keyword, article.lead, article.body, article.rubrik]);
  const contentHashRef = useRef(contentHash); useEffect(() => { contentHashRef.current = contentHash; }, [contentHash]);
  const articleRef = useRef<HeroArticleInput>(article); useEffect(() => { articleRef.current = article; }, [article]);
  const seedKey = useMemo(() => recipe?.seedKey ?? "", [recipe]);

  const applyArticle = useCallback((eng: HeroEngine, a: HeroArticleInput) => {
    const key = seedKey || eng.articleKeyFrom(a.slug, a.headline);
    eng.setArticle({ slug: key, headline: a.headline, rubrik: a.rubrik, author: a.author, date: a.date, readMin: a.readMin, keyword: a.keyword, figure: a.figure, lead: a.lead, body: a.body });
    // Engine-Reihenfolge fuer den Text: Fokus-Keyword → kiKeyword. Ohne beides kommt das
    // Schlagwort aus dem Titel (keyword.ts), damit nie «digital age» gezeichnet wird.
    eng.setKiKeyword(kiKeyword || keywordFromTitle(a.headline));
  }, [seedKey, kiKeyword]);

  const ensureProps = useCallback((eng: HeroEngine, list: HeroSpec[], f: HeroFilter): HeroSpec[] => {
    const out = [...list];
    for (const engId of ["line", "typo"] as const) {
      const need = f === "alle" ? 2 : f === engId ? 4 : 0;
      let guard = 0;
      while (out.filter((p) => p.engine === engId).length < need && guard++ < 8) {
        const s = eng.autoSpec(engId, out);
        s.id = nextId();
        out.push(s);
      }
    }
    return out;
  }, [nextId]);

  // ── Engine laden, Gedaechtnis lesen, Vorschlaege aufbauen ─────────────────
  useEffect(() => {
    let cancelled = false;
    let eng: HeroEngine | null = null;
    (async () => {
      try {
        const e = await loadHeroEngine();
        if (cancelled) { e.dispose(); return; }
        eng = e;
        applyArticle(e, articleRef.current);
        const mem = await loadHeroMemory(articleRef.current.articleId).catch(() => []);
        if (cancelled) { e.dispose(); return; }
        e.setMemory(mem);
        setMemCount(mem.length);
        let list = propsRef.current;
        list.forEach((s) => e.registerSpec(s));
        if (!list.length) {
          if (recipe) {
            const savedSpec = recipeToSpec(recipe, "saved");
            e.registerSpec(savedSpec);
            list = [savedSpec];
          }
          // Gespeicherte KI-Vorschlaege zum aktuellen Inhalt direkt zeigen.
          if (proposals && proposals.contentHash === contentHashRef.current) {
            const { specs, kiKeyword: sw } = e.specsFromKi(proposals);
            specs.forEach((s) => { s.id = nextId(); });
            if (sw) setKiKeyword(sw);
            list = list.concat(specs);
            if (specs.length) setKiNote({ msg: `Vorschläge von Claude für diesen Beitrag (gespeichert).${sw ? ` Schlagwort: «${sw}».` : ""}`, tone: "ok" });
          }
          list = ensureProps(e, list, filter);
          setProps(list);
          const vis = visibleOf(list, filter);
          setSelId(recipe ? "saved" : (vis[0]?.id ?? null));
        } else {
          list = ensureProps(e, list, filter);
          if (list.length !== propsRef.current.length) setProps(list);
        }
        // Wiederhergestellter Stand: Schritt 3 zeigt das am Beitrag gespeicherte Hero.
        if (recipe && saved && !session?.take) {
          const savedSpec = recipeToSpec(recipe, "saved");
          const snapArt = { headline: recipe.snapshot.title, author: recipe.snapshot.author, date: recipe.snapshot.date, rubrik: recipe.snapshot.category };
          const altStatic = saved.alt || heroAltStatic(e, savedSpec, articleRef.current.lang);
          const altAnim = heroAltAnimated(e, savedSpec, articleRef.current.lang);
          setTake({
            spec: savedSpec, key: takeKeyOf(savedSpec, recipe.animated, snapArt),
            hero: null, og: null, video: null,
            heroUrl: saved.coverUrl, ogUrl: saved.ogUrl, videoUrl: saved.videoUrl,
            altStatic, altAnim, altSocial: altStatic, recipe, slug: recipe.seedKey, posts: null,
            social: { portrait: { png: null, mp4: null }, story: { png: null, mp4: null } },
          });
        }
        setEngine(e);
      } catch (err) {
        console.error(err);
        if (!cancelled) setLoadError("Das Studio konnte nicht geladen werden. Seite neu laden und nochmals versuchen.");
      }
    })();
    return () => {
      cancelled = true;
      if (eng) eng.dispose();
    };
    // Einmal pro Mount; Artikelaenderungen laufen ueber den Effekt darunter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.articleId]);

  // Encoder-Pruefung einmal beim Mount (Diagnose F1).
  useEffect(() => {
    let cancelled = false;
    canRenderMp4().then((ok) => { if (!cancelled) setVideoOk(ok); });
    return () => { cancelled = true; };
  }, []);

  // Artikelfelder geaendert (z. B. Titel): Engine informieren, Auto-Vorschlaege neu.
  const articleKeyRef = useRef(articleKey);
  useEffect(() => {
    if (!engine) return;
    if (articleKeyRef.current === articleKey) return;
    articleKeyRef.current = articleKey;
    applyArticle(engine, articleRef.current);
    engine.clearTextCaches();
    setProps((prev) => {
      const kept = prev.filter((p) => p.source === "ki" || p.source === "saved");
      const next = ensureProps(engine, kept, filter);
      next.forEach((p) => { if (p.source !== "ki") p.text = articleRef.current.keyword || kiKeyword || keywordFromTitle(articleRef.current.headline); });
      return next;
    });
  }, [engine, articleKey, applyArticle, ensureProps, filter, kiKeyword]);

  // Session im Editor spiegeln (ueberlebt den Tab-Wechsel).
  useEffect(() => {
    onSessionChange({ props, filter, selId, viewId, animated, chosen, kiKeyword, propSeq: idSeq.current, motifsOpen, take });
  }, [onSessionChange, props, filter, selId, viewId, animated, chosen, kiKeyword, motifsOpen, take]);

  // ── Render-Loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!engine) return;
    let raf = 0;
    let stopped = false;
    const stageSize = (wrap: HTMLDivElement, view: HeroViewId) => {
      const f = engine.FORMATS[engine.VIEW_BY_ID[view].fmt];
      const maxW = wrap.clientWidth, maxH = Math.max(220, Math.min(window.innerHeight * 0.62, 720));
      return Math.max(120, Math.floor(Math.min(maxW, maxH * f.w / f.h)));
    };
    const frame = (now: number) => {
      if (stopped) return;
      const dt = Math.min(0.1, (now - lastNowRef.current) / 1000);
      lastNowRef.current = now;
      const reduced = reducedRef.current;
      if (playingRef.current && !reduced && !takeBusyRef.current) tRef.current += dt;
      const t = tRef.current;
      try {
        const heroView = engine.VIEW_BY_ID.hero;
        for (const [id, c] of cardCanvases.current) {
          const spec = propsRef.current.find((p) => p.id === id);
          if (!spec || !c.isConnected || !c.checkVisibility()) continue;
          const sc = engine.fitCanvas(c, heroView, c.clientWidth || 320);
          const time = reduced ? { p: engine.heroP(spec) } : { sec: t + engine.heroP(spec) * engine.loopOf(spec) };
          const ctx = c.getContext("2d");
          if (ctx) engine.renderSpec(ctx, spec, time, heroView, sc);
        }
        const s = propsRef.current.find((p) => p.id === selIdRef.current);
        const c = stageRef.current, wrap = wrapRef.current;
        if (s && c && wrap && c.checkVisibility()) {
          const view = engine.VIEW_BY_ID[viewIdRef.current];
          const cssW = stageSize(wrap, viewIdRef.current);
          c.style.width = cssW + "px";
          const sc = engine.fitCanvas(c, view, cssW);
          const T = engine.loopOf(s), p0 = engine.heroP(s);
          const p = reduced && playingRef.current ? p0 : ((((t / T + p0) % 1) + 1) % 1);
          const ctx = c.getContext("2d");
          if (ctx) engine.renderSpec(ctx, s, { p }, view, sc);
          if (!scrubbingRef.current && scrubRef.current) scrubRef.current.value = String(Math.round(p * 1000));
          if (timeRef.current) timeRef.current.textContent = `${(p * T).toFixed(1)} / ${T.toFixed(1)} s`;
        }
      } catch (err) {
        console.error(err);
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => { lastNowRef.current = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
    const onVis = () => { if (document.visibilityState === "visible") start(); else cancelAnimationFrame(raf); };
    document.addEventListener("visibilitychange", onVis);
    const onUp = () => { scrubbingRef.current = false; };
    window.addEventListener("pointerup", onUp);
    if (document.visibilityState === "visible") start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointerup", onUp);
    };
  }, [engine]);

  const registerCanvas = useCallback((id: string, el: HTMLCanvasElement | null) => {
    if (el) cardCanvases.current.set(id, el); else cardCanvases.current.delete(id);
  }, []);

  // ── Ableitungen ──────────────────────────────────────────────────────────
  const visible = useMemo(() => visibleOf(props, filter), [props, filter]);
  const sel = useMemo(() => props.find((p) => p.id === selId) ?? null, [props, selId]);
  const liveSnap = useMemo(() => ({ title: article.headline, author: article.author, date: article.date, category: article.rubrik }), [article]);
  const staleChanges = useMemo(() => (recipe ? heroStaleChanges(recipe, liveSnap) : []), [recipe, liveSnap]);
  const fresh = !!(take && sel && take.key === takeKeyOf(sel, animated, article));
  const step: 1 | 2 | 3 | 4 = !sel || !chosen ? 1 : fresh ? 4 : 2;

  const cards: ProposalCard[] = useMemo(() => {
    if (!engine) return [];
    return visible.map((spec) => {
      const sm = engine.summary(spec);
      return {
        spec,
        title: spec.source === "ki" ? (spec.titel ?? sm.main) : sm.main,
        why: spec.source === "ki" ? [spec.why, sm.tech].filter(Boolean).join(" · ") : spec.source === "saved" ? `Am Beitrag gespeichert · ${sm.reason}` : sm.reason,
        alt: heroAltStatic(engine, spec, article.lang),
      };
    });
  }, [engine, visible, article.lang]);

  const panel = useMemo(() => {
    if (!engine || !sel) return null;
    const eff = engine.effective(sel);
    const sm = engine.summary(sel);
    const chk = engine.checkFp(sel);
    const check = chk.ok
      ? { state: "ok" as const, text: chk.count ? `Unterscheidet sich von den letzten ${chk.count} Heroes dieser Technik.` : "Noch keine früheren Heroes gespeichert. Jede Variante ist frei." }
      : { state: "warn" as const, text: `Ähnelt «${((chk.hit && (chk.hit.title || chk.hit.key)) || "einem früheren Beitrag").slice(0, 48)}». «Neu würfeln» schlägt eine andere Variante vor.` };
    return {
      eff,
      title: sel.source === "ki" ? (sel.titel ?? sm.main) : sm.main,
      why: sel.source === "ki" ? [sel.why, sel.check].filter(Boolean).join(" · ") : sm.reason,
      check,
    };
  }, [engine, sel]);

  // ── Aktionen ─────────────────────────────────────────────────────────────
  const updateSel = useCallback((fn: (s: HeroSpec) => HeroSpec) => {
    setProps((prev) => prev.map((p) => (p.id === selIdRef.current ? fn(clone(p)) : p)));
  }, []);

  const onOverride = useCallback((k: string, v: HeroOptionValue, live?: boolean) => {
    updateSel((s) => {
      const ov = { ...(s.overrides || {}), [k]: v };
      if (k === "motion") { delete ov.sub; delete ov.angle; }
      if (k === "anim" && v !== "morph") delete ov.motif2;
      return { ...s, overrides: ov };
    });
    if (!live && (k === "motif" || k === "anim" || k === "motion")) tRef.current = 0;
  }, [updateSel]);

  const onText = useCallback((v: string) => updateSel((s) => ({ ...s, text: v })), [updateSel]);

  const onRoll = useCallback(() => {
    if (!engine || !sel) return;
    const others = props.filter((p) => p.id !== sel.id);
    const rolled = engine.rollSpec(sel, others);
    setProps((prev) => prev.map((p) => (p.id === sel.id ? rolled : p)));
    tRef.current = 0;
  }, [engine, sel, props]);

  const onReset = useCallback(() => { updateSel((s) => ({ ...s, overrides: {} })); tRef.current = 0; }, [updateSel]);

  const onChoose = useCallback((id: string) => {
    setSelId(id); setChosen(true); tRef.current = 0;
    const el = rootRef.current?.querySelector('[data-hs="detail"]');
    if (el) el.scrollIntoView({ behavior: reducedRef.current ? "auto" : "smooth", block: "start" });
  }, []);

  const onReroll = useCallback((id: string) => {
    if (!engine) return;
    setProps((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      if (i < 0) return prev;
      const old = prev[i];
      const fresh = engine.rerollSpec(old, prev.filter((p) => p.id !== id));
      const next = [...prev]; next[i] = fresh;
      return next;
    });
    if (selIdRef.current === id) tRef.current = 0;
  }, [engine]);

  const onFilter = useCallback((f: HeroFilter) => {
    if (!engine) return;
    setFilter(f);
    setProps((prev) => {
      const next = ensureProps(engine, prev, f);
      const vis = visibleOf(next, f);
      if (!vis.some((p) => p.id === selIdRef.current)) setSelId(vis[0]?.id ?? null);
      return next;
    });
    tRef.current = 0;
  }, [engine, ensureProps]);

  const onScrubInput = useCallback((value: number) => {
    if (!engine) return;
    setPlaying(false);
    const s = propsRef.current.find((p) => p.id === selIdRef.current);
    if (s) tRef.current = (value / 1000 - engine.heroP(s)) * engine.loopOf(s);
  }, [engine]);

  const setTakeStatus = useCallback((msg: string, tone?: "ok" | "warn" | "busy") => setStatus(msg ? { msg, tone } : null), []);

  const renderPng = useCallback((eng: HeroEngine, spec: HeroSpec, view: HeroViewId, p: number): Promise<Blob> => renderPngBlob(eng, spec, view, p), []);

  // Uebernehmen: Hero-PNG und OG-PNG (plus Feed/Story fuer die Downloads) rendern,
  // bei «animiert» zusaetzlich das Hero-MP4 1280×720 mit Mediabunny, dann Direkt-
  // Upload und EIN Save am Beitrag. Ueber 5 MB: einmal mit 60 % Bitrate neu kodieren.
  const runTake = useCallback(async () => {
    const s = propsRef.current.find((p) => p.id === selIdRef.current);
    if (!s || !engine) return;
    if (takeBusyRef.current) {
      // Laufende Kodierung abbrechen (Knopf zeigt «Abbrechen»).
      abortRef.current?.abort();
      return;
    }
    takeBusyRef.current = true; setTakeBusy(true);
    const a = articleRef.current;
    const wantVideo = animated && videoOk === true;
    const key = takeKeyOf(s, wantVideo, a);
    if (!chosen) setChosen(true);
    const spec = clone(s);
    engine.registerSpec(spec);
    const uploaded: string[] = [];
    try {
      const p = engine.heroP(spec);
      setProgress(0.02); setTakeStatus("Hero-Bild wird berechnet.", "busy");
      const hero = await renderPng(engine, spec, "hero", p);
      setProgress(0.05); setTakeStatus("Bild zum Teilen wird berechnet.", "busy");
      const og = await renderPng(engine, spec, "og", p);
      setProgress(0.07); setTakeStatus("Feed und Story werden berechnet.", "busy");
      const portrait = await renderPng(engine, spec, "portrait", p);
      const story = await renderPng(engine, spec, "story", p);
      let video: Blob | null = null;
      let videoWarn: string | null = null;
      if (wantVideo) {
        const ctl = new AbortController();
        abortRef.current = ctl;
        setEncoding(true);
        const encode = (scale: number) => renderMp4(engine, spec, "hero", HERO_VIDEO_WIDTH, {
          signal: ctl.signal, bitrateScale: scale,
          onProgress: (frac, label) => { setProgress(0.1 + 0.78 * frac); setTakeStatus(`Animation für die Beitragsseite: ${label}`, "busy"); },
        });
        let r = await encode(1);
        if (!("error" in r) && r.bytes > HERO_VIDEO_MAX_BYTES) {
          setTakeStatus("Animation ist zu gross, wird mit geringerer Bitrate neu berechnet.", "busy");
          r = await encode(0.6);
        }
        setEncoding(false);
        abortRef.current = null;
        if ("error" in r) {
          if (r.error === "cancelled") { setProgress(null); setTakeStatus("Abgebrochen."); return; }
          videoWarn = r.error === "encoder"
            ? "Dieser Browser kann hier kein MP4 erzeugen. Bild und OG-Bild sind fertig; die Animation in Chrome, Edge oder Safari erzeugen."
            : "Die Animation konnte nicht berechnet werden. Bild und OG-Bild sind fertig.";
        } else if (r.bytes > HERO_VIDEO_MAX_BYTES) {
          setProgress(null);
          setTakeStatus(`Die Animation ist auch mit geringerer Bitrate zu gross (${(r.bytes / 1048576).toFixed(1).replace(".", ",")} MB, erlaubt sind 5 MB). Ruhigere Animation oder kürzere Schleife wählen, oder statisch übernehmen.`, "warn");
          return;
        } else {
          video = r.blob;
        }
      }
      setProgress(0.9); setTakeStatus("Dateien werden hochgeladen.", "busy");
      const upHero = await uploadHeroAsset(a.articleId, hero, "hero"); uploaded.push(upHero.path);
      const upOg = await uploadHeroAsset(a.articleId, og, "og"); uploaded.push(upOg.path);
      let upVideo: { path: string; url: string } | null = null;
      if (video) { upVideo = await uploadHeroAsset(a.articleId, video, "video"); uploaded.push(upVideo.path); }
      // Kurzer ALT fuers Standbild (≤ 125 Zeichen), laengerer fuer die Animation (≤ 250): alt.ts
      const altStatic = heroAltStatic(engine, spec, a.lang);
      const altAnim = heroAltAnimated(engine, spec, a.lang);
      const slug = engine.articleKey();
      const recipeNext = buildHeroRecipe({
        spec, animated: !!upVideo, seedKey: slug, fp: engine.fingerprint(spec),
        snapshot: { title: a.headline, author: a.author, date: a.date, category: a.rubrik },
        files: { hero: upHero.path, og: upOg.path, video: upVideo ? upVideo.path : null },
      });
      if (recipeByteLength(recipeNext) > HERO_RECIPE_MAX_BYTES) throw new Error("Rezept zu gross.");
      setProgress(0.96); setTakeStatus("Wird am Beitrag gespeichert.", "busy");
      const res = await onApply({ coverUrl: upHero.url, ogUrl: upOg.url, videoUrl: upVideo ? upVideo.url : null, altStatic, altAnimated: upVideo ? altAnim : null, recipe: recipeNext });
      if (!res.ok) {
        await deleteHeroAssets(a.articleId, uploaded);
        setProgress(null); setTakeStatus(res.error, "warn");
        return;
      }
      const hl = a.headline.replace(/\s+/g, " ").trim();
      const altSocial = altStatic + (hl ? (a.lang === "en" ? ` With the headline "${hl}" and the digital age logo.` : ` Dazu die Headline «${hl}» und das Logo von digital age.`) : "");
      const prev = take;
      setTake({
        spec, key: upVideo ? key : takeKeyOf(s, false, a), hero, og, video,
        heroUrl: upHero.url, ogUrl: upOg.url, videoUrl: upVideo ? upVideo.url : null,
        altStatic, altAnim, altSocial, recipe: recipeNext, slug,
        posts: prev && prev.slug === slug ? prev.posts : null,
        social: { portrait: { png: portrait, mp4: null }, story: { png: story, mp4: null } },
      });
      if (wantVideo && !upVideo) setAnimated(false);
      setProgress(null);
      if (videoWarn) setTakeStatus(videoWarn, "warn");
      else setTakeStatus("Übernommen und gespeichert. Die Dateien stehen unten bereit.", "ok");
    } catch (err) {
      console.error(err);
      if (uploaded.length) await deleteHeroAssets(a.articleId, uploaded);
      setProgress(null);
      setTakeStatus(err instanceof Error && err.message.startsWith("Upload") ? err.message : "Übernehmen hat nicht geklappt. Nochmals versuchen.", "warn");
    } finally {
      setEncoding(false);
      abortRef.current = null;
      takeBusyRef.current = false; setTakeBusy(false);
    }
  }, [engine, animated, videoOk, chosen, onApply, renderPng, setTakeStatus, take]);

  // KI-Vorschlaege: Antwort in Specs umsetzen (specsFromKi), KI zuerst, Autos fuellen auf.
  const applyKiResult = useCallback((payload: HeroProposalsPayload, fromStore: boolean) => {
    if (!engine) return;
    const { specs, kiKeyword: sw } = engine.specsFromKi(payload);
    specs.forEach((s) => { s.id = nextId(); });
    if (sw) setKiKeyword(sw);
    setProps((prev) => {
      const savedOnes = prev.filter((p) => p.source === "saved");
      const autos = prev.filter((p) => p.source !== "ki" && p.source !== "saved").slice(0, 4);
      const next = ensureProps(engine, savedOnes.concat(specs, autos), filter);
      const vis = visibleOf(next, filter);
      setSelId(vis.find((p) => p.source === "ki")?.id ?? vis[0]?.id ?? null);
      return next;
    });
    tRef.current = 0;
    setKiNote({ msg: `${fromStore ? "Vorschläge von Claude für diesen Beitrag (gespeichert)." : `Claude hat ${specs.length} Vorschläge erstellt.`}${sw ? ` Schlagwort: «${sw}».` : ""}`, tone: "ok" });
    return specs.length;
  }, [engine, ensureProps, filter, nextId]);

  const runKi = useCallback(async () => {
    if (!engine || kiRunning) return;
    const a = articleRef.current;
    if (!a.headline.trim()) { setKiNote({ msg: "Zuerst im Beitrag eine Headline eingeben.", tone: "warn" }); return; }
    setKiRunning(true);
    setKiNote({ msg: "Claude liest den Beitrag und entwirft vier Vorschläge. Das dauert meist 10 bis 30 Sekunden.", tone: "busy" });
    try {
      const recent = engine.recentHeroes().map((m, i) => `${i + 1}. ${m.engine === "line" ? "Linie" : "Typo"}: ${m.engine === "line" ? (engine.motifInfo(engine.baseSpec("line"), String(m.fp.motif))?.name ?? String(m.fp.motif)) : String(m.fp.motion)}, Farbklang ${String(m.fp.color)}`);
      const res = await generateHeroProposals(a.articleId, {
        headline: a.headline, rubrik: a.rubrik, author: a.author, keyword: a.keyword, lead: a.lead, body: a.body,
        animList: engine.animList(), motionList: engine.motionList(), schemeList: engine.schemeList(), recent, iconNames: engine.promptIconNames(),
      }, a.lang);
      if (!res.ok) { setKiNote({ msg: aiErrorText(res.error, "Vorschläge"), tone: "warn" }); return; }
      const n = applyKiResult(res.proposals, false);
      if (!n) { setKiNote({ msg: "Die Antwort enthielt keine brauchbaren Vorschläge. Nochmals versuchen.", tone: "warn" }); return; }
      const saved = await saveHeroProposals(a.articleId, { version: 1, contentHash: contentHashRef.current, createdAt: new Date().toISOString(), ...res.proposals });
      if (!saved.ok) setKiNote((prev) => ({ msg: `${prev?.msg ?? ""} Nicht am Beitrag gespeichert (${saved.error}), die Vorschläge bleiben in dieser Sitzung.`, tone: "ok" }));
    } catch (err) {
      console.error(err);
      setKiNote({ msg: "Vorschläge konnten nicht geladen werden. Nochmals versuchen.", tone: "warn" });
    } finally {
      setKiRunning(false);
    }
  }, [engine, kiRunning, applyKiResult]);

  const onPosts = useCallback((posts: HeroTakeResult["posts"]) => setTake((t) => (t ? { ...t, posts } : t)), []);

  // Downloads: gerenderte Blobs in der Sitzung zwischenspeichern, Loop waehrenddessen anhalten.
  const onTakeUpdate = useCallback((next: HeroTakeResult) => setTake(next), []);
  const onDlBusy = useCallback((b: boolean) => { takeBusyRef.current = b; }, []);

  const onJump = useCallback(() => {
    const h = dlHeadRef.current;
    if (h) { h.scrollIntoView({ behavior: reducedRef.current ? "auto" : "smooth", block: "start" }); h.focus({ preventScroll: true }); }
  }, []);

  // ── Texte ────────────────────────────────────────────────────────────────
  const animatedOn = animated && videoOk === true;
  const whatRows: [string, string][] = [
    ["website/", animatedOn ? "Hero-Bild, Bild zum Teilen und Hero-Animation" : "Hero-Bild und Bild zum Teilen"],
    ["social/", "Feed 4:5 und Story 9:16, je als Bild und Video"],
    ["texte/", "ALT-Texte, auf Wunsch Posttexte für LinkedIn und Instagram"],
  ];
  const memNote = memCount == null ? "" : memCount
    ? `Gedächtnis der Redaktion: ${memCount} frühere Heroes anderer Beiträge, neue Vorschläge weichen davon ab.`
    : "Gedächtnis der Redaktion: noch leer. Jedes übernommene Hero wird vermerkt.";
  const staleText = staleChanges.length ? `Du hast seither etwas geändert (${staleChanges.join(", ")}).` : null;
  const defaultText = article.keyword || kiKeyword || keywordFromTitle(article.headline);
  // KI-Vorschlaege vorhanden: Box mit sekundaerem Button «Neue KI-Vorschläge», sonst Hinweisbox mit primaerem Button.
  const hasKi = props.some((p) => p.source === "ki");
  // Hinweis ohne Fokus-Keyword (Schritt 1 unter dem Titel, Schritt 2 beim Schlagwort-Feld).
  const keywordFrom = article.keyword ? null : kiKeyword ? "aus den KI-Vorschlägen" : "aus dem Titel";
  const keywordNote = keywordFrom ? `Kein Fokus-Keyword im SEO-Tab. Das Schlagwort kommt ${keywordFrom}; in Schritt 2 anpassen oder im SEO-Tab setzen.` : null;
  const keywordHint = keywordFrom ? `Kein Fokus-Keyword im SEO-Tab. Das Schlagwort kommt ${keywordFrom}; hier anpassen oder im SEO-Tab setzen.` : null;

  return (
    <div className="hs" ref={rootRef}>
      <style>{HERO_STUDIO_CSS}</style>
      <div className="hs-intro">
        <p className="hs-hint">Hero Studio: Bilder und Animation aus dem Beitrag, berechnet im Browser. Gleiches Rezept, gleiches Bild in jedem Format.</p>
        <p className="hs-hint"><a href="/licenses/hero-studio.txt" target="_blank" rel="noopener">Lizenzen</a></p>
      </div>
      <HeroFlow step={step} />
      {loadError && <p className="hs-note" data-tone="warn">{loadError}</p>}
      {!engine && !loadError && <p className="hs-loading">Studio wird geladen …</p>}
      {engine && (
        <>
          <HeroProposals
            cards={cards} selId={selId} filter={filter} onFilter={onFilter} onChoose={onChoose} onReroll={onReroll}
            registerCanvas={registerCanvas}
            kiNote={kiNote}
            kiButton={{ label: kiRunning ? "Claude liest …" : hasKi ? "Neue KI-Vorschläge" : "Vorschläge mit KI erstellen", onClick: runKi, disabled: kiRunning || takeBusy, primary: !hasKi }}
            hasKi={hasKi}
            memNote={memNote}
            keywordNote={keywordNote}
          />
          {sel && panel && (
            <HeroStage
              views={engine.VIEWS} viewId={viewId} onView={setViewId}
              playing={playing} onTogglePlay={() => setPlaying((p) => !p)}
              stageRef={stageRef} wrapRef={wrapRef} scrubRef={scrubRef} timeRef={timeRef}
              onScrubDown={() => { scrubbingRef.current = true; }}
              onScrubInput={onScrubInput}
              onScrubChange={() => { scrubbingRef.current = false; }}
              stageAlt="Vorschau des gewählten Vorschlags"
            >
              <HeroPanel
                engine={engine} spec={sel} eff={panel.eff} title={panel.title} why={panel.why} check={panel.check}
                motifsOpen={motifsOpen} onMotifsOpen={setMotifsOpen} defaultText={defaultText} keywordHint={keywordHint}
                onOverride={onOverride} onText={onText} onRoll={onRoll} onReset={onReset}
              />
            </HeroStage>
          )}
          {sel && (
            <HeroTake
              animated={animatedOn} animatedDisabled={videoOk !== true || takeBusy} onAnimated={setAnimated}
              animatedHint={videoOk === false ? "Dieser Browser kann hier kein MP4 erzeugen. Bild und OG-Bild gehen trotzdem; die Animation in Chrome, Edge oder Safari erzeugen." : videoOk === null ? "Prüfe, ob dieser Browser MP4 erzeugen kann …" : null}
              onTake={runTake} takeBusy={takeBusy}
              takeLabel={encoding ? "Abbrechen" : takeBusy ? "Übernehmen läuft …" : "Übernehmen und Dateien erstellen"}
              status={status} progress={progress} whatRows={whatRows} fresh={fresh}
              result={take ? { heroUrl: take.heroUrl, ogUrl: take.ogUrl, videoUrl: take.videoUrl, altStatic: take.altStatic, altAnim: take.altAnim } : null}
              staleText={staleText}
              article={{ headline: article.headline, rubrik: article.rubrik, author: article.author, date: article.date }}
              reduceMotion={reduceMotion} dlHeadRef={dlHeadRef} onJump={onJump}
              posts={take ? <HeroPosts article={article} take={take} onPosts={onPosts} /> : null}
              extra={take ? (
                <HeroDownloads
                  engine={engine} take={take} article={{ headline: article.headline, slug: article.slug }}
                  canVideo={videoOk === true} disabled={takeBusy} onBusy={onDlBusy} onTakeUpdate={onTakeUpdate}
                />
              ) : null}
            />
          )}
        </>
      )}
    </div>
  );
}

export type { HeroSession };
