// Manueller Test-Runner fuer die Beitragsvorschau.
//   npx tsx src/lib/articles/__tests__/preview.manual.ts
import {
  PREVIEW_TOKEN_RE,
  applyPreviewOverrides,
  canRespondToPreview,
  draftPreviewPath,
  fitScale,
  formatDecisionTime,
  isPreviewOverrides,
  previewDecisionStatus,
  previewFingerprint,
  previewLinkPath,
  previewLinkState,
  previewMailto,
  previewShareText,
  previewWhatsapp,
  validatePreviewResponse,
  type PreviewOverrides,
} from "../preview";
import { hidesSiteNav, isArticlePreviewPath, isChromelessPath } from "../../siteChrome";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}
const eq = (label: string, got: unknown, want: unknown) =>
  ok(label, JSON.stringify(got) === JSON.stringify(want), `erhalten ${JSON.stringify(got)}, erwartet ${JSON.stringify(want)}`);

// --- Pfade und Token
ok("Token: 48 Hex-Zeichen", PREVIEW_TOKEN_RE.test("0a".repeat(24)) && !PREVIEW_TOKEN_RE.test("entwurf") && !PREVIEW_TOKEN_RE.test("0A".repeat(24)));
eq("Pfad des Links", previewLinkPath("ab".repeat(24)), `/vorschau/artikel/${"ab".repeat(24)}`);
eq("Pfad des Entwurfs", [draftPreviewPath("x1"), draftPreviewPath("x1", true)], ["/vorschau/artikel/entwurf/x1", "/vorschau/artikel/entwurf/x1?embed=1"]);

// --- Zustand des Links
{
  const now = Date.parse("2026-11-20T10:00:00Z");
  eq("gueltig", previewLinkState({ expires_at: "2026-12-15T00:00:00Z", revoked_at: null }, now), "active");
  eq("abgelaufen", previewLinkState({ expires_at: "2026-11-19T00:00:00Z", revoked_at: null }, now), "expired");
  eq("gesperrt geht vor abgelaufen", previewLinkState({ expires_at: "2026-11-19T00:00:00Z", revoked_at: "2026-11-18T00:00:00Z" }, now), "revoked");
}
eq("Rueckmeldung nur vor dem Erscheinen", ["draft", "in_review", "published", "archived"].map(canRespondToPreview), [true, true, false, false]);

// --- Rueckmeldung pruefen
{
  const a = validatePreviewResponse({ decision: "approved", name: "  Andreas   Kamm ", note: "" });
  ok("Freigabe ohne Bemerkung", a.ok && a.value.name === "Andreas Kamm" && a.value.note === null);
  const c = validatePreviewResponse({ decision: "changes", name: "Andreas Kamm", note: "  Bitte den Titel kürzen.\r\nDanke. " });
  ok("Aenderungswunsch mit Bemerkung", c.ok && c.value.decision === "changes" && c.value.note === "Bitte den Titel kürzen.\nDanke.");
  ok("Aenderungswunsch ohne Bemerkung wird abgelehnt", !validatePreviewResponse({ decision: "changes", name: "Andreas Kamm", note: " " }).ok);
  ok("ohne Namen wird abgelehnt", !validatePreviewResponse({ decision: "approved", name: " ", note: "" }).ok);
  ok("zu langer Name wird abgelehnt", !validatePreviewResponse({ decision: "approved", name: "x".repeat(121), note: "" }).ok);
  ok("zu lange Bemerkung wird abgelehnt", !validatePreviewResponse({ decision: "approved", name: "Andreas Kamm", note: "x".repeat(2001) }).ok);
  ok("fremder Entscheid wird abgelehnt", !validatePreviewResponse({ decision: "publish", name: "Andreas Kamm", note: "" }).ok);
}

// --- Pruefsumme
{
  const base = { title: "Titel", excerpt: "Lead", body_blocks: { version: 1, blocks: [{ id: "b1", type: "paragraph", content: "Text" }], sources: [] }, tags: ["ki"], is_featured: false, updated_at: "2026-11-15" };
  const fp = previewFingerprint(base);
  ok("Pruefsumme ist stabil", fp === previewFingerprint({ ...base }) && fp.length === 28);
  ok("Reihenfolge der Schluessel spielt keine Rolle", fp === previewFingerprint({ ...base, body_blocks: { sources: [], blocks: [{ content: "Text", type: "paragraph", id: "b1" }], version: 1 } }));
  ok("unsichtbare Felder aendern nichts", fp === previewFingerprint({ ...base, is_featured: true, updated_at: "2026-11-16", seo_title: "x" }));
  ok("Titel aendert die Pruefsumme", fp !== previewFingerprint({ ...base, title: "Titel!" }));
  ok("Text aendert die Pruefsumme", fp !== previewFingerprint({ ...base, body_blocks: { ...base.body_blocks, blocks: [{ id: "b1", type: "paragraph", content: "Text." }] } }));
  ok("Bild aendert die Pruefsumme", fp !== previewFingerprint({ ...base, cover_image_url: "/x.png" }));
  ok("fehlend und null sind gleich", fp === previewFingerprint({ ...base, cover_image_url: null }));

  const link = { decision: "approved", decided_at: "2026-11-15T13:05:00Z", decided_by: "Andreas Kamm", decision_note: null, decided_fingerprint: fp };
  eq("Freigabe gilt fuer die aktuelle Fassung", previewDecisionStatus(link, fp), { kind: "approved", at: "2026-11-15T13:05:00Z", by: "Andreas Kamm", note: null, stale: false });
  ok("nach einer Aenderung gilt sie fuer eine fruehere Fassung", (() => { const s = previewDecisionStatus(link, previewFingerprint({ ...base, title: "Neu" })); return s.kind === "approved" && s.stale; })());
  eq("ohne Rueckmeldung", previewDecisionStatus({ decision: null, decided_at: null, decided_by: null, decision_note: null, decided_fingerprint: null }, fp), { kind: "none" });
}
eq("Zeit in Schweizer Zeit", formatDecisionTime("2026-11-15T13:05:00Z"), "15.11.2026, 14:05");

// --- Weitergeben
{
  const url = "https://digital-age.ch/vorschau/artikel/abc";
  const text = previewShareText("KI & Recht", url);
  ok("Text nennt Titel und Link", text.includes("«KI & Recht»") && text.includes(url));
  const mail = previewMailto("KI & Recht", url);
  ok("Mail-Link ist kodiert", mail.startsWith("mailto:?subject=Vorschau%3A%20KI%20%26%20Recht&body=") && !mail.includes(" "));
  ok("Mail-Link mit Adresse", previewMailto("T", url, "a@b.ch").startsWith("mailto:a%40b.ch?subject="));
  ok("WhatsApp-Link ist kodiert", previewWhatsapp("KI & Recht", url).startsWith("https://wa.me/?text=Vorschau%20deines") && previewWhatsapp("KI & Recht", url).includes("%26"));
}

// --- Massstab
eq("Massstab", [fitScale(1000, 1440), fitScale(1600, 1440), fitScale(800, 390), fitScale(0, 1440)], [0.694, 1, 1, 1]);

// --- Ungespeicherter Stand
{
  const article = {
    id: "a1", title: "Alt", excerpt: "Alt", body_blocks: null, tags: [], subcategory: null, locale: "de-CH",
    published_at: null as string | null, reading_minutes: 3,
    cover_image_url: null, cover_image_alt: null, cover_image_caption: null, cover_image_source: null, cover_video_url: null, disclosure_note: null,
    category: { id: "c1", slug: "ki-business", name_de: "KI & Business", description: "x" },
    author: { id: "u1", display_name: "Andreas Kamm", role: "external", avatar_url: "/a.png", bio: "Bio", job_title: "CEO", slug: "andreas-kamm", handle: "andreas" },
  };
  const o: PreviewOverrides = {
    title: "Neu", excerpt: "Neuer Lead", body_blocks: { version: 1, blocks: [], sources: [] } as PreviewOverrides["body_blocks"],
    cover_image_url: "/neu.png", cover_image_alt: "Alt-Text", cover_image_caption: null, cover_image_source: null, cover_video_url: null,
    disclosure_note: "Hinweis", tags: ["ki"], subcategory: "Agenten", locale: "en", published_date: "2026-11-20", reading_minutes: 6,
    category: { id: "c2", slug: "future-tech", name_de: "Future Tech" }, author: { id: "u1", display_name: "Andreas Kamm", role: "external" },
  };
  const m = applyPreviewOverrides(article, o);
  eq("Felder uebernommen", [m.title, m.excerpt, m.cover_image_url, m.tags, m.subcategory, m.locale, m.reading_minutes, m.disclosure_note], ["Neu", "Neuer Lead", "/neu.png", ["ki"], "Agenten", "en", 6, "Hinweis"]);
  eq("Datum gesetzt", m.published_at, "2026-11-20T11:00:00.000Z");
  eq("Rubrik gewechselt", [m.category?.slug, m.category?.name_de], ["future-tech", "Future Tech"]);
  eq("gleicher Autor behaelt Bild und Bio", [m.author?.avatar_url, m.author?.bio], ["/a.png", "Bio"]);
  const other = applyPreviewOverrides(article, { ...o, published_date: "", author: { id: "u2", display_name: "Ali Soy", role: "editor" } });
  eq("anderer Autor: nur Name und Rolle", [other.author?.display_name, other.author?.role, other.author?.avatar_url, other.author?.bio], ["Ali Soy", "editor", null, null]);
  eq("ohne Datum bleibt das gespeicherte", other.published_at, null);
  ok("Nachricht wird geprueft", isPreviewOverrides(o) && !isPreviewOverrides({ title: "x" }) && !isPreviewOverrides(null) && !isPreviewOverrides({ ...o, body_blocks: "x" }));
}

// --- Seitenrahmen: Beitragsvorschau zeigt Navbar und Ticker, bleibt aber ohne Tracking
{
  const token = `/vorschau/artikel/${"ab".repeat(24)}`;
  eq("Beitragsvorschau erkannt", [isArticlePreviewPath(token), isArticlePreviewPath("/vorschau/artikel/entwurf/x"), isArticlePreviewPath(`/vorschau/${"ab".repeat(24)}`), isArticlePreviewPath("/vorschau/artikelx")], [true, true, false, false]);
  eq("Navbar und Ticker", [hidesSiteNav(token), hidesSiteNav(`/vorschau/${"ab".repeat(24)}`), hidesSiteNav("/autor/artikel/1"), hidesSiteNav("/artikel/x")], [false, true, true, false]);
  ok("Tracking, CMP und Anzeigen bleiben aus", isChromelessPath(token) && isChromelessPath("/vorschau/artikel/entwurf/x"));
  // Fragebogen des Showcase: chromefrei, die Showcase-Seiten selbst nicht.
  ok(
    "Showcase-Fragebogen ist chromefrei",
    isChromelessPath("/showcase/mitmachen/abc") && hidesSiteNav("/showcase/mitmachen/abc") && !isChromelessPath("/showcase") && !isChromelessPath("/showcase/mitmachen-beitrag"),
  );
}

console.log(fails === 0 ? "\nAlle Tests gruen." : `\n${fails} Test(s) fehlgeschlagen.`);
process.exit(fails === 0 ? 0 : 1);
