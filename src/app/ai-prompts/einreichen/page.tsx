"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import { catColor, diffColor, toolColor, type AiTool, type Difficulty } from "@/components/promptColors";
import { submitPromptExternal } from "@/lib/promptActions";
import {
  PROMPT_CATEGORIES,
  PROMPT_DIFFICULTIES,
  PROMPT_TESTED_WITH,
} from "@/lib/mappers/promptMappers";

function codeForLabel(list: readonly { code: string; label: string }[], label: string): string {
  return list.find((it) => it.label === label)?.code ?? label.toLowerCase();
}

type Category = "Business" | "Kreativ" | "Code" | "Marketing" | "Strategie" | "Lernen" | "Andere";

type FormData = {
  title: string;
  body: string;
  context: string;
  example: string;
  category: Category | "";
  tool: AiTool | "";
  difficulty: Difficulty | "";
  author: string;
  email: string;
  link: string;
  consent: boolean;
};

const EMPTY: FormData = {
  title: "", body: "", context: "", example: "",
  category: "", tool: "", difficulty: "",
  author: "", email: "", link: "",
  consent: false,
};

const CATEGORIES: Category[] = ["Business", "Kreativ", "Code", "Marketing", "Strategie", "Lernen", "Andere"];
const TOOLS: AiTool[] = ["ChatGPT", "Claude", "Gemini", "Mehrere"];
const DIFFICULTIES: Difficulty[] = ["Anfänger", "Fortgeschritten", "Expert"];

const TITLE_MAX = 80;
const BODY_MIN = 20;
const BODY_MAX = 4000;

function StepHeader({ n, title, subtitle, complete }: { n: number; title: string; subtitle: string; complete: boolean }) {
  return (
    <div className="ein-step">
      <div className={`ein-step__box${complete ? " ein-step__box--done" : ""}`}>
        {complete ? "✓" : String(n).padStart(2, "0")}
      </div>
      <div>
        <h3 className="ein-step__title">{title}</h3>
        <p className="ein-step__sub">{subtitle}</p>
      </div>
    </div>
  );
}

export default function PromptEinreichenPage() {
  const [data, setData] = useState<FormData>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, startSubmitting] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Nach erfolgreichem Submit nach oben scrollen, damit die Success-Card
  // sichtbar wird. Bei langem Form-Layout bleibt der User sonst unten und
  // sieht die Bestätigung nicht — Doppel-Submit-Risiko.
  useEffect(() => {
    if (submitted) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [submitted]);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => {
    setData((d) => ({ ...d, [k]: v }));
  };

  const titleOk     = data.title.trim().length >= 4 && data.title.length <= TITLE_MAX;
  const bodyOk      = data.body.trim().length >= BODY_MIN && data.body.length <= BODY_MAX;
  const contextOk   = data.context.trim().length >= 10;
  const step1Done   = titleOk && bodyOk && contextOk;
  const step2Done   = data.category !== "" && data.tool !== "" && data.difficulty !== "";
  const emailValid  = /\S+@\S+\.\S+/.test(data.email);
  const step3Done   = data.author.trim().length >= 2 && emailValid;
  const step4Done   = data.consent;
  const allValid    = step1Done && step2Done && step3Done && step4Done;
  const stepsDone   = [step1Done, step2Done, step3Done, step4Done].filter(Boolean).length;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid || submitting) return;
    setSubmitError(null);
    const difficultyCode = codeForLabel(PROMPT_DIFFICULTIES, data.difficulty as string) as
      | "beginner"
      | "intermediate"
      | "expert";
    startSubmitting(async () => {
      try {
        await submitPromptExternal({
          title: data.title,
          prompt_text: data.body,
          context: data.context,
          example_output: data.example || null,
          category: codeForLabel(PROMPT_CATEGORIES, data.category as string),
          tested_with: codeForLabel(PROMPT_TESTED_WITH, data.tool as string),
          difficulty: difficultyCode,
          submitter_name: data.author,
          submitter_email: data.email,
          submitter_url: data.link || null,
        });
        setSubmitted(true);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  const reset = () => {
    setData(EMPTY);
    setSubmitted(false);
  };

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />

      <style>{`
        @keyframes ein-spin { to { transform: rotate(360deg); } }
        @keyframes ein-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

        .ein-shell { max-width: 1100px; margin: 0 auto; padding-left: var(--sp-8); padding-right: var(--sp-8); }
        .ein-hero {
          position: relative; overflow: hidden;
          border-bottom: 1px solid var(--da-border);
          padding: 48px var(--sp-8) 40px;
        }
        .ein-hero__grid {
          position: absolute; inset: 0; opacity: 0.05;
          background-image:
            linear-gradient(var(--da-green) 1px, transparent 1px),
            linear-gradient(90deg, var(--da-green) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }
        .ein-hero__inner { position: relative; max-width: 1100px; margin: 0 auto; }
        .ein-crumb { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: 14px; }
        .ein-crumb__back {
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
          text-decoration: none;
        }
        .ein-crumb__back:hover { color: var(--da-green); }
        .ein-crumb__sep { color: var(--da-faint); }
        .ein-crumb__here {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
        }
        .ein-title {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: clamp(32px, 4.4vw, 48px); font-weight: 700;
          line-height: 1.0; letter-spacing: -0.02em;
          margin-bottom: 14px;
        }
        .ein-title em { font-style: normal; color: var(--da-green); }
        .ein-sub {
          color: var(--da-muted); font-size: 16px; line-height: 1.65; max-width: 620px;
        }

        .ein-main { padding: 48px var(--sp-8) 96px; }
        .ein-grid { display: grid; grid-template-columns: 1fr 360px; gap: 40px; align-items: start; }

        .ein-form { display: flex; flex-direction: column; gap: 28px; }
        .ein-card {
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: var(--r-lg); padding: 28px;
        }
        .ein-step {
          display: flex; align-items: flex-start; gap: 14px;
          margin-bottom: 20px; padding-bottom: 14px;
          border-bottom: 1px solid var(--da-border);
        }
        .ein-step__box {
          width: 28px; height: 28px; border-radius: var(--r-sm);
          background: transparent; border: 1px solid var(--da-border);
          color: var(--da-muted-soft);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--da-font-mono);
          font-size: 13px; font-weight: 700;
          flex-shrink: 0;
          transition: background var(--t-fast), color var(--t-fast), border-color var(--t-fast);
        }
        .ein-step__box--done {
          background: var(--da-green); border-color: var(--da-green); color: var(--da-dark);
        }
        .ein-step__title {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: 16px; font-weight: 700; margin-bottom: 3px;
        }
        .ein-step__sub { color: var(--da-muted-soft); font-size: 12px; }

        .field { margin-bottom: 20px; }
        .field:last-child { margin-bottom: 0; }
        .lbl {
          display: flex; align-items: baseline; justify-content: space-between;
          color: var(--da-text-strong); font-size: 13px; font-weight: 600;
          margin-bottom: 8px;
        }
        .lbl__req { color: var(--da-green); }
        .lbl__opt { color: var(--da-muted-soft); font-weight: 400; font-size: 12px; }
        .lbl__counter {
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 11px;
        }
        .lbl__counter--ok   { color: var(--da-green); }
        .lbl__counter--warn { color: var(--da-orange); }
        .lbl__counter--err  { color: var(--da-red); }
        .input,
        .ta {
          width: 100%; background: var(--da-dark); color: var(--da-text);
          border: 1px solid var(--da-border); border-radius: var(--r-sm);
          padding: 11px 14px; font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
          font-family: var(--da-font-body);
        }
        .input:focus, .ta:focus { border-color: var(--da-green); }
        .input::placeholder, .ta::placeholder { color: var(--da-faint); }
        .ta { resize: vertical; min-height: 100px; }
        .ta--mono {
          font-family: var(--da-font-mono);
          font-size: 13px; line-height: 1.6;
          min-height: 180px;
        }
        .helper { color: var(--da-muted-soft); font-size: 12px; margin-top: 6px; line-height: 1.5; }

        .pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .pill {
          background: var(--da-dark); color: var(--da-text-strong);
          border: 1px solid var(--da-border);
          border-radius: var(--r-pill);
          padding: 8px 14px;
          font-size: 12px; font-weight: 600;
          cursor: pointer;
          display: inline-flex; align-items: center; gap: 7px;
          transition: background var(--t-fast), color var(--t-fast), border-color var(--t-fast);
        }
        .pill:hover { border-color: var(--da-muted-soft); }
        .pill--on {
          background: var(--da-text); color: var(--da-dark);
          border-color: var(--da-text);
        }
        .pill__dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }

        .diff-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
        .diff-btn {
          background: transparent; border: 1px solid var(--da-border);
          border-radius: var(--r-md); padding: 12px 10px;
          cursor: pointer;
          display: flex; flex-direction: column; gap: 8px; align-items: flex-start;
          transition: background var(--t-fast), border-color var(--t-fast);
        }
        .diff-btn--on { background: var(--da-dark); }
        .diff-bars { display: flex; gap: 3px; width: 100%; }
        .diff-bar {
          flex: 1; height: 4px; border-radius: 2px;
          background: var(--da-border);
        }
        .diff-bar--filled { background: var(--bar-c); }
        .diff-label {
          color: var(--da-muted-soft);
          font-size: 12px; font-weight: 700;
        }
        .diff-btn--on .diff-label { color: var(--bar-c); }

        .consent {
          display: flex; gap: 12px; align-items: flex-start;
          cursor: pointer; user-select: none;
        }
        .consent input[type="checkbox"] {
          width: 18px; height: 18px; margin-top: 2px;
          accent-color: var(--da-green);
          cursor: pointer; flex-shrink: 0;
        }
        .consent__text { color: var(--da-text-strong); font-size: 13px; line-height: 1.65; }
        .consent__text strong { color: var(--da-text); }
        .consent__text a { color: var(--da-green); text-decoration: underline; }

        .submit-wrap { display: flex; flex-direction: column; gap: 12px; }
        .submit {
          width: 100%; padding: 16px 32px; border-radius: var(--r-sm);
          background: var(--da-green); color: var(--da-dark);
          border: none; font-size: 15px; font-weight: 700;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: background var(--t-fast), color var(--t-fast);
        }
        .submit:disabled {
          background: var(--da-card); color: var(--da-muted-soft);
          cursor: not-allowed;
        }
        .submit__spin {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid var(--da-dark); border-top-color: transparent;
          animation: ein-spin 0.7s linear infinite;
        }
        .submit-hint {
          color: var(--da-muted-soft); font-size: 12px;
          text-align: center; line-height: 1.5;
        }
        .submit-hint__count {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-weight: 600;
        }

        .ein-aside {
          position: sticky; top: var(--aside-sticky-top);
          display: flex; flex-direction: column; gap: 16px;
        }
        .aside-label {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 12px;
        }

        .prev {
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: var(--r-lg); padding: 22px; position: relative;
          transition: opacity var(--t-base);
        }
        .prev--empty { opacity: 0.7; }
        .prev__meta { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
        .prev__cat {
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
        }
        .prev__sep { color: var(--da-faint); font-size: 10px; }
        .prev__diff {
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
        }
        .prev__title {
          font-family: var(--da-font-display);
          font-size: 16px; font-weight: 700; line-height: 1.35;
          margin-bottom: 12px;
        }
        .prev__title--filled { color: var(--da-text); }
        .prev__title--placeholder { color: var(--da-faint); }
        .prev__code {
          color: var(--da-text-strong);
          font-family: var(--da-font-mono);
          font-size: 12px; line-height: 1.6;
          background: var(--da-dark); border: 1px solid var(--da-border);
          padding: 10px 12px; border-radius: var(--r-sm);
          margin-bottom: 14px; max-height: 96px;
          white-space: pre-wrap; word-break: break-word;
          display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .prev__code--placeholder { color: var(--da-faint); }
        .prev__foot {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 10px; border-top: 1px solid var(--da-border);
        }
        .prev__tool { font-size: 12px; font-weight: 700; }
        .prev__author { color: var(--da-muted); font-size: 11px; }

        .tips,
        .proc {
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: var(--r-lg); padding: 18px;
        }
        .tips__overline {
          color: var(--da-orange);
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 12px;
        }
        .tips__list { list-style: none; display: flex; flex-direction: column; gap: 10px; padding: 0; }
        .tips__row { display: flex; gap: 10px; font-size: 12px; line-height: 1.55; }
        .tips__bullet { color: var(--da-green); margin-top: 1px; }
        .tips__h { color: var(--da-text); font-weight: 600; }
        .tips__sub {
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 11px; margin-top: 2px;
          display: block;
        }
        .proc__list { list-style: none; counter-reset: step; display: flex; flex-direction: column; gap: 10px; padding: 0; }
        .proc__row { display: flex; gap: 10px; font-size: 12px; color: var(--da-muted); line-height: 1.5; }
        .proc__num {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-weight: 700; font-size: 11px; min-width: 14px;
        }

        .success {
          background: var(--da-card); border: 1px solid var(--da-green);
          border-radius: 12px;
          padding: 56px 32px; text-align: center;
          animation: ein-fadein 0.4s ease-out;
        }
        .success__check {
          width: 64px; height: 64px; border-radius: 50%;
          background: rgba(50,255,126,0.12);
          border: 2px solid var(--da-green);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 24px;
          font-size: 28px; color: var(--da-green); font-weight: 700;
        }
        .success__title {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: 28px; font-weight: 700; margin-bottom: 12px;
        }
        .success__text {
          color: var(--da-muted); font-size: 15px; line-height: 1.65;
          max-width: 460px; margin: 0 auto 28px;
        }
        .success__text strong { color: var(--da-text); }
        .success__how {
          background: var(--da-dark); border: 1px solid var(--da-border);
          border-radius: var(--r-md); padding: 20px;
          margin: 0 auto 28px; max-width: 460px; text-align: left;
        }
        .success__how-label {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 12px;
        }
        .success__how-list {
          list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px;
        }
        .success__how-row {
          display: flex; gap: 12px; font-size: 13px; color: var(--da-text-strong); line-height: 1.5;
        }
        .success__how-num {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-weight: 700; font-size: 12px; min-width: 18px;
        }
        .success__btns { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .success__cta {
          background: var(--da-green); color: var(--da-dark);
          font-size: 13px; font-weight: 700;
          padding: 11px 22px; border-radius: var(--r-sm);
          text-decoration: none;
        }
        .success__reset {
          background: transparent; color: var(--da-text);
          font-size: 13px; font-weight: 600;
          padding: 11px 22px; border-radius: var(--r-sm);
          border: 1px solid var(--da-border);
          cursor: pointer;
        }
        .success__reset:hover { border-color: var(--da-green); color: var(--da-green); }

        @media (max-width: 1024px) {
          .ein-grid { grid-template-columns: 1fr; gap: var(--sp-8); }
          .ein-aside { position: static; }
        }
        @media (max-width: 720px) {
          .ein-card { padding: 22px; }
          .diff-grid { grid-template-columns: 1fr; }
          .ein-hero { padding: 32px var(--sp-6) 28px; }
        }
      `}</style>

      {/* Hero */}
      <section className="ein-hero">
        <div className="ein-hero__grid" aria-hidden />
        <div className="ein-hero__inner">
          <div className="ein-crumb">
            <Link href="/ai-prompts" className="ein-crumb__back">← GenAI Prompts</Link>
            <span className="ein-crumb__sep">/</span>
            <span className="ein-crumb__here">Community</span>
          </div>
          <h1 className="ein-title">Prompt <em>einreichen</em></h1>
          <p className="ein-sub">
            Teile deinen besten Prompt mit der Community. Wir prüfen jede Einreichung manuell und publizieren qualitative Beiträge mit deiner Attribution.
          </p>
        </div>
      </section>

      {/* Form + Preview */}
      <section className="ein-shell ein-main">
        {submitted ? (
          <div style={{ maxWidth: 540, margin: "0 auto" }}>
            <div className="success">
              <div className="success__check">✓</div>
              <h2 className="success__title">Vielen Dank!</h2>
              <p className="success__text">
                Dein Prompt <strong>&laquo;{data.title}&raquo;</strong> ist eingereicht. Wir prüfen ihn innerhalb von 2–3 Werktagen und melden uns per E-Mail.
              </p>
              <div className="success__how">
                <p className="success__how-label">Wie geht&apos;s weiter?</p>
                <ol className="success__how-list">
                  <li className="success__how-row"><span className="success__how-num">01</span><span>Wir prüfen deinen Prompt manuell</span></li>
                  <li className="success__how-row"><span className="success__how-num">02</span><span>Du bekommst Feedback per E-Mail (2–3 Werktage)</span></li>
                  <li className="success__how-row"><span className="success__how-num">03</span><span>Bei Freigabe wird er publiziert mit deiner Attribution</span></li>
                </ol>
              </div>
              <div className="success__btns">
                <Link href="/ai-prompts" className="success__cta">Zur Prompt-Bibliothek →</Link>
                <button type="button" className="success__reset" onClick={reset}>Weiteren Prompt einreichen</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="ein-grid">
            {/* Form */}
            <form className="ein-form" onSubmit={onSubmit} noValidate>
              {/* Step 1 — Der Prompt */}
              <div className="ein-card">
                <StepHeader n={1} title="Der Prompt" subtitle="Was du teilen möchtest" complete={step1Done} />

                <div className="field">
                  <label className="lbl">
                    <span>Titel <span className="lbl__req">*</span></span>
                    <span className={`lbl__counter${data.title.length > TITLE_MAX ? " lbl__counter--err" : ""}`}>
                      {data.title.length}/{TITLE_MAX}
                    </span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={data.title}
                    maxLength={TITLE_MAX}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="z.B. LinkedIn Post Generator"
                  />
                </div>

                <div className="field">
                  <label className="lbl">
                    <span>Prompt-Text <span className="lbl__req">*</span></span>
                    <span className={`lbl__counter${data.body.length > BODY_MAX ? " lbl__counter--err" : data.body.length >= BODY_MIN ? " lbl__counter--ok" : ""}`}>
                      {data.body.length}/{BODY_MAX}
                    </span>
                  </label>
                  <textarea
                    rows={8}
                    className="ta ta--mono"
                    value={data.body}
                    onChange={(e) => set("body", e.target.value)}
                    placeholder={"Der vollständige Prompt. Nutze {{platzhalter}} für Variablen.\n\nz.B.\nDu bist ein {{rolle}}. Analysiere {{input}} und gib mir...\nFormat: Markdown."}
                  />
                  <p className="helper">Tipp: Klare Rolle, klare Aufgabe, gewünschtes Format. Mind. 20 Zeichen.</p>
                </div>

                <div className="field">
                  <label className="lbl"><span>Kontext &amp; Anwendung <span className="lbl__req">*</span></span></label>
                  <textarea
                    rows={3}
                    className="ta"
                    value={data.context}
                    onChange={(e) => set("context", e.target.value)}
                    placeholder="Wofür nutzt du diesen Prompt? Was ist der Use Case?"
                  />
                </div>

                <div className="field">
                  <label className="lbl"><span>Beispiel-Output <span className="lbl__opt">optional</span></span></label>
                  <textarea
                    rows={3}
                    className="ta ta--mono"
                    value={data.example}
                    onChange={(e) => set("example", e.target.value)}
                    placeholder="Was die KI ausspuckt, wenn man den Prompt nutzt."
                  />
                </div>
              </div>

              {/* Step 2 — Klassifizierung */}
              <div className="ein-card">
                <StepHeader n={2} title="Klassifizierung" subtitle="Damit andere deinen Prompt finden" complete={step2Done} />

                <div className="field">
                  <label className="lbl"><span>Kategorie <span className="lbl__req">*</span></span></label>
                  <div className="pills">
                    {CATEGORIES.map((c) => {
                      const on = data.category === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          className={`pill${on ? " pill--on" : ""}`}
                          onClick={() => set("category", c)}
                        >
                          <span className="pill__dot" style={{ background: catColor(c) }} />
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="field">
                  <label className="lbl"><span>Getestet mit <span className="lbl__req">*</span></span></label>
                  <div className="pills">
                    {TOOLS.map((t) => {
                      const on = data.tool === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          className={`pill${on ? " pill--on" : ""}`}
                          onClick={() => set("tool", t)}
                        >
                          <span className="pill__dot" style={{ background: toolColor(t) }} />
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="lbl"><span>Schwierigkeit <span className="lbl__req">*</span></span></label>
                  <div className="diff-grid">
                    {DIFFICULTIES.map((d, i) => {
                      const on = data.difficulty === d;
                      const idx = data.difficulty === "" ? -1 : DIFFICULTIES.indexOf(data.difficulty);
                      const reached = idx >= 0 && i <= idx;
                      const c = diffColor(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          className={`diff-btn${on ? " diff-btn--on" : ""}`}
                          onClick={() => set("difficulty", d)}
                          style={{
                            ["--bar-c" as string]: c,
                            borderColor: on ? c : undefined,
                          }}
                        >
                          <div className="diff-bars">
                            {[0, 1, 2].map((b) => (
                              <span key={b} className={`diff-bar${b <= i && reached ? " diff-bar--filled" : ""}`} />
                            ))}
                          </div>
                          <span className="diff-label">{d}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Step 3 — Über dich */}
              <div className="ein-card">
                <StepHeader n={3} title="Über dich" subtitle="Für die Attribution & Rückmeldung" complete={step3Done} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="lbl"><span>Name / Pseudonym <span className="lbl__req">*</span></span></label>
                    <input
                      type="text"
                      className="input"
                      value={data.author}
                      onChange={(e) => set("author", e.target.value)}
                      placeholder="Wie wir dich nennen sollen"
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="lbl"><span>E-Mail <span className="lbl__req">*</span></span></label>
                    <input
                      type="email"
                      className="input"
                      value={data.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="nicht öffentlich"
                    />
                  </div>
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="lbl"><span>LinkedIn / Website <span className="lbl__opt">optional</span></span></label>
                  <input
                    type="url"
                    className="input"
                    value={data.link}
                    onChange={(e) => set("link", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Step 4 — Bestätigung */}
              <div className="ein-card">
                <StepHeader n={4} title="Bestätigung" subtitle="Letzter Schritt" complete={step4Done} />

                <label className="consent">
                  <input
                    type="checkbox"
                    checked={data.consent}
                    onChange={(e) => set("consent", e.target.checked)}
                  />
                  <span className="consent__text">
                    Ich erlaube <strong>digital age</strong> die Publikation meines Prompts und bestätige, dass er mein eigener Beitrag bzw. frei nutzbar ist. Mit dem Einreichen akzeptiere ich die <Link href="/community-richtlinien">Community-Richtlinien</Link>.
                  </span>
                </label>
              </div>

              {/* Submit */}
              <div className="submit-wrap">
                <button type="submit" className="submit" disabled={!allValid || submitting}>
                  {submitting && <span className="submit__spin" />}
                  {submitting ? "Wird übermittelt..." : "Prompt zur Prüfung einreichen →"}
                </button>
                {!allValid && (
                  <p className="submit-hint">
                    Bitte fülle alle Pflichtfelder (<span className="submit-hint__count">{stepsDone}/4</span> abgeschlossen)
                  </p>
                )}
                {submitError && (
                  <p style={{ color: "#ff8080", fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>
                    Fehler beim Einreichen: {submitError}
                  </p>
                )}
              </div>
            </form>

            {/* Aside */}
            <aside className="ein-aside">
              <div>
                <p className="aside-label">Live-Vorschau</p>
                <PreviewCard data={data} />
              </div>

              <div className="tips">
                <p className="tips__overline">Tipps für gute Prompts</p>
                <ul className="tips__list">
                  {[
                    ["Rolle definieren", "„Du bist ein Senior-Entwickler mit 10 Jahren Erfahrung..."],
                    ["Format vorgeben", "„Antworte als Markdown-Tabelle mit Spalten X, Y, Z..."],
                    ["Variablen nutzen", "{{thema}}, {{tonalität}} – macht den Prompt wiederverwendbar"],
                    ["Constraints setzen", "Max. 200 Wörter, nur Faktencheck, keine Floskeln"],
                  ].map(([h, sub]) => (
                    <li key={h} className="tips__row">
                      <span className="tips__bullet">›</span>
                      <span>
                        <span className="tips__h">{h}</span>
                        <span className="tips__sub">{sub}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="proc">
                <p className="aside-label">Wie geht&apos;s weiter?</p>
                <ol className="proc__list">
                  {[
                    "Wir prüfen deinen Prompt manuell",
                    "Du bekommst Feedback per E-Mail (2–3 Werktage)",
                    "Bei Freigabe wird er publiziert mit deiner Attribution",
                  ].map((step, i) => (
                    <li key={step} className="proc__row">
                      <span className="proc__num">0{i + 1}</span>
                      <span>{step}</span>
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

function PreviewCard({ data }: { data: FormData }) {
  const cc = data.category ? catColor(data.category) : "var(--da-green)";
  const dc = data.difficulty ? diffColor(data.difficulty) : "var(--da-muted-soft)";
  const tc = data.tool ? toolColor(data.tool) : "var(--da-muted-soft)";
  const filled = data.title.length > 0 || data.body.length > 0;

  return (
    <div className={`prev${filled ? "" : " prev--empty"}`}>
      <div className="prev__meta">
        <span className="prev__cat" style={{ color: cc }}>{data.category || "Kategorie"}</span>
        <span className="prev__sep">·</span>
        <span className="prev__diff" style={{ color: dc }}>{data.difficulty || "Schwierigkeit"}</span>
      </div>
      <h3 className={`prev__title${filled && data.title ? " prev__title--filled" : " prev__title--placeholder"}`}>
        {data.title || "Dein Prompt-Titel"}
      </h3>
      <pre className={`prev__code${data.body ? "" : " prev__code--placeholder"}`}>
        {data.body || "// Dein Prompt erscheint hier sobald du tippst…"}
      </pre>
      <div className="prev__foot">
        <span className="prev__tool" style={{ color: tc }}>✦ {data.tool || "Tool"}</span>
        <span className="prev__author">von {data.author || "Dein Name"}</span>
      </div>
    </div>
  );
}
