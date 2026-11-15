"use client";

import { useEffect } from "react";

import {
  IDLE_AFTER_MS,
  READ_ACTION_EVENT,
  READ_ACTIONS,
  READ_EVENT_PATH,
  activeCapSeconds,
  classifySource,
  depthPercent,
  newMeterState,
  takeAction,
  takeFlush,
  takeView,
  type MeterState,
  type ReadAction,
  type ReadEvent,
} from "@/lib/stats/reading";

// Zaehler der Lesestatistik auf publizierten Beitraegen (ArticleView,
// ShowcaseArticleView; nie in der Vorschau). Rendert nichts.
//
// Misst im Browser, meldet nur Summen an /api/lektuere (Regeln und Begriffe:
// src/lib/stats/reading.ts). Kein Cookie, kein localStorage, keine Kennung:
// Der Stand lebt in diesem Modul und endet mit der Seitenladung.
//
// Gemeldet wird beim Oeffnen (Aufruf) und beim Verlassen des Tabs oder der
// Seite (Lesezeit, Lesetiefe, «gelesen»), nicht laufend.

type Props = {
  articleId: string;
  readingMinutes: number | null;
};

// Stand pro Beitrag, solange das Dokument geladen ist. Wer in der Website
// zum Beitrag zurueckkehrt, wird nicht zweimal gezaehlt.
const sessions = new Map<string, MeterState>();

function send(event: ReadEvent | null) {
  if (!event) return;
  try {
    const body = JSON.stringify(event);
    if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(READ_EVENT_PATH, body)) return;
    void fetch(READ_EVENT_PATH, { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {
    // Zaehlen darf die Seite nie stoeren.
  }
}

// Ist der Beitrag die Seite, mit der das Dokument geladen wurde, und wie?
function landingInfo(): { landing: boolean; reloaded: boolean } {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return { landing: false, reloaded: false };
    const landing = new URL(nav.name).pathname === window.location.pathname;
    return { landing, reloaded: landing && (nav.type === "reload" || nav.type === "back_forward") };
  } catch {
    return { landing: false, reloaded: false };
  }
}

export default function ReadingMeter({ articleId, readingMinutes }: Props) {
  useEffect(() => {
    const { landing, reloaded } = landingInfo();
    // Neuladen und Zurueck-Taste auf die geladene Seite: kein neuer Besuch.
    let state = sessions.get(articleId) ?? newMeterState(!reloaded);
    const save = (next: MeterState) => {
      state = next;
      sessions.set(articleId, next);
    };
    save(state);
    if (!state.counted) return;

    const cap = activeCapSeconds(readingMinutes);
    let lastActivity = Date.now();
    let frame = 0;

    const countView = () => {
      if (state.viewSent || document.visibilityState !== "visible") return;
      const source = classifySource({
        landing,
        pageUrl: window.location.href,
        referrer: document.referrer,
      });
      const res = takeView(state, articleId, source);
      save(res.state);
      send(res.event);
    };

    const measure = () => {
      frame = 0;
      const body = document.querySelector<HTMLElement>(".article-body");
      if (!body) return;
      const rect = body.getBoundingClientRect();
      const percent = depthPercent({ top: rect.top, height: rect.height, viewport: window.innerHeight });
      if (percent > state.maxPercent) save({ ...state, maxPercent: percent });
    };
    const scheduleMeasure = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    const flush = () => {
      const res = takeFlush(state, articleId, readingMinutes);
      save(res.state);
      send(res.event);
    };

    const onActivity = () => {
      lastActivity = Date.now();
    };
    const onScroll = () => {
      onActivity();
      scheduleMeasure();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        onActivity();
        countView();
      } else {
        flush();
      }
    };
    const onAction = (e: Event) => {
      const kind = (e as CustomEvent<unknown>).detail;
      if (typeof kind !== "string" || !(READ_ACTIONS as readonly string[]).includes(kind)) return;
      const res = takeAction(state, articleId, kind as ReadAction);
      save(res.state);
      send(res.event);
    };

    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActivity > IDLE_AFTER_MS) return;
      if (state.active >= cap) return;
      save({ ...state, active: state.active + 1 });
    }, 1000);

    countView();
    measure();
    // Bilder und Schriften verschieben den Text nach dem ersten Rendern.
    const settle = window.setTimeout(measure, 1500);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", scheduleMeasure, { passive: true });
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("pointermove", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    window.addEventListener("pagehide", flush);
    window.addEventListener(READ_ACTION_EVENT, onAction);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(settle);
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("pointermove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener(READ_ACTION_EVENT, onAction);
      document.removeEventListener("visibilitychange", onVisibility);
      // Wechsel auf eine andere Seite der Website: Stand melden.
      flush();
    };
  }, [articleId, readingMinutes]);

  return null;
}
