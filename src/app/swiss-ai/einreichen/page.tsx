"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import { submitStartupExternal } from "@/lib/startupActions";
import {
  SWISS_STATUSES,
  EMPLOYEE_RANGES,
  FUNDING_STAGES,
  INDUSTRIES,
  lookupSwissStatus,
} from "@/lib/mappers/startupMappers";
import type {
  SwissStatusCode,
  EmployeeRangeCode,
  FundingStageCode,
} from "@/lib/startupApi";

type FormData = {
  name: string;
  tagline: string;
  description: string;
  website: string;
  logo: string;

  swiss_status: SwissStatusCode;
  industry: string;
  city: string;
  employee_range: EmployeeRangeCode;
  founded: string;

  funding_stage: FundingStageCode | "";
  total_funding_range: string;
  last_round_at: string;
  open_to_investment: boolean;
  pitch_deck_url: string;
  founders: string;

  contactName: string;
  email: string;
  role: string;
  agreed: boolean;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

const EMPTY: FormData = {
  name: "", tagline: "", description: "", website: "", logo: "",
  swiss_status: "swiss_based", industry: "FinTech", city: "",
  employee_range: "r_11_50", founded: "",
  funding_stage: "", total_funding_range: "", last_round_at: "",
  open_to_investment: false, pitch_deck_url: "", founders: "",
  contactName: "", email: "", role: "", agreed: false,
};

const STEPS = [
  { id: 1, label: "Unternehmen",     icon: "01" },
  { id: 2, label: "Klassifizierung", icon: "02" },
  { id: 3, label: "Kontakt",         icon: "03" },
] as const;

function StepBar({ step }: { step: number }) {
  return (
    <div className="ein-stepbar">
      {STEPS.map((s, i) => {
        const done = step > s.id;
        const active = step === s.id;
        const reached = step >= s.id;
        return (
          <div key={s.id} className="ein-step__group">
            <div className="ein-step">
              <div className={`ein-step__circle${reached ? " ein-step__circle--reached" : ""}${active ? " ein-step__circle--active" : ""}`}>
                {done ? "✓" : s.icon}
              </div>
              <span className={`ein-step__label${reached ? " ein-step__label--reached" : ""}${active ? " ein-step__label--active" : ""}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`ein-step__line${done ? " ein-step__line--done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PreviewCard({ data }: { data: FormData }) {
  const swiss = lookupSwissStatus(data.swiss_status);
  const empty = !data.name && !data.tagline;
  return (
    <div className="ein-prev">
      <p className="ein-prev__overline">Vorschau</p>
      {empty ? (
        <p className="ein-prev__empty">Fang an zu tippen — die Vorschau erscheint hier.</p>
      ) : (
        <>
          <div className="ein-prev__status">
            <span className="ein-prev__dot" style={{ background: swiss.color }} />
            <span className="ein-prev__status-text" style={{ color: swiss.color }}>🇨🇭 {swiss.label}</span>
          </div>
          <h3 className="ein-prev__name">
            {data.name || <span className="ein-prev__placeholder">Unternehmensname</span>}
          </h3>
          <p className="ein-prev__tagline">
            {data.tagline || <span className="ein-prev__placeholder">Tagline erscheint hier...</span>}
          </p>
          <div className="ein-prev__meta">
            {data.city && <span className="ein-prev__chip">📍 {data.city}</span>}
            <span className="ein-prev__chip ein-prev__chip--green">{data.industry}</span>
            <span className="ein-prev__chip ein-prev__chip--mono">
              {EMPLOYEE_RANGES.find((r) => r.code === data.employee_range)?.label} MA
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function ProcessInfo() {
  const items = [
    { n: "01", t: "Einreichung",     d: "Du füllst das Formular aus und sendest es ab." },
    { n: "02", t: "Prüfung",         d: "Unser Team prüft die Angaben innerhalb von 5 Werktagen." },
    { n: "03", t: "Veröffentlichung", d: "Nach Freigabe erscheint dein Eintrag im Verzeichnis." },
  ];
  return (
    <div className="ein-proc">
      <p className="ein-prev__overline">So funktionierts</p>
      {items.map(({ n, t, d }) => (
        <div key={n} className="ein-proc__row">
          <span className="ein-proc__n">{n}</span>
          <div>
            <div className="ein-proc__t">{t}</div>
            <div className="ein-proc__d">{d}</div>
          </div>
        </div>
      ))}
      <div className="ein-proc__foot">
        <p className="ein-proc__foot-text">
          Kostenlos &amp; bedingungslos. Wir behalten uns vor, Einträge ohne Begründung abzulehnen.
        </p>
      </div>
    </div>
  );
}

function SuccessScreen({ data }: { data: FormData }) {
  const firstName = data.contactName.split(" ")[0] || "";
  return (
    <div className="ein-success">
      <div className="ein-success__check">✓</div>
      <h2 className="ein-success__title">Danke{firstName ? `, ${firstName}` : ""}!</h2>
      <p className="ein-success__text">
        Deine Einreichung für <strong>{data.name}</strong> ist eingegangen. Wir melden uns innerhalb von 5 Werktagen bei <strong>{data.email}</strong>.
      </p>
      <Link href="/swiss-ai" className="ein-success__btn">Zurück zum Verzeichnis →</Link>
    </div>
  );
}

export default function EinreichenPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmitting] = useTransition();

  const update = <K extends keyof FormData>(key: K, val: FormData[K]) => {
    setData((d) => ({ ...d, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validateStep = (): boolean => {
    const e: FormErrors = {};
    if (step === 1) {
      if (!data.name.trim())        e.name        = "Pflichtfeld";
      else if (data.name.length > 80) e.name = "Max 80 Zeichen";
      if (!data.tagline.trim())     e.tagline     = "Pflichtfeld";
      else if (data.tagline.length > 100) e.tagline = "Max 100 Zeichen";
      if (!data.description.trim()) e.description = "Pflichtfeld";
      if (!data.website.trim())     e.website     = "Pflichtfeld";
      else if (!/^https?:\/\//.test(data.website)) e.website = "Bitte gültige URL eingeben (https://...)";
    }
    if (step === 2) {
      if (!data.city.trim()) e.city = "Pflichtfeld";
      if (!data.founded.trim()) e.founded = "Pflichtfeld";
      else {
        const year = Number(data.founded);
        if (!Number.isInteger(year) || year < 1990 || year > 2030) {
          e.founded = "Jahr zwischen 1990 und 2030";
        }
      }
    }
    if (step === 3) {
      if (!data.contactName.trim()) e.contactName = "Pflichtfeld";
      if (!data.email.trim())       e.email       = "Pflichtfeld";
      else if (!/\S+@\S+\.\S+/.test(data.email)) e.email = "Bitte gültige E-Mail eingeben";
      if (!data.agreed) e.agreed = "Bitte bestätigen";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep((s) => Math.min(s + 1, 3)); };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const submit = () => {
    if (!validateStep() || submitting) return;
    setSubmitError(null);
    startSubmitting(async () => {
      try {
        const founders = data.founders
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        await submitStartupExternal({
          name: data.name,
          tagline: data.tagline,
          description: data.description,
          website: data.website,
          logo_url: data.logo || null,
          swiss_status: data.swiss_status,
          industry: data.industry,
          city: data.city,
          employee_range: data.employee_range,
          founded_year: Number(data.founded),
          funding_stage: data.funding_stage || null,
          total_funding_range: data.total_funding_range || null,
          last_round_at: data.last_round_at || null,
          open_to_investment: data.open_to_investment,
          pitch_deck_url: data.pitch_deck_url || null,
          founder_names: founders.length > 0 ? founders : null,
          submitter_name: data.contactName,
          submitter_email: data.email,
          submitter_role: data.role || null,
        });
        setSubmitted(true);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />

      <style>{`
        .ein-shell { max-width: 1100px; margin: 0 auto; padding-left: var(--sp-8); padding-right: var(--sp-8); }
        .ein-header { border-bottom: 1px solid var(--da-border); padding: 48px var(--sp-8) 40px; }
        .ein-crumb { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-4); }
        .ein-crumb__link { color: var(--da-muted); font-size: 13px; text-decoration: none; }
        .ein-crumb__sep { color: var(--da-faint); font-size: 13px; }
        .ein-crumb__here { color: var(--da-green); font-size: 13px; font-weight: 600; }
        .ein-h-row {
          display: flex; align-items: flex-end; justify-content: space-between;
          flex-wrap: wrap; gap: var(--sp-4);
        }
        .ein-title {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: clamp(28px, 4vw, 44px); font-weight: 700;
          line-height: 1.1; letter-spacing: -0.02em;
          margin-bottom: 10px;
        }
        .ein-title em { font-style: normal; color: var(--da-green); }
        .ein-sub { color: var(--da-muted); font-size: 16px; line-height: 1.65; }

        .ein-main { padding: 48px var(--sp-8) 0; }
        .ein-grid { display: grid; grid-template-columns: 1fr 320px; gap: 56px; align-items: start; }

        .ein-stepbar { display: flex; align-items: center; margin-bottom: 36px; }
        .ein-step__group { display: flex; align-items: center; flex: 0 0 auto; }
        .ein-step__group:not(:last-child) { flex: 1; }
        .ein-step { display: flex; align-items: center; gap: 10px; }
        .ein-step__circle {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: var(--da-card); border: 2px solid var(--da-border);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700;
          color: var(--da-faint);
          transition: all 0.25s;
        }
        .ein-step__circle--reached {
          background: var(--da-green); border-color: var(--da-green); color: var(--da-dark);
        }
        .ein-step__label { color: var(--da-faint); font-size: 13px; transition: color 0.25s; }
        .ein-step__label--reached { color: var(--da-text); }
        .ein-step__label--active { font-weight: 600; }
        .ein-step__line {
          flex: 1; height: 2px; background: var(--da-card);
          margin: 0 12px; transition: background 0.25s;
        }
        .ein-step__line--done { background: var(--da-green); }

        .ein-card {
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: var(--r-lg); padding: 32px 36px;
        }
        .ein-card__title {
          color: var(--da-text); font-size: 18px; font-weight: 700; margin-bottom: 24px;
          display: flex; align-items: center; gap: 10px;
          font-family: var(--da-font-display);
        }
        .ein-card__num { color: var(--da-green); font-family: var(--da-font-mono); font-size: 14px; }
        .ein-card__sub {
          color: var(--da-faint); font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          margin: 20px 0 12px;
        }

        .field { margin-bottom: 22px; }
        .field label.lbl { display: block; color: var(--da-text-strong); font-size: 13px; font-weight: 600; margin-bottom: 8px; }
        .field .opt { color: var(--da-faint); font-weight: 400; }
        .field .input,
        .field .ta,
        .field .sel {
          width: 100%; background: var(--da-dark); color: var(--da-text);
          border: 1px solid var(--da-border); border-radius: var(--r-sm);
          padding: 12px 16px; font-size: 15px; font-family: var(--da-font-body);
          outline: none; transition: border-color 0.15s;
        }
        .field .input::placeholder,
        .field .ta::placeholder { color: var(--da-faint); }
        .field .ta { resize: vertical; min-height: 100px; }
        .field .sel { appearance: none; -webkit-appearance: none; padding-right: 36px; background-image: linear-gradient(45deg, transparent 50%, var(--da-muted) 50%), linear-gradient(135deg, var(--da-muted) 50%, transparent 50%); background-position: calc(100% - 18px) 50%, calc(100% - 12px) 50%; background-size: 6px 6px, 6px 6px; background-repeat: no-repeat; }
        .field .input:focus,
        .field .ta:focus,
        .field .sel:focus { border-color: var(--da-green); }
        .field .input.err,
        .field .ta.err,
        .field .sel.err { border-color: var(--da-red); }
        .err-msg { color: var(--da-red); font-size: 12px; margin-top: 5px; }
        .counter { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
        .counter__num { color: var(--da-faint); font-size: 12px; font-family: var(--da-font-mono); }
        .counter__num--warn { color: var(--da-orange); }

        .ein-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4); }

        .ein-radios { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
        .ein-radio {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 16px;
          background: var(--da-dark);
          border: 1px solid var(--da-border);
          border-radius: var(--r-md); cursor: pointer;
        }
        .ein-radio--on { background: var(--da-card); }
        .ein-radio input { width: auto; margin-top: 2px; flex-shrink: 0; }
        .ein-radio__name {
          font-family: var(--da-font-mono);
          font-size: 13px; font-weight: 700;
        }
        .ein-radio__desc { color: var(--da-muted); font-size: 12px; margin-top: 2px; }

        .ein-info-note {
          color: var(--da-muted); font-size: 14px; line-height: 1.6;
          margin-bottom: 24px; padding: 14px 16px;
          background: var(--da-dark);
          border-left: 3px solid var(--da-green);
          border-radius: var(--r-sm);
        }
        .ein-check {
          display: flex; align-items: flex-start; gap: 12px;
          cursor: pointer; font-weight: 400; color: var(--da-text-strong);
          font-size: 13px; line-height: 1.5;
        }
        .ein-check input { width: auto; margin-top: 3px; flex-shrink: 0; accent-color: var(--da-green); }
        .ein-check a { color: var(--da-green); text-decoration: underline; }

        .ein-nav {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 8px; padding-top: 24px;
          border-top: 1px solid var(--da-border);
        }
        .ein-nav__back {
          background: none; color: var(--da-muted);
          border: 1px solid var(--da-border);
          padding: 12px 24px; border-radius: var(--r-sm);
          font-size: 14px; font-weight: 600; cursor: pointer;
        }
        .ein-nav__next {
          background: var(--da-green); color: var(--da-dark);
          border: none; padding: 12px 32px; border-radius: var(--r-sm);
          font-size: 14px; font-weight: 700; cursor: pointer;
        }
        .ein-nav__next:disabled { opacity: 0.6; cursor: not-allowed; }
        .ein-step-info {
          color: var(--da-faint); font-size: 12px;
          font-family: var(--da-font-mono); margin-top: 16px; text-align: center;
        }
        .ein-submit-error {
          color: #ff8080; font-size: 13px; margin-top: 12px; line-height: 1.5;
        }

        .ein-aside { position: sticky; top: var(--aside-sticky-top); display: flex; flex-direction: column; }
        .ein-prev {
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: var(--r-lg); padding: 24px;
          transition: all 0.3s;
        }
        .ein-prev__overline {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 14px;
        }
        .ein-prev__empty { color: var(--da-faint); font-size: 13px; font-style: italic; }
        .ein-prev__status { display: flex; align-items: center; gap: 6px; margin-bottom: 14px; }
        .ein-prev__dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
        .ein-prev__status-text {
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
        }
        .ein-prev__name { color: var(--da-text); font-family: var(--da-font-display); font-size: 18px; font-weight: 700; margin-bottom: 8px; }
        .ein-prev__tagline { color: var(--da-muted); font-size: 13px; line-height: 1.55; margin-bottom: 18px; min-height: 36px; }
        .ein-prev__placeholder { color: var(--da-faint); }
        .ein-prev__meta { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
        .ein-prev__chip {
          background: var(--da-dark); color: var(--da-text-strong);
          border: 1px solid var(--da-border); font-size: 11px;
          padding: 4px 10px; border-radius: var(--r-sm);
        }
        .ein-prev__chip--green { color: var(--da-green); font-weight: 600; }
        .ein-prev__chip--mono { color: var(--da-muted); font-family: var(--da-font-mono); }

        .ein-proc {
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: var(--r-lg); padding: 24px; margin-top: 20px;
        }
        .ein-proc__row { display: flex; gap: 14px; margin-bottom: 16px; }
        .ein-proc__n { color: var(--da-green); font-size: 12px; font-weight: 700; font-family: var(--da-font-mono); flex-shrink: 0; margin-top: 1px; }
        .ein-proc__t { color: var(--da-text); font-size: 13px; font-weight: 600; margin-bottom: 3px; }
        .ein-proc__d { color: var(--da-muted); font-size: 12px; line-height: 1.5; }
        .ein-proc__foot { border-top: 1px solid var(--da-border); padding-top: 14px; margin-top: 4px; }
        .ein-proc__foot-text { color: var(--da-muted); font-size: 12px; line-height: 1.6; }

        .ein-success { text-align: center; padding: 48px 32px; max-width: 560px; margin: 0 auto; }
        .ein-success__check {
          width: 72px; height: 72px; border-radius: 50%;
          background: var(--da-green);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 24px; font-size: 32px; color: var(--da-dark); font-weight: 700;
        }
        .ein-success__title {
          color: var(--da-text); font-size: 28px; font-weight: 700;
          font-family: var(--da-font-display); margin-bottom: 12px;
        }
        .ein-success__text {
          color: var(--da-muted); font-size: 16px; line-height: 1.7;
          max-width: 440px; margin: 0 auto 32px;
        }
        .ein-success__text strong { color: var(--da-text); }
        .ein-success__btn {
          display: inline-block; background: var(--da-green); color: var(--da-dark);
          font-size: 14px; font-weight: 700;
          padding: 13px 32px; border-radius: var(--r-sm); text-decoration: none;
        }

        @media (max-width: 1024px) {
          .ein-grid { grid-template-columns: 1fr; gap: var(--sp-8); }
          .ein-aside { position: static; }
        }
        @media (max-width: 720px) {
          .ein-card { padding: 24px 20px; }
          .ein-row2 { grid-template-columns: 1fr; }
          .ein-stepbar { gap: 4px; }
          .ein-step__line { margin: 0 6px; }
          .ein-step__label { display: none; }
          .ein-header { padding: 32px var(--sp-6) 28px; }
        }
      `}</style>

      <section className="ein-header">
        <div className="ein-shell" style={{ padding: 0 }}>
          <div className="ein-crumb">
            <Link href="/swiss-ai" className="ein-crumb__link">Swiss AI</Link>
            <span className="ein-crumb__sep">/</span>
            <span className="ein-crumb__here">Einreichen</span>
          </div>
          <div className="ein-h-row">
            <div>
              <h1 className="ein-title">Dein Unternehmen<br /><em>listen lassen.</em></h1>
              <p className="ein-sub">Kostenlos · Geprüft in 5 Werktagen · Für alle sichtbar</p>
            </div>
          </div>
        </div>
      </section>

      <div className="ein-shell ein-main">
        {submitted ? (
          <SuccessScreen data={data} />
        ) : (
          <div className="ein-grid">
            <div>
              <StepBar step={step} />
              <div className="ein-card">
                <h2 className="ein-card__title">
                  <span className="ein-card__num">0{step}</span>
                  {STEPS[step - 1].label}
                </h2>

                {step === 1 && (
                  <>
                    <div className="field">
                      <label className="lbl">Name des Unternehmens *</label>
                      <input type="text" className={`input${errors.name ? " err" : ""}`} maxLength={80} value={data.name} onChange={(e) => update("name", e.target.value)} placeholder="z.B. DeepJudge" />
                      {errors.name && <p className="err-msg">{errors.name}</p>}
                    </div>
                    <div className="field">
                      <label className="lbl">Tagline <span className="opt">(max. 100 Zeichen)</span> *</label>
                      <input type="text" className={`input${errors.tagline ? " err" : ""}`} maxLength={100} value={data.tagline} onChange={(e) => update("tagline", e.target.value)} placeholder="Was macht ihr in einem Satz?" />
                      <div className="counter">
                        {errors.tagline ? <p className="err-msg">{errors.tagline}</p> : <span />}
                        <span className={`counter__num${data.tagline.length > 80 ? " counter__num--warn" : ""}`}>
                          {data.tagline.length}/100
                        </span>
                      </div>
                    </div>
                    <div className="field">
                      <label className="lbl">Beschreibung *</label>
                      <textarea className={`ta${errors.description ? " err" : ""}`} value={data.description} onChange={(e) => update("description", e.target.value)} placeholder="Was bietet euer Unternehmen? Für wen? Was unterscheidet euch?" rows={4} />
                      {errors.description && <p className="err-msg">{errors.description}</p>}
                    </div>
                    <div className="field">
                      <label className="lbl">Website *</label>
                      <input type="url" className={`input${errors.website ? " err" : ""}`} value={data.website} onChange={(e) => update("website", e.target.value)} placeholder="https://..." />
                      {errors.website && <p className="err-msg">{errors.website}</p>}
                    </div>
                    <div className="field">
                      <label className="lbl">Logo-URL <span className="opt">(optional)</span></label>
                      <input type="url" className="input" value={data.logo} onChange={(e) => update("logo", e.target.value)} placeholder="https://..." />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="field">
                      <label className="lbl">Swiss-Status *</label>
                      <div className="ein-radios">
                        {SWISS_STATUSES.map((s) => {
                          const active = data.swiss_status === s.code;
                          return (
                            <label key={s.code} className={`ein-radio${active ? " ein-radio--on" : ""}`} style={{ borderColor: active ? s.color : undefined }}>
                              <input type="radio" name="status" checked={active} onChange={() => update("swiss_status", s.code)} style={{ accentColor: s.color }} />
                              <div>
                                <div className="ein-radio__name" style={{ color: s.color }}>🇨🇭 {s.label}</div>
                                <div className="ein-radio__desc">{s.description}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div className="ein-row2">
                      <div className="field">
                        <label className="lbl">Branche *</label>
                        <select className="sel" value={data.industry} onChange={(e) => update("industry", e.target.value)}>
                          {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                        </select>
                      </div>
                      <div className="field">
                        <label className="lbl">Stadt (Hauptsitz) *</label>
                        <input type="text" className={`input${errors.city ? " err" : ""}`} value={data.city} onChange={(e) => update("city", e.target.value)} placeholder="z.B. Zürich" />
                        {errors.city && <p className="err-msg">{errors.city}</p>}
                      </div>
                    </div>
                    <div className="ein-row2">
                      <div className="field">
                        <label className="lbl">Mitarbeitende *</label>
                        <select className="sel" value={data.employee_range} onChange={(e) => update("employee_range", e.target.value as EmployeeRangeCode)}>
                          {EMPLOYEE_RANGES.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                        </select>
                      </div>
                      <div className="field">
                        <label className="lbl">Gründungsjahr *</label>
                        <input type="number" min={1990} max={2030} className={`input${errors.founded ? " err" : ""}`} value={data.founded} onChange={(e) => update("founded", e.target.value)} placeholder="2020" />
                        {errors.founded && <p className="err-msg">{errors.founded}</p>}
                      </div>
                    </div>

                    <h3 className="ein-card__sub">Investor-Infos (optional)</h3>
                    <div className="ein-row2">
                      <div className="field">
                        <label className="lbl">Funding Stage <span className="opt">(optional)</span></label>
                        <select className="sel" value={data.funding_stage} onChange={(e) => update("funding_stage", e.target.value as FundingStageCode | "")}>
                          <option value="">—</option>
                          {FUNDING_STAGES.map((f) => <option key={f.code} value={f.code}>{f.label}</option>)}
                        </select>
                      </div>
                      <div className="field">
                        <label className="lbl">Total Funding <span className="opt">(z.B. CHF 5–10M)</span></label>
                        <input type="text" className="input" value={data.total_funding_range} onChange={(e) => update("total_funding_range", e.target.value)} placeholder="CHF 5–10M" />
                      </div>
                    </div>
                    <div className="ein-row2">
                      <div className="field">
                        <label className="lbl">Letzte Runde <span className="opt">(Datum, optional)</span></label>
                        <input type="date" className="input" value={data.last_round_at} onChange={(e) => update("last_round_at", e.target.value)} />
                      </div>
                      <div className="field">
                        <label className="lbl">Pitch Deck URL <span className="opt">(optional)</span></label>
                        <input type="url" className="input" value={data.pitch_deck_url} onChange={(e) => update("pitch_deck_url", e.target.value)} placeholder="https://..." />
                      </div>
                    </div>
                    <div className="field">
                      <label className="lbl">Gründer:innen <span className="opt">(Namen kommagetrennt, optional)</span></label>
                      <input type="text" className="input" value={data.founders} onChange={(e) => update("founders", e.target.value)} placeholder="z.B. Anna Muster, Beat Beispiel" />
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <p className="ein-info-note">
                      Deine Kontaktdaten werden nicht veröffentlicht — sie dienen nur der internen Kommunikation.
                    </p>
                    <div className="field">
                      <label className="lbl">Dein Name *</label>
                      <input type="text" className={`input${errors.contactName ? " err" : ""}`} value={data.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="Vorname Nachname" />
                      {errors.contactName && <p className="err-msg">{errors.contactName}</p>}
                    </div>
                    <div className="field">
                      <label className="lbl">E-Mail-Adresse *</label>
                      <input type="email" className={`input${errors.email ? " err" : ""}`} value={data.email} onChange={(e) => update("email", e.target.value)} placeholder="name@unternehmen.ch" />
                      {errors.email && <p className="err-msg">{errors.email}</p>}
                    </div>
                    <div className="field">
                      <label className="lbl">Rolle im Unternehmen <span className="opt">(optional)</span></label>
                      <input type="text" className="input" value={data.role} onChange={(e) => update("role", e.target.value)} placeholder="z.B. CEO, Marketing Manager" />
                    </div>
                    <div className="field">
                      <label className="ein-check">
                        <input type="checkbox" checked={data.open_to_investment} onChange={(e) => update("open_to_investment", e.target.checked)} />
                        <span>Wir sind offen für Investorengespräche (kann später von der Redaktion bestätigt werden).</span>
                      </label>
                    </div>
                    <div className="field">
                      <label className="ein-check">
                        <input type="checkbox" checked={data.agreed} onChange={(e) => update("agreed", e.target.checked)} />
                        <span>Ich bestätige, dass die Angaben korrekt sind und ich berechtigt bin, dieses Unternehmen einzutragen. Ich akzeptiere die <a href="/datenschutzerklaerung">Nutzungsbedingungen</a>.</span>
                      </label>
                      {errors.agreed && <p className="err-msg">{errors.agreed}</p>}
                    </div>
                  </>
                )}

                <div className="ein-nav">
                  {step > 1 ? (
                    <button type="button" className="ein-nav__back" onClick={back} disabled={submitting}>← Zurück</button>
                  ) : <span />}
                  {step < 3 ? (
                    <button type="button" className="ein-nav__next" onClick={next}>Weiter →</button>
                  ) : (
                    <button type="button" className="ein-nav__next" onClick={submit} disabled={submitting}>
                      {submitting ? "Wird übermittelt..." : "Zur Prüfung einreichen →"}
                    </button>
                  )}
                </div>
                {submitError && <p className="ein-submit-error">Fehler beim Einreichen: {submitError}</p>}
              </div>
              <p className="ein-step-info">Schritt {step} von {STEPS.length}</p>
            </div>

            <aside className="ein-aside">
              <PreviewCard data={data} />
              <ProcessInfo />
            </aside>
          </div>
        )}
      </div>

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}
