// npx tsx src/lib/stats/__tests__/reading.manual.ts
import assert from "node:assert/strict";

import {
  MAX_FLUSH_SECONDS,
  activeCapSeconds,
  classifySource,
  depthPercent,
  hasSuiteSession,
  isSameOriginRequest,
  marksReached,
  newMeterState,
  parseReadEvent,
  readThresholdSeconds,
  takeAction,
  takeFlush,
  takeView,
} from "../reading";

const A = "92e555b0-20ad-42d3-a054-061d569b8fc0";

// --- parseReadEvent ---------------------------------------------------------
assert.deepEqual(parseReadEvent({ a: A, v: 1, q: "search" }), { a: A, v: 1, q: "search" });
assert.deepEqual(parseReadEvent({ a: A, s: 12, d: [50, 25], r: 1 }), { a: A, s: 12, d: [25, 50], r: 1 });
assert.deepEqual(parseReadEvent({ a: A, x: "share" }), { a: A, x: "share" });
// Sekunden werden begrenzt, 0 traegt nichts.
assert.deepEqual(parseReadEvent({ a: A, s: 99999 }), { a: A, s: MAX_FLUSH_SECONDS });
assert.equal(parseReadEvent({ a: A, s: 0 }), null);
// Herkunft ohne Aufruf zaehlt nicht (und traegt allein nichts).
assert.equal(parseReadEvent({ a: A, q: "ai" }), null);
assert.deepEqual(parseReadEvent({ a: A, q: "ai", s: 3 }), { a: A, s: 3 });
// Verworfen: falsche Formen.
for (const bad of [
  null,
  "x",
  [],
  {},
  { a: "kein-uuid", v: 1 },
  { a: A },
  { a: A, v: 2 },
  { a: A, v: true },
  { a: A, v: 1, q: "google" },
  { a: A, r: 0 },
  { a: A, s: 1.5 },
  { a: A, s: -3 },
  { a: A, s: "12" },
  { a: A, d: [10] },
  { a: A, d: [25, 25] },
  { a: A, d: [25, 50, 75, 100, 25] },
  { a: A, d: "25" },
  { a: A, x: "like" },
]) {
  assert.equal(parseReadEvent(bad), null, JSON.stringify(bad));
}

// --- classifySource ---------------------------------------------------------
const page = "https://digital-age.ch/artikel/beispiel";
const src = (referrer: string, pageUrl = page, landing = true) => classifySource({ landing, pageUrl, referrer });

assert.equal(src(""), "direct");
assert.equal(src("https://www.google.com/"), "search");
assert.equal(src("https://www.google.ch/search?q=ki"), "search");
assert.equal(src("https://www.google.co.uk/"), "search");
assert.equal(src("https://duckduckgo.com/"), "search");
assert.equal(src("https://www.bing.com/search?q=x"), "search");
assert.equal(src("https://gemini.google.com/app"), "ai");
assert.equal(src("https://mail.google.com/mail/u/0/"), "mail");
assert.equal(src("https://chatgpt.com/"), "ai");
assert.equal(src("https://www.perplexity.ai/search/abc"), "ai");
assert.equal(src("https://claude.ai/chat/1"), "ai");
assert.equal(src("https://www.linkedin.com/feed/"), "social");
assert.equal(src("https://lnkd.in/abc"), "social");
assert.equal(src("https://t.co/xyz"), "social");
assert.equal(src("https://mastodon.social/@x"), "social");
assert.equal(src("https://outlook.office.com/mail/"), "mail");
assert.equal(src("https://webmail.example.ch/"), "mail");
assert.equal(src("https://example.org/blog"), "other");
assert.equal(src("kein url"), "other");
assert.equal(src("https://digital-age.ch/"), "internal");
// Nicht «google» im Namen einer fremden Domain.
assert.equal(src("https://notgoogle.evil.example/"), "other");
assert.equal(src("https://google.example.com/"), "other");
// Android-Apps.
assert.equal(src("android-app://com.google.android.gm/"), "mail");
assert.equal(src("android-app://com.linkedin.android/"), "social");
assert.equal(src("android-app://com.google.android.googlequicksearchbox/"), "search");
assert.equal(src("android-app://org.telegram.messenger/"), "other");
// Kampagnen-Parameter schlagen den Verweis.
assert.equal(src("", `${page}?utm_source=chatgpt.com`), "ai");
assert.equal(src("", `${page}?utm_source=linkedin&utm_medium=social`), "social");
assert.equal(src("https://www.google.com/", `${page}?utm_medium=email`), "mail");
assert.equal(src("", `${page}?utm_source=newsletter-kw46`), "mail");
assert.equal(src("", `${page}?utm_source=irgendwas`), "direct");
// Klick innerhalb der Website: immer intern, egal was document.referrer noch zeigt.
assert.equal(src("https://www.google.com/", page, false), "internal");

// --- Lesetiefe --------------------------------------------------------------
// Text beginnt 400px unter dem Fensterrand, Fenster 800 hoch, Text 2000 hoch.
assert.equal(depthPercent({ top: 400, height: 2000, viewport: 800 }), 20);
assert.equal(depthPercent({ top: -200, height: 2000, viewport: 800 }), 50);
assert.equal(depthPercent({ top: -5000, height: 2000, viewport: 800 }), 100);
assert.equal(depthPercent({ top: 900, height: 2000, viewport: 800 }), 0);
assert.equal(depthPercent({ top: 0, height: 0, viewport: 800 }), 0);

assert.deepEqual(marksReached(0), []);
assert.deepEqual(marksReached(24.9), []);
assert.deepEqual(marksReached(25), [25]);
assert.deepEqual(marksReached(76), [25, 50, 75]);
assert.deepEqual(marksReached(97.9), [25, 50, 75]);
assert.deepEqual(marksReached(98), [25, 50, 75, 100]);

assert.equal(readThresholdSeconds(1), 15);
assert.equal(readThresholdSeconds(4), 60);
assert.equal(readThresholdSeconds(6), 90);
assert.equal(readThresholdSeconds(20), 120);
assert.equal(readThresholdSeconds(null), 15);
assert.equal(readThresholdSeconds(0), 15);

assert.equal(activeCapSeconds(2), 600);
assert.equal(activeCapSeconds(10), 1800);
assert.equal(activeCapSeconds(null), 600);

// --- Zustand ----------------------------------------------------------------
let st = newMeterState(true);
// Ohne Aufruf keine Meldung.
st = { ...st, active: 30, maxPercent: 60 };
assert.equal(takeFlush(st, A, 4).event, null);

let res = takeView(st, A, "search");
assert.deepEqual(res.event, { a: A, v: 1, q: "search" });
st = res.state;
// Aufruf nur einmal.
assert.equal(takeView(st, A, "direct").event, null);

res = takeFlush(st, A, 4);
assert.deepEqual(res.event, { a: A, s: 30, d: [25, 50] });
st = res.state;
// Nichts Neues: keine Meldung.
assert.equal(takeFlush(st, A, 4).event, null);

// Ende erreicht, aber noch zu kurz aktiv (Schwelle 60 s bei 4 min).
st = { ...st, active: 45.7, maxPercent: 100 };
res = takeFlush(st, A, 4);
assert.deepEqual(res.event, { a: A, s: 15, d: [75, 100] });
st = res.state;

// Jetzt lange genug: gelesen, einmal.
st = { ...st, active: 61 };
res = takeFlush(st, A, 4);
assert.deepEqual(res.event, { a: A, s: 16, r: 1 });
st = res.state;
st = { ...st, active: 70 };
assert.deepEqual(takeFlush(st, A, 4).event, { a: A, s: 9 });

// Lange Sitzung: pro Meldung hoechstens 900 s, der Rest folgt.
let long = takeView(newMeterState(true), A, "direct").state;
long = { ...long, active: 1000 };
res = takeFlush(long, A, 10);
assert.equal(res.event?.s, 900);
assert.equal(takeFlush(res.state, A, 10).event?.s, 100);

// Die Summe der gemeldeten Sekunden entspricht der aktiven Zeit.
assert.equal(st.flushed, 61);

// Aktionen: je Art einmal, nur nach dem Aufruf.
assert.equal(takeAction(newMeterState(true), A, "share").event, null);
res = takeAction(st, A, "share");
assert.deepEqual(res.event, { a: A, x: "share" });
assert.equal(takeAction(res.state, A, "share").event, null);
assert.deepEqual(takeAction(res.state, A, "listen").event, { a: A, x: "listen" });

// Nach dem Neuladen zaehlt der Besuch nicht.
const muted = { ...newMeterState(false), active: 500, maxPercent: 100 };
assert.equal(takeView(muted, A, "direct").event, null);
assert.equal(takeFlush(muted, A, 4).event, null);
assert.equal(takeAction(muted, A, "share").event, null);

// Jede erzeugte Meldung besteht die Pruefung der Route.
for (const e of [
  { a: A, v: 1, q: "search" },
  { a: A, s: 30, d: [25, 50] },
  { a: A, s: 16, r: 1 },
  { a: A, x: "listen" },
]) {
  assert.deepEqual(parseReadEvent(JSON.parse(JSON.stringify(e))), e);
}

// --- Schutz der Route -------------------------------------------------------
assert.equal(isSameOriginRequest({ secFetchSite: "same-origin", origin: null, host: "digital-age.ch" }), true);
assert.equal(isSameOriginRequest({ secFetchSite: "cross-site", origin: "https://digital-age.ch", host: "digital-age.ch" }), false);
assert.equal(isSameOriginRequest({ secFetchSite: "same-site", origin: null, host: "digital-age.ch" }), false);
assert.equal(isSameOriginRequest({ secFetchSite: null, origin: "https://digital-age.ch", host: "digital-age.ch" }), true);
assert.equal(isSameOriginRequest({ secFetchSite: null, origin: "https://evil.example", host: "digital-age.ch" }), false);
assert.equal(isSameOriginRequest({ secFetchSite: null, origin: "kaputt", host: "digital-age.ch" }), false);
assert.equal(isSameOriginRequest({ secFetchSite: null, origin: null, host: "digital-age.ch" }), true);

assert.equal(hasSuiteSession(null), false);
assert.equal(hasSuiteSession(""), false);
assert.equal(hasSuiteSession("FCCDCF=abc; other=1"), false);
assert.equal(hasSuiteSession("x=1; sb-dkmvadaypxiaxwfkbghz-auth-token=base64-abc"), true);
assert.equal(hasSuiteSession("sb-dkmvadaypxiaxwfkbghz-auth-token.0=a; sb-dkmvadaypxiaxwfkbghz-auth-token.1=b"), true);
assert.equal(hasSuiteSession("sb-dkmvadaypxiaxwfkbghz-auth-token-code-verifier=abc"), false);
assert.equal(hasSuiteSession("mysb-x-auth-token=1"), false);

console.log("reading: alle Tests gruen");
