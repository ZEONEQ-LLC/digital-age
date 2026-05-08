"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import NewsTicker from "@/components/NewsTicker";
import { submitExternalPitch } from "@/lib/mockAuthorApi";

type FormState = {
  title: string;
  excerpt: string;
  category: string;
  contentMd: string;
  authorName: string;
  authorEmail: string;
  authorRole: string;
  authorBio: string;
  authorWebsite: string;
  original: boolean;
  editorial: boolean;
};

const empty: FormState = {
  title: "",
  excerpt: "",
  category: "",
  contentMd: "",
  authorName: "",
  authorEmail: "",
  authorRole: "",
  authorBio: "",
  authorWebsite: "",
  original: false,
  editorial: false,
};

const categories = [
  { id: "ki-business", label: "KI im Business",  color: "var(--da-green)" },
  { id: "future-tech", label: "Future Tech",      color: "var(--da-purple)" },
  { id: "swiss-ai",    label: "Swiss AI",          color: "var(--da-green)" },
  { id: "tools",       label: "Tools & Prompts",   color: "var(--da-orange)" },
  { id: "andere",      label: "Andere",            color: "var(--da-muted-soft)" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--da-dark)",
  color: "var(--da-text)",
  border: "1px solid var(--da-border)",
  borderRadius: 4,
  padding: "11px 14px",
  fontSize: 14,
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  color: "var(--da-text-strong)",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 8,
};

const helperStyle: React.CSSProperties = {
  color: "var(--da-muted-soft)",
  fontSize: 12,
  marginTop: 6,
  lineHeight: 1.5,
};

const MAX_BODY = 10000;

export default function PitchPage() {
  const [data, setData] = useState<FormState>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setData((p) => ({ ...p, [k]: v }));

  const titleOk = data.title.trim().length >= 8;
  const excerptLen = data.excerpt.trim().length;
  const excerptOk = excerptLen >= 200 && excerptLen <= 800;
  const bodyLen = data.contentMd.trim().length;
  const bodyOk = bodyLen >= 1500 && bodyLen <= MAX_BODY;
  const categoryOk = !!data.category;
  const step1 = titleOk && excerptOk && bodyOk && categoryOk;

  const authorOk = data.authorName.trim().length >= 2;
  const emailOk = /\S+@\S+\.\S+/.test(data.authorEmail);
  const bioOk = data.authorBio.trim().length >= 30 && data.authorBio.trim().length <= 200;
  const step2 = authorOk && emailOk && bioOk;

  const step3 = data.original && data.editorial;

  const allValid = step1 && step2 && step3;
  const completeCount = [step1, step2, step3].filter(Boolean).length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) return;
    setSubmitting(true);
    setTimeout(() => {
      const cat = categories.find((c) => c.id === data.category)?.label ?? "Andere";
      submitExternalPitch({
        title: data.title.trim(),
        excerpt: data.excerpt.trim(),
        category: cat,
        contentMd: data.contentMd,
        authorName: data.authorName.trim(),
        authorEmail: data.authorEmail.trim(),
        authorRole: data.authorRole.trim() || undefined,
        authorBio: data.authorBio.trim(),
        authorWebsite: data.authorWebsite.trim() || undefined,
      });
      setSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  const reset = () => {
    setData(empty);
    setSubmitted(false);
  };

  const submittedView = useMemo(() => (
    <div
      style={{
        background: "var(--da-card)",
        border: "1px solid var(--da-green)",
        borderRadius: 12,
        padding: 56,
        textAlign: "center",
        animation: "da-fadein 0.4s ease-out",
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(50,255,126,0.12)",
          border: "2px solid var(--da-green)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          fontSize: 28,
          color: "var(--da-green)",
          fontWeight: 700,
        }}
      >
        ✓
      </div>
      <h2
        style={{
          color: "var(--da-text)",
          fontSize: 28,
          fontWeight: 700,
          fontFamily: "var(--da-font-display)",
          marginBottom: 12,
        }}
      >
        Vielen Dank!
      </h2>
      <p style={{ color: "var(--da-muted)", fontSize: 15, lineHeight: 1.65, maxWidth: 460, margin: "0 auto 24px" }}>
        Dein Beitrag <strong style={{ color: "var(--da-text)" }}>&bdquo;{data.title}&rdquo;</strong> ist bei der
        Redaktion. Wir melden uns innerhalb von 5 Werktagen an{" "}
        <strong style={{ color: "var(--da-green)" }}>{data.authorEmail}</strong>.
      </p>
      <div
        style={{
          background: "var(--da-dark)",
          border: "1px solid var(--da-border)",
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
          textAlign: "left",
          maxWidth: 460,
          margin: "0 auto 24px",
        }}
      >
        <p
          style={{
            color: "var(--da-faint)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 12,
            fontFamily: "var(--da-font-mono)",
          }}
        >
          Was passiert als Nächstes?
        </p>
        <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "Redaktion prüft Beitrag auf Fit & Originalität",
            "Du bekommst Feedback (Annahme · Anpassung · Ablehnung)",
            "Bei Annahme: Wir lektorieren und du gibst Final-OK",
          ].map((s, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: 10,
                fontSize: 13,
                color: "var(--da-text-strong)",
                lineHeight: 1.5,
              }}
            >
              <span
                style={{
                  color: "var(--da-green)",
                  fontFamily: "var(--da-font-mono)",
                  fontWeight: 700,
                  fontSize: 12,
                  minWidth: 16,
                }}
              >
                0{i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Link
          href="/"
          style={{
            background: "var(--da-green)",
            color: "var(--da-dark)",
            fontSize: 13,
            fontWeight: 700,
            padding: "11px 22px",
            borderRadius: 4,
            textDecoration: "none",
          }}
        >
          Zur Startseite →
        </Link>
        <button
          type="button"
          onClick={reset}
          style={{
            background: "transparent",
            color: "var(--da-text)",
            fontSize: 13,
            fontWeight: 600,
            padding: "11px 22px",
            borderRadius: 4,
            border: "1px solid var(--da-border)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Weiteren Beitrag einreichen
        </button>
      </div>
    </div>
  ), [data.title, data.authorEmail]);

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <Navbar />
      <NewsTicker />

      <style>{`
        .a-pitch__hero {
          border-bottom: 1px solid var(--da-border);
          padding: 48px 32px 40px;
          position: relative; overflow: hidden;
        }
        .a-pitch__hero-grid {
          position: absolute; inset: 0; opacity: 0.05;
          background-image:
            linear-gradient(var(--da-green) 1px, transparent 1px),
            linear-gradient(90deg, var(--da-green) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .a-pitch__hero-inner {
          position: relative; max-width: 1100px; margin: 0 auto;
        }
        .a-pitch__overline {
          color: var(--da-green); font-size: 11px; font-weight: 700;
          letter-spacing: 0.18em; text-transform: uppercase;
          margin-bottom: 14px; font-family: var(--da-font-mono);
        }
        .a-pitch__title {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: clamp(32px, 4.4vw, 48px); font-weight: 700;
          line-height: 1.0; letter-spacing: -0.02em;
          margin-bottom: 14px;
        }
        .a-pitch__title em { font-style: normal; color: var(--da-green); }
        .a-pitch__lead { color: var(--da-muted); font-size: 16px; line-height: 1.65; max-width: 640px; }
        .a-pitch__section { max-width: 1100px; margin: 0 auto; padding: 48px 32px 96px; }
        .a-pitch__cols {
          display: grid; grid-template-columns: 1fr 320px; gap: 40px; align-items: start;
        }
        .a-pitch__step-card {
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: 8px; padding: 28px;
          margin-bottom: 28px;
        }
        .a-pitch__step-head {
          display: flex; align-items: flex-start; gap: 14px;
          margin-bottom: 20px; padding-bottom: 14px;
          border-bottom: 1px solid var(--da-border);
        }
        .a-pitch__step-num {
          width: 28px; height: 28px; border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; flex-shrink: 0;
          font-family: var(--da-font-mono);
        }
        .a-pitch__pill {
          border-radius: 999px; padding: 8px 14px;
          font-size: 12px; font-weight: 600; cursor: pointer;
          display: inline-flex; align-items: center; gap: 7px;
          font-family: inherit;
        }
        .a-pitch__pill-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
        .a-pitch__check {
          display: flex; gap: 12px; align-items: flex-start;
          cursor: pointer; user-select: none;
        }
        .a-pitch__check input { width: 18px; height: 18px; margin-top: 2px; flex-shrink: 0; accent-color: var(--da-green); }
        .a-pitch__submit {
          width: 100%; padding: 16px 32px; border-radius: 4px;
          background: var(--da-green); color: var(--da-dark);
          border: none; font-size: 15px; font-weight: 700;
          cursor: pointer; transition: filter var(--t-fast);
          display: flex; align-items: center; justify-content: center; gap: 10px;
          font-family: inherit;
        }
        .a-pitch__submit:disabled {
          background: #2a2a2e; color: var(--da-faint);
          cursor: not-allowed;
        }
        @media (max-width: 1024px) {
          .a-pitch__cols { grid-template-columns: 1fr; gap: 32px; }
        }
      `}</style>

      <section className="a-pitch__hero">
        <div className="a-pitch__hero-grid" aria-hidden />
        <div className="a-pitch__hero-inner">
          <p className="a-pitch__overline">&gt; Mitwirken</p>
          <h1 className="a-pitch__title">
            Artikel <em>pitchen</em>
          </h1>
          <p className="a-pitch__lead">
            Du hast ein Thema, das die DACH-Tech-Szene bewegen sollte? Reich deinen Beitrag direkt ein —
            Titel, Abstract, Volltext (Markdown). Wir melden uns innert 5 Werktagen.
          </p>
        </div>
      </section>

      <section className="a-pitch__section">
        {submitted ? submittedView : (
          <div className="a-pitch__cols">
            <form onSubmit={submit}>
              {/* Step 1 */}
              <div className="a-pitch__step-card">
                <StepHeader n={1} title="Dein Artikel" subtitle="Worum geht's?" complete={step1} />

                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>
                    <span>Arbeitstitel <span style={{ color: "var(--da-green)" }}>*</span></span>
                    <span style={{ color: "var(--da-faint)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
                      {data.title.length}/100
                    </span>
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={data.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="z.B. Warum Schweizer KMU bei Edge-AI vorne dabei sind"
                    style={inputStyle}
                  />
                  <p style={helperStyle}>Klar, konkret, weckt Neugier. Kein Clickbait.</p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>
                    <span>Abstract <span style={{ color: "var(--da-green)" }}>*</span></span>
                    <span
                      style={{
                        color:
                          excerptLen > 800
                            ? "var(--da-red)"
                            : excerptLen >= 200
                              ? "var(--da-green)"
                              : "var(--da-faint)",
                        fontSize: 11,
                        fontFamily: "var(--da-font-mono)",
                      }}
                    >
                      {excerptLen}/800 (min. 200)
                    </span>
                  </label>
                  <textarea
                    rows={5}
                    value={data.excerpt}
                    onChange={(e) => set("excerpt", e.target.value)}
                    placeholder="Worum geht's? These, Insight, Takeaway in 1–2 Absätzen."
                    style={{ ...inputStyle, resize: "vertical", minHeight: 120, lineHeight: 1.6 }}
                  />
                  <p style={helperStyle}>Hook in Satz 1, These in Satz 2, Beweis in Satz 3, Takeaway am Ende.</p>
                </div>

                <div style={{ marginBottom: 22 }}>
                  <label style={labelStyle}>
                    <span>Kategorie <span style={{ color: "var(--da-green)" }}>*</span></span>
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {categories.map((c) => {
                      const sel = data.category === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className="a-pitch__pill"
                          onClick={() => set("category", c.id)}
                          style={{
                            background: sel ? "var(--da-text)" : "var(--da-dark)",
                            color: sel ? "var(--da-dark)" : "var(--da-text-strong)",
                            border: `1px solid ${sel ? "var(--da-text)" : "var(--da-border)"}`,
                          }}
                        >
                          <span className="a-pitch__pill-dot" style={{ background: c.color }} />
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    <span>Volltext (Markdown) <span style={{ color: "var(--da-green)" }}>*</span></span>
                    <span
                      style={{
                        color:
                          bodyLen > MAX_BODY
                            ? "var(--da-red)"
                            : bodyLen >= 1500
                              ? "var(--da-green)"
                              : "var(--da-faint)",
                        fontSize: 11,
                        fontFamily: "var(--da-font-mono)",
                      }}
                    >
                      {bodyLen.toLocaleString("de-CH")}/{MAX_BODY.toLocaleString("de-CH")} (min. 1.500)
                    </span>
                  </label>
                  <textarea
                    rows={14}
                    value={data.contentMd}
                    onChange={(e) => set("contentMd", e.target.value.slice(0, MAX_BODY))}
                    placeholder={"## Heading\n\nDein Text. **bold**, _italic_, [link](url) supported.\n\n- Punkt 1\n- Punkt 2\n\n> Zitat"}
                    spellCheck
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      minHeight: 360,
                      fontFamily: "var(--da-font-mono)",
                      fontSize: 13,
                      lineHeight: 1.65,
                    }}
                  />
                  <p style={helperStyle}>
                    Markdown unterstützt: <code style={{ color: "var(--da-green)" }}>##</code> Heading,{" "}
                    <code style={{ color: "var(--da-green)" }}>**bold**</code>,{" "}
                    <code style={{ color: "var(--da-green)" }}>-</code> Liste,{" "}
                    <code style={{ color: "var(--da-green)" }}>{">"}</code> Zitat.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="a-pitch__step-card">
                <StepHeader n={2} title="Über dich" subtitle="Damit Leser wissen, wer schreibt" complete={step2} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                  <div>
                    <label style={labelStyle}>
                      <span>Name <span style={{ color: "var(--da-green)" }}>*</span></span>
                    </label>
                    <input
                      type="text"
                      value={data.authorName}
                      onChange={(e) => set("authorName", e.target.value)}
                      placeholder="Vor- und Nachname"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      <span>E-Mail <span style={{ color: "var(--da-green)" }}>*</span></span>
                    </label>
                    <input
                      type="email"
                      value={data.authorEmail}
                      onChange={(e) => set("authorEmail", e.target.value)}
                      placeholder="für Rückmeldung"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                  <div>
                    <label style={labelStyle}>
                      <span>
                        Aktuelle Rolle{" "}
                        <span style={{ color: "var(--da-faint)", fontWeight: 400, fontSize: 12 }}>optional</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      value={data.authorRole}
                      onChange={(e) => set("authorRole", e.target.value)}
                      placeholder="z.B. CTO, Beraterin, Forscher"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      <span>
                        LinkedIn / Website{" "}
                        <span style={{ color: "var(--da-faint)", fontWeight: 400, fontSize: 12 }}>optional</span>
                      </span>
                    </label>
                    <input
                      type="url"
                      value={data.authorWebsite}
                      onChange={(e) => set("authorWebsite", e.target.value)}
                      placeholder="https://..."
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    <span>Kurzbio <span style={{ color: "var(--da-green)" }}>*</span></span>
                    <span
                      style={{
                        color:
                          data.authorBio.length > 200
                            ? "var(--da-red)"
                            : data.authorBio.length >= 30
                              ? "var(--da-green)"
                              : "var(--da-faint)",
                        fontSize: 11,
                        fontFamily: "var(--da-font-mono)",
                      }}
                    >
                      {data.authorBio.length}/200 (min. 30)
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    value={data.authorBio}
                    onChange={(e) => set("authorBio", e.target.value)}
                    placeholder="Wer du bist, woran du arbeitest, was deine Expertise ist."
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
              </div>

              {/* Step 3 */}
              <div className="a-pitch__step-card">
                <StepHeader n={3} title="Bestätigung" subtitle="Letzter Schritt" complete={step3} />
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <label className="a-pitch__check">
                    <input
                      type="checkbox"
                      checked={data.original}
                      onChange={(e) => set("original", e.target.checked)}
                    />
                    <span style={{ color: "var(--da-text-strong)", fontSize: 13, lineHeight: 1.6 }}>
                      Ich bestätige, dass es sich um einen{" "}
                      <strong style={{ color: "var(--da-text)" }}>Originalbeitrag</strong> handelt — nicht
                      KI-generiert (oder mit klarer Kennzeichnung), nicht plagiiert und nicht parallel
                      anderswo eingereicht.
                    </span>
                  </label>
                  <label className="a-pitch__check">
                    <input
                      type="checkbox"
                      checked={data.editorial}
                      onChange={(e) => set("editorial", e.target.checked)}
                    />
                    <span style={{ color: "var(--da-text-strong)", fontSize: 13, lineHeight: 1.6 }}>
                      Ich akzeptiere, dass die{" "}
                      <strong style={{ color: "var(--da-text)" }}>Redaktion redaktionelle Anpassungen</strong>{" "}
                      (Sprache, Struktur, Kürzungen) vornehmen kann. Inhaltliche Änderungen werden vor der
                      Publikation mit mir abgestimmt.
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={!allValid || submitting}
                  className="a-pitch__submit"
                >
                  {submitting && (
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        border: "2px solid var(--da-dark)",
                        borderTopColor: "transparent",
                        animation: "ticker 0.7s linear infinite",
                      }}
                    />
                  )}
                  {submitting ? "Wird übermittelt…" : "Beitrag zur Prüfung einreichen →"}
                </button>
                {!allValid && (
                  <p style={{ ...helperStyle, textAlign: "center", marginTop: 12 }}>
                    {completeCount}/3 Schritte abgeschlossen
                  </p>
                )}
              </div>
            </form>

            <aside style={{ position: "sticky", top: 84, display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  background: "var(--da-card)",
                  border: "1px solid var(--da-green)",
                  borderRadius: 8,
                  padding: 20,
                }}
              >
                <p
                  style={{
                    color: "var(--da-green)",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: 14,
                    fontFamily: "var(--da-font-mono)",
                  }}
                >
                  Was wir suchen
                </p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 11 }}>
                  {[
                    ["Eigene Praxiserfahrung", "Kein generisches Listicle"],
                    ["DACH-Bezug", "CH/DE/AT-Perspektive bevorzugt"],
                    ["Klare These", "Eine Aussage, die du belegen kannst"],
                    ["Substanz vor Hype", "Lieber kritisch als euphorisch"],
                  ].map(([h, sub]) => (
                    <li key={h} style={{ display: "flex", gap: 10, fontSize: 12, lineHeight: 1.55 }}>
                      <span style={{ color: "var(--da-green)", marginTop: 1 }}>✓</span>
                      <span>
                        <strong style={{ color: "var(--da-text)", fontWeight: 600 }}>{h}</strong>
                        <span style={{ color: "var(--da-muted-soft)", display: "block", fontSize: 11, marginTop: 2 }}>
                          {sub}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                style={{
                  background: "var(--da-card)",
                  border: "1px solid var(--da-border)",
                  borderRadius: 8,
                  padding: 20,
                }}
              >
                <p
                  style={{
                    color: "var(--da-faint)",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: 14,
                    fontFamily: "var(--da-font-mono)",
                  }}
                >
                  Wie läuft&apos;s ab?
                </p>
                <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    ["Einreichen", "Du füllst dieses Formular aus (10–15 Min)"],
                    ["Feedback", "Antwort innert 5 Werktagen"],
                    ["Review", "Wir lektorieren, du gibst Final-OK"],
                    ["Publikation", "Beitrag geht live mit deiner Bio"],
                  ].map(([h, sub], i) => (
                    <li key={h} style={{ display: "flex", gap: 12, fontSize: 12, lineHeight: 1.5 }}>
                      <span
                        style={{
                          color: "var(--da-green)",
                          fontFamily: "var(--da-font-mono)",
                          fontWeight: 700,
                          fontSize: 11,
                          minWidth: 18,
                          lineHeight: "16px",
                        }}
                      >
                        0{i + 1}
                      </span>
                      <span>
                        <strong style={{ color: "var(--da-text)", fontWeight: 600 }}>{h}</strong>
                        <span style={{ color: "var(--da-muted-soft)", display: "block", marginTop: 2 }}>{sub}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}

function StepHeader({ n, title, subtitle, complete }: {
  n: number; title: string; subtitle: string; complete: boolean;
}) {
  return (
    <div className="a-pitch__step-head">
      <div
        className="a-pitch__step-num"
        style={{
          background: complete ? "var(--da-green)" : "transparent",
          border: `1px solid ${complete ? "var(--da-green)" : "var(--da-border)"}`,
          color: complete ? "var(--da-dark)" : "var(--da-muted-soft)",
        }}
      >
        {complete ? "✓" : n}
      </div>
      <div>
        <h3
          style={{
            color: "var(--da-text)",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "var(--da-font-display)",
            marginBottom: 3,
          }}
        >
          {title}
        </h3>
        <p style={{ color: "var(--da-muted-soft)", fontSize: 12 }}>{subtitle}</p>
      </div>
    </div>
  );
}
