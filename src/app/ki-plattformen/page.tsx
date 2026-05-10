"use client";

import { useState } from "react";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import PlatformCard, { hostingColor, hostingLabel, catColors, type Hosting, type Platform } from "@/components/PlatformCard";
import PlatformRow from "@/components/PlatformRow";
import CompareDrawer from "@/components/CompareDrawer";
import CompareModal from "@/components/CompareModal";
import ViewToggle, { type ViewMode } from "@/components/ViewToggle";

const allPlatforms: Platform[] = [
  { id: 1,  name: "Claude",          category: "LLM",    tagline: "Anthropic's flagship AI assistant — safe, helpful, honest.",   hosting: "US", pricing: "Free + Pro",   featured: true,  link: "https://claude.ai" },
  { id: 2,  name: "ChatGPT",         category: "LLM",    tagline: "OpenAI's conversational AI with multimodal capabilities.",     hosting: "US", pricing: "Free + Plus",  featured: true,  link: "https://chatgpt.com" },
  { id: 3,  name: "Swiss GPT",       category: "LLM",    tagline: "Swiss-hosted LLM für Enterprise-Compliance. DSGVO-konform.",   hosting: "CH", pricing: "Enterprise",   featured: true,  link: "#" },
  { id: 4,  name: "Midjourney",      category: "Image",  tagline: "State-of-the-art KI-Bildgenerierung mit beeindruckender Qualität.", hosting: "US", pricing: "Paid",         featured: false, link: "https://midjourney.com" },
  { id: 5,  name: "DALL-E 3",        category: "Image",  tagline: "OpenAI's Bildgenerierungsmodell, integriert in ChatGPT.",      hosting: "US", pricing: "Pay-per-use",  featured: false, link: "https://openai.com/dall-e-3" },
  { id: 6,  name: "ElevenLabs",      category: "Audio",  tagline: "Realistische KI-Stimmsynthese in vielen Sprachen.",            hosting: "US", pricing: "Free + Paid",  featured: false, link: "https://elevenlabs.io" },
  { id: 7,  name: "Runway",          category: "Video",  tagline: "KI-Videogenerierung und Bearbeitung für Kreative.",            hosting: "US", pricing: "Free + Paid",  featured: false, link: "https://runwayml.com" },
  { id: 8,  name: "GitHub Copilot",  category: "Code",   tagline: "KI-Pair-Programmer für Entwickler — direkt im Editor.",        hosting: "US", pricing: "Paid",         featured: false, link: "https://github.com/features/copilot" },
  { id: 9,  name: "Cursor",          category: "Code",   tagline: "KI-first Code-Editor für maximale Produktivität.",             hosting: "US", pricing: "Free + Pro",   featured: false, link: "https://cursor.com" },
  { id: 10, name: "Mistral AI",      category: "LLM",    tagline: "Europäische Open-Weight Sprachmodelle. Datenschutzkonform.",   hosting: "EU", pricing: "Free + API",   featured: false, link: "https://mistral.ai" },
  { id: 11, name: "Perplexity",      category: "Search", tagline: "KI-Suchmaschine mit Quellenangaben und Echtzeit-Daten.",       hosting: "US", pricing: "Free + Pro",   featured: false, link: "https://perplexity.ai" },
  { id: 12, name: "Suno",            category: "Audio",  tagline: "Vollständige Songs mit KI generieren — Text zu Musik.",        hosting: "US", pricing: "Free + Paid",  featured: false, link: "https://suno.ai" },
  { id: 13, name: "Gemini",          category: "LLM",    tagline: "Google's multimodales KI-Modell mit Deep Research.",           hosting: "US", pricing: "Free + Ultra", featured: false, link: "https://gemini.google.com" },
  { id: 14, name: "Stable Diffusion",category: "Image",  tagline: "Open-Source Bildgenerierung — lokal oder cloud-gehostet.",     hosting: "EU", pricing: "Free / Open",  featured: false, link: "https://stability.ai" },
];

const categories = ["Alle", "LLM", "Image", "Video", "Audio", "Code", "Search"] as const;
const hostings: Array<"Alle Regionen" | Hosting> = ["Alle Regionen", "CH", "EU", "US"];
const MAX_COMPARE = 3;

export default function KIPlattformenPage() {
  const [cat, setCat] = useState<(typeof categories)[number]>("Alle");
  const [host, setHost] = useState<"Alle Regionen" | Hosting>("Alle Regionen");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const accent = "var(--da-green)";

  const featured = allPlatforms.filter((p) => p.featured);
  const filtered = allPlatforms.filter((p) => {
    if (cat !== "Alle" && p.category !== cat) return false;
    if (host !== "Alle Regionen" && p.hosting !== host) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.tagline.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const nonFeatured = filtered.filter((p) => !p.featured);
  const hasFilter = cat !== "Alle" || host !== "Alle Regionen" || search.length > 0;
  const resetFilters = () => { setCat("Alle"); setHost("Alle Regionen"); setSearch(""); };

  const toggleCompare = (id: number) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_COMPARE ? [...prev, id] : prev
    );
  };

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh", paddingBottom: compareIds.length > 0 ? 80 : 0 }}>
      <NewsTicker />

      <style>{`
        .kip-shell { max-width: var(--max-content); margin: 0 auto; }
        .kip-pad   { padding-left: var(--sp-8); padding-right: var(--sp-8); }
        .kip-hero {
          border-bottom: 1px solid var(--da-border);
          padding: 56px var(--sp-8) 48px;
        }
        .kip-hero__overline {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
          margin-bottom: 14px;
        }
        .kip-hero__row {
          display: flex; align-items: flex-end; justify-content: space-between;
          flex-wrap: wrap; gap: var(--sp-6);
        }
        .kip-hero__title {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: clamp(36px, 5vw, 56px);
          font-weight: 700; line-height: 1.0; letter-spacing: -0.02em;
          margin-bottom: var(--sp-4);
        }
        .kip-hero__title em { font-style: normal; color: var(--da-green); }
        .kip-hero__lead {
          color: var(--da-muted); font-size: 17px; line-height: 1.65; max-width: 560px;
        }
        .kip-legend { display: flex; flex-direction: column; gap: var(--sp-2); }
        .kip-legend__row { display: flex; align-items: center; gap: 10px; }
        .kip-legend__dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        .kip-legend__label { color: var(--da-muted); font-size: 13px; }

        .kip-section { padding: 48px var(--sp-8) 0; }
        .kip-section-tight { padding: 56px var(--sp-8) 0; }
        .kip-section-h {
          display: flex; align-items: center; gap: var(--sp-3);
          margin-bottom: var(--sp-6);
        }
        .kip-section-h__bar { width: 3px; height: 22px; background: var(--da-green); border-radius: 2px; }
        .kip-section-h__title {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: 22px; font-weight: 700;
        }

        .kip-feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-5); }

        .kip-grid-wrap { display: grid; grid-template-columns: 220px 1fr; gap: 48px; align-items: start; }
        .kip-aside {
          position: sticky; top: var(--aside-sticky-top);
          display: flex; flex-direction: column; gap: var(--sp-6);
        }
        .kip-flabel {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: var(--sp-3);
        }
        .kip-search {
          width: 100%; background: var(--da-card); color: var(--da-text);
          border: 1px solid var(--da-border); border-radius: var(--r-sm);
          padding: 10px 14px; font-size: 13px; font-family: var(--da-font-body);
        }
        .kip-search:focus { border-color: var(--da-green); outline: none; }
        .kip-fbtn {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; background: none; border: none; cursor: pointer;
          padding: 9px 0; border-bottom: 1px solid var(--da-border);
          font-size: 13px; font-family: var(--da-font-body); text-align: left;
          color: var(--da-text-strong); font-weight: 400;
        }
        .kip-fbtn--active { color: var(--da-text); font-weight: 700; }
        .kip-fbtn__l { display: flex; align-items: center; gap: var(--sp-2); }
        .kip-fbtn__dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
        .kip-fbtn__count {
          font-family: var(--da-font-mono); font-size: 11px;
          color: var(--da-border);
        }
        .kip-fbtn--active .kip-fbtn__count { color: var(--da-green); }

        .kip-cta-card {
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: var(--r-lg); padding: 18px;
        }
        .kip-cta-card__hint { color: var(--da-muted); font-size: 12px; line-height: 1.5; }
        .kip-cta-card__sel { margin-top: 12px; color: var(--da-green); font-size: 12px; font-weight: 600; }

        .kip-toolbar {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-5);
        }
        .kip-toolbar__count {
          color: var(--da-muted); font-size: 12px;
          font-family: var(--da-font-mono);
        }
        .kip-toolbar__reset {
          background: none; border: none; color: var(--da-orange);
          font-size: 12px; cursor: pointer; margin-left: var(--sp-3);
          font-family: var(--da-font-mono);
        }

        .kip-main-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-4); }
        .kip-list { display: block; }

        .kip-empty { text-align: center; padding: 80px 0; }
        .kip-empty__msg { color: var(--da-muted); font-size: 16px; }
        .kip-empty__btn {
          background: none; border: 1px solid var(--da-green); color: var(--da-green);
          padding: 10px 24px; border-radius: var(--r-sm); font-size: 13px; cursor: pointer;
          margin-top: var(--sp-4);
        }

        @media (max-width: 1024px) {
          .kip-grid-wrap { grid-template-columns: 1fr; gap: var(--sp-8); }
          .kip-aside { position: static; }
          .kip-feat-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 720px) {
          .kip-feat-grid { grid-template-columns: 1fr; }
          .kip-main-grid { grid-template-columns: 1fr; }
          .kip-hero { padding: 40px var(--sp-6) 32px; }
        }
      `}</style>

      {/* Hero */}
      <section className="kip-hero">
        <div className="kip-shell">
          <p className="kip-hero__overline">Ressourcen</p>
          <div className="kip-hero__row">
            <div>
              <h1 className="kip-hero__title">KI-<em>Plattformen</em></h1>
              <p className="kip-hero__lead">
                Kuratierte Übersicht der wichtigsten KI-Tools — mit Fokus auf Enterprise-Tauglichkeit, Hosting-Region und Preismodell.
              </p>
            </div>
            <div className="kip-legend" aria-label="Hosting-Legende">
              {(["CH", "EU", "US"] as Hosting[]).map((h) => (
                <div key={h} className="kip-legend__row">
                  <span className="kip-legend__dot" style={{ background: hostingColor(h) }} />
                  <span className="kip-legend__label">
                    {h === "CH" ? "Schweizer Hosting" : h === "EU" ? "Europäisches Hosting" : "US-basiert"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="kip-shell kip-section">
        <div className="kip-section-h">
          <span className="kip-section-h__bar" />
          <h2 className="kip-section-h__title">Top Picks</h2>
        </div>
        <div className="kip-feat-grid">
          {featured.map((p) => (
            <PlatformCard
              key={p.id}
              platform={p}
              inCompare={compareIds.includes(p.id)}
              onToggleCompare={toggleCompare}
              accent={accent}
            />
          ))}
        </div>
      </section>

      {/* Directory */}
      <section className="kip-shell kip-section-tight">
        <div className="kip-grid-wrap">
          {/* Sidebar */}
          <aside className="kip-aside">
            <div>
              <p className="kip-flabel">Suche</p>
              <input
                type="text"
                placeholder="Tool suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="kip-search"
              />
            </div>

            <div>
              <p className="kip-flabel">Kategorie</p>
              {categories.map((c) => {
                const count = c === "Alle" ? allPlatforms.length : allPlatforms.filter((p) => p.category === c).length;
                const cc = catColors[c];
                const active = c === cat;
                return (
                  <button
                    key={c}
                    type="button"
                    className={`kip-fbtn${active ? " kip-fbtn--active" : ""}`}
                    onClick={() => setCat(c)}
                  >
                    <span className="kip-fbtn__l">
                      {cc && <span className="kip-fbtn__dot" style={{ background: cc, opacity: active ? 1 : 0.45 }} />}
                      {c}
                    </span>
                    <span className="kip-fbtn__count">{count}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <p className="kip-flabel">Hosting-Region</p>
              {hostings.map((h) => {
                const active = h === host;
                return (
                  <button
                    key={h}
                    type="button"
                    className={`kip-fbtn${active ? " kip-fbtn--active" : ""}`}
                    onClick={() => setHost(h)}
                  >
                    <span className="kip-fbtn__l">
                      {h !== "Alle Regionen" && <span className="kip-fbtn__dot" style={{ background: hostingColor(h) }} />}
                      {h === "Alle Regionen" ? h : hostingLabel(h)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="kip-cta-card">
              <p className="kip-flabel">Vergleich</p>
              <p className="kip-cta-card__hint">
                Bis zu 3 Plattformen per &laquo;+ Vergleich&raquo; markieren und gegenüberstellen.
              </p>
              {compareIds.length > 0 && (
                <div className="kip-cta-card__sel">{compareIds.length} ausgewählt</div>
              )}
            </div>
          </aside>

          {/* Main */}
          <div>
            <div className="kip-toolbar">
              <p className="kip-toolbar__count">
                {nonFeatured.length} {nonFeatured.length === 1 ? "Plattform" : "Plattformen"}
                {hasFilter && (
                  <button type="button" className="kip-toolbar__reset" onClick={resetFilters}>
                    Filter zurücksetzen ×
                  </button>
                )}
              </p>
              <ViewToggle value={view} onChange={setView} accent={accent} />
            </div>

            {nonFeatured.length === 0 ? (
              <div className="kip-empty">
                <p className="kip-empty__msg">Keine Plattformen gefunden.</p>
                <button type="button" className="kip-empty__btn" onClick={resetFilters}>
                  Filter zurücksetzen
                </button>
              </div>
            ) : view === "grid" ? (
              <div className="kip-main-grid">
                {nonFeatured.map((p) => (
                  <PlatformCard
                    key={p.id}
                    platform={p}
                    inCompare={compareIds.includes(p.id)}
                    onToggleCompare={toggleCompare}
                    accent={accent}
                  />
                ))}
              </div>
            ) : (
              <div className="kip-list">
                {nonFeatured.map((p) => (
                  <PlatformRow
                    key={p.id}
                    platform={p}
                    inCompare={compareIds.includes(p.id)}
                    onToggleCompare={toggleCompare}
                    accent={accent}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />

      <CompareDrawer
        ids={compareIds}
        platforms={allPlatforms}
        onRemove={(id) => setCompareIds((prev) => prev.filter((x) => x !== id))}
        onClear={() => setCompareIds([])}
        onOpen={() => setShowCompare(true)}
      />
      {showCompare && (
        <CompareModal
          ids={compareIds}
          platforms={allPlatforms}
          onClose={() => setShowCompare(false)}
        />
      )}
    </main>
  );
}
