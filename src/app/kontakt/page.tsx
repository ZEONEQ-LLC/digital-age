"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import Footer from "@/components/Footer";
import NewsTicker from "@/components/NewsTicker";
import PageHero from "@/components/PageHero";
import { submitContactMessage } from "@/lib/contact/submit";

type Topic = "" | "allgemein" | "werbung" | "kooperation" | "feedback" | "presse" | "sonstiges";

type ContactFormState = {
  name: string;
  email: string;
  topic: Topic;
  organization: string;
  message: string;
  privacyAccepted: boolean;
};

const TOPICS: { value: Exclude<Topic, "">; label: string }[] = [
  { value: "allgemein",    label: "Allgemeine Frage" },
  { value: "werbung",      label: "Werbung / Sponsoring" },
  { value: "kooperation",  label: "Kooperation / Partnerschaft" },
  { value: "feedback",     label: "Feedback zur Seite" },
  { value: "presse",       label: "Pressekontakt" },
  { value: "sonstiges",    label: "Sonstiges" },
];

const MIN_MESSAGE = 20;
const MAX_MESSAGE = 2000;
const EMAIL_RE = /\S+@\S+\.\S+/;

const empty: ContactFormState = {
  name: "",
  email: "",
  topic: "",
  organization: "",
  message: "",
  privacyAccepted: false,
};

type FieldKey = "name" | "email" | "topic" | "message" | "privacyAccepted";

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

const inputErrorStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: "var(--da-red)",
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

const errorStyle: React.CSSProperties = {
  color: "var(--da-red)",
  fontSize: 12,
  marginTop: 6,
  fontFamily: "var(--da-font-mono)",
};

export default function KontaktPage() {
  const [data, setData] = useState<ContactFormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (submitted) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [submitted]);

  const set = <K extends keyof ContactFormState>(k: K, v: ContactFormState[K]) => {
    setData((p) => ({ ...p, [k]: v }));
    if (errors[k as FieldKey]) {
      setErrors((p) => {
        const next = { ...p };
        delete next[k as FieldKey];
        return next;
      });
    }
  };

  const validate = (): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!data.name.trim()) next.name = "Name fehlt.";
    if (!data.email.trim()) next.email = "E-Mail fehlt.";
    else if (!EMAIL_RE.test(data.email)) next.email = "E-Mail-Format wirkt ungültig.";
    if (!data.topic) next.topic = "Bitte wähle ein Anliegen.";
    const msg = data.message.trim();
    if (!msg) next.message = "Nachricht fehlt.";
    else if (msg.length < MIN_MESSAGE) next.message = `Mindestens ${MIN_MESSAGE} Zeichen — aktuell ${msg.length}.`;
    else if (msg.length > MAX_MESSAGE) next.message = `Maximal ${MAX_MESSAGE} Zeichen.`;
    if (!data.privacyAccepted) next.privacyAccepted = "Bitte Datenschutz bestätigen.";
    return next;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const order: FieldKey[] = ["name", "email", "topic", "message", "privacyAccepted"];
      const first = order.find((k) => errs[k]);
      if (first) {
        const el = document.getElementById(`contact-${first}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          if (first !== "privacyAccepted") (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).focus();
        }
      }
      return;
    }
    setErrors({});
    setServerError(null);
    startTransition(async () => {
      const result = await submitContactMessage({
        name: data.name,
        email: data.email,
        topic: data.topic,
        organization: data.organization,
        message: data.message,
        privacyAccepted: data.privacyAccepted,
        honeypot,
      });
      if (!result.ok) {
        if (result.fieldErrors) {
          setErrors(result.fieldErrors as typeof errors);
        }
        setServerError(result.message);
        return;
      }
      setSubmitted(true);
    });
  };

  const reset = () => {
    setData(empty);
    setErrors({});
    setHoneypot("");
    setServerError(null);
    setSubmitted(false);
  };

  const messageLen = data.message.trim().length;
  const messageColor =
    messageLen > MAX_MESSAGE
      ? "var(--da-red)"
      : messageLen >= MIN_MESSAGE
        ? "var(--da-green)"
        : "var(--da-faint)";

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero
        category="Kontakt"
        title="Kontakt"
        description="Eine Frage, ein Hinweis, eine Idee zur Zusammenarbeit? Wir hören zu."
      />

      <style>{`
        .ko-section { max-width: 1100px; margin: 0 auto; padding: 48px 32px 96px; }
        .ko-cols { display: grid; grid-template-columns: 1fr 320px; gap: 40px; align-items: start; }
        .ko-card { background: var(--da-card); border: 1px solid var(--da-border); border-radius: 8px; padding: 28px; }
        .ko-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
        .ko-check { display: flex; gap: 12px; align-items: flex-start; cursor: pointer; user-select: none; }
        .ko-check input { width: 18px; height: 18px; margin-top: 2px; flex-shrink: 0; accent-color: var(--da-green); }
        .ko-submit {
          width: 100%; padding: 14px 32px; border-radius: 4px;
          background: var(--da-green); color: var(--da-dark);
          border: none; font-size: 15px; font-weight: 700;
          cursor: pointer; font-family: inherit;
          transition: filter var(--t-fast);
        }
        .ko-submit:hover { filter: brightness(1.08); }
        .ko-aside { position: sticky; top: var(--aside-sticky-top); display: flex; flex-direction: column; gap: 16px; }
        .ko-aside-card { background: var(--da-card); border: 1px solid var(--da-border); border-radius: 8px; padding: 20px; }
        .ko-aside-card--accent { border-color: var(--da-green); }
        .ko-aside-overline {
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 14px;
        }
        .ko-aside-title { color: var(--da-text); font-size: 14px; font-weight: 700; margin-bottom: 8px; line-height: 1.4; }
        .ko-aside-text { color: var(--da-muted); font-size: 13px; line-height: 1.55; margin-bottom: 14px; }
        .ko-pitch-link {
          display: inline-block; background: var(--da-green); color: var(--da-dark);
          padding: 10px 18px; border-radius: 4px;
          font-size: 13px; font-weight: 700; text-decoration: none;
        }
        .ko-aside-list { list-style: none; display: flex; flex-direction: column; gap: 14px; padding: 0; margin: 0; }
        .ko-aside-list li { display: flex; gap: 12px; font-size: 12px; line-height: 1.5; }
        .ko-aside-list .num {
          color: var(--da-green); font-family: var(--da-font-mono);
          font-weight: 700; font-size: 11px; min-width: 18px; line-height: 16px;
        }
        .ko-success {
          background: var(--da-card); border: 1px solid var(--da-green); border-radius: 12px;
          padding: 48px 40px; text-align: center; max-width: 620px; margin: 0 auto;
          animation: da-fadein 0.4s ease;
        }
        .ko-success__check {
          width: 64px; height: 64px; border-radius: 50%;
          background: rgba(50,255,126,0.12); border: 2px solid var(--da-green);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 24px; font-size: 28px; color: var(--da-green); font-weight: 700;
        }
        .ko-success__notice {
          background: rgba(255,140,66,0.08);
          border: 1px solid var(--da-orange);
          border-radius: 8px;
          padding: 16px 20px;
          margin: 24px 0;
          text-align: left;
        }
        @media (max-width: 1024px) {
          .ko-cols { grid-template-columns: 1fr; gap: 32px; }
          .ko-aside { position: static; }
        }
        @media (max-width: 540px) {
          .ko-row { grid-template-columns: 1fr; }
          .ko-section { padding: 32px 20px 64px; }
          .ko-card { padding: 22px; }
        }
      `}</style>

      <section className="ko-section">
        {submitted ? (
          <div className="ko-success">
            <div className="ko-success__check">✓</div>
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
            <p style={{ color: "var(--da-muted)", fontSize: 15, lineHeight: 1.65, marginBottom: 24 }}>
              Deine Nachricht ist bei der Redaktion. Wir melden uns innert 5 Werktagen
              an deine angegebene E-Mail-Adresse.
            </p>

            <p style={{ color: "var(--da-muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Falls du einen Artikel einreichen möchtest, nutze bitte direkt unseren Pitch-Flow →{" "}
              <Link href="/artikel-pitchen" style={{ color: "var(--da-green)", fontWeight: 600 }}>
                Artikel pitchen
              </Link>
              .
            </p>

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
                Neue Anfrage stellen
              </button>
            </div>
          </div>
        ) : (
          <div className="ko-cols">
            <form onSubmit={onSubmit} className="ko-card" noValidate>
              <div className="ko-row">
                <div>
                  <label htmlFor="contact-name" style={labelStyle}>
                    <span>Name <span style={{ color: "var(--da-green)" }}>*</span></span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={data.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Vor- und Nachname"
                    style={errors.name ? inputErrorStyle : inputStyle}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && <p style={errorStyle}>{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="contact-email" style={labelStyle}>
                    <span>E-Mail <span style={{ color: "var(--da-green)" }}>*</span></span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={data.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="deine@email.ch"
                    style={errors.email ? inputErrorStyle : inputStyle}
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && <p style={errorStyle}>{errors.email}</p>}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label htmlFor="contact-topic" style={labelStyle}>
                  <span>Anliegen <span style={{ color: "var(--da-green)" }}>*</span></span>
                </label>
                <select
                  id="contact-topic"
                  value={data.topic}
                  onChange={(e) => set("topic", e.target.value as Topic)}
                  style={errors.topic ? inputErrorStyle : inputStyle}
                  aria-invalid={!!errors.topic}
                >
                  <option value="">Bitte wählen …</option>
                  {TOPICS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {errors.topic && <p style={errorStyle}>{errors.topic}</p>}
              </div>

              <div style={{ marginBottom: 18 }}>
                <label htmlFor="contact-organization" style={labelStyle}>
                  <span>
                    Unternehmen / Organisation{" "}
                    <span style={{ color: "var(--da-faint)", fontWeight: 400, fontSize: 12 }}>optional</span>
                  </span>
                </label>
                <input
                  id="contact-organization"
                  type="text"
                  value={data.organization}
                  onChange={(e) => set("organization", e.target.value)}
                  placeholder="Firma, Hochschule, Verein …"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 22 }}>
                <label htmlFor="contact-message" style={labelStyle}>
                  <span>Nachricht <span style={{ color: "var(--da-green)" }}>*</span></span>
                  <span
                    style={{
                      color: messageColor,
                      fontSize: 11,
                      fontFamily: "var(--da-font-mono)",
                    }}
                  >
                    {messageLen}/{MAX_MESSAGE} (min. {MIN_MESSAGE})
                  </span>
                </label>
                <textarea
                  id="contact-message"
                  rows={7}
                  value={data.message}
                  onChange={(e) => set("message", e.target.value)}
                  placeholder="Was bewegt dich? Frag direkt — wir antworten persönlich."
                  style={{
                    ...(errors.message ? inputErrorStyle : inputStyle),
                    resize: "vertical",
                    minHeight: 160,
                    lineHeight: 1.6,
                  }}
                  aria-invalid={!!errors.message}
                />
                {errors.message && <p style={errorStyle}>{errors.message}</p>}
              </div>

              <div style={{ marginBottom: 22 }}>
                <label className="ko-check" htmlFor="contact-privacyAccepted">
                  <input
                    id="contact-privacyAccepted"
                    type="checkbox"
                    checked={data.privacyAccepted}
                    onChange={(e) => set("privacyAccepted", e.target.checked)}
                    aria-invalid={!!errors.privacyAccepted}
                  />
                  <span style={{ color: "var(--da-text-strong)", fontSize: 13, lineHeight: 1.6 }}>
                    Ich bin damit einverstanden, dass meine Angaben zur Bearbeitung der Anfrage gespeichert werden.
                    Mehr im{" "}
                    <Link href="/datenschutzerklaerung" style={{ color: "var(--da-green)", textDecoration: "underline" }}>
                      Datenschutz
                    </Link>
                    .
                  </span>
                </label>
                {errors.privacyAccepted && <p style={errorStyle}>{errors.privacyAccepted}</p>}
              </div>

              {/* Honeypot — Bots tippen Inputs aller Art, echte User sehen es nicht. */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  left: "-9999px",
                  width: 1,
                  height: 1,
                  overflow: "hidden",
                }}
              >
                <label>
                  Website
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </label>
              </div>

              {serverError && (
                <div
                  role="alert"
                  style={{
                    background: "rgba(255,107,107,0.10)",
                    border: "1px solid #ff6b6b",
                    borderRadius: 4,
                    padding: "10px 14px",
                    color: "#ff8e8e",
                    fontSize: 13,
                    marginBottom: 14,
                  }}
                >
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                className="ko-submit"
                disabled={pending}
                style={{ opacity: pending ? 0.7 : 1, cursor: pending ? "wait" : "pointer" }}
              >
                {pending ? "Sende…" : "Nachricht senden →"}
              </button>
            </form>

            <aside className="ko-aside">
              <div className="ko-aside-card ko-aside-card--accent">
                <p className="ko-aside-overline" style={{ color: "var(--da-green)" }}>
                  Artikel einreichen
                </p>
                <p className="ko-aside-title">Du möchtest einen Artikel pitchen?</p>
                <p className="ko-aside-text">
                  Für Artikel-Beiträge haben wir einen eigenen Flow.
                </p>
                <Link href="/artikel-pitchen" className="ko-pitch-link">
                  → Artikel pitchen
                </Link>
              </div>

              <div className="ko-aside-card">
                <p className="ko-aside-overline" style={{ color: "var(--da-faint)" }}>
                  Was passiert mit deiner Anfrage?
                </p>
                <ol className="ko-aside-list">
                  {[
                    "Wir lesen jede Nachricht persönlich",
                    "Du bekommst Antwort innerhalb von 5 Werktagen",
                    "Bei Werbung/Kooperationen melden wir uns mit Mediadaten",
                  ].map((line, i) => (
                    <li key={i}>
                      <span className="num">0{i + 1}</span>
                      <span style={{ color: "var(--da-text-strong)" }}>{line}</span>
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
