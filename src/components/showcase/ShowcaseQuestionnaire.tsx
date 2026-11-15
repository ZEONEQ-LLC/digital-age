"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";

import { EMPLOYEE_RANGES, FUNDING_STAGES, INDUSTRIES, SWISS_STATUSES } from "@/lib/mappers/startupMappers";
import {
  ANSWER_MAX,
  ANSWER_MIN,
  MEDIA_MAX_BYTES,
  OWN_TEXT_MAX_WORDS,
  OWN_TEXT_MIN_WORDS,
  OWN_TEXT_TARGET,
  PROFILE_LABELS,
  QUESTIONS,
  QUOTE_MAX,
  countWords,
  validateSubmission,
  type AnswerKey,
  type MediaKind,
  type ProfileValues,
  type SubmissionInput,
} from "@/lib/showcase/questionnaire";
import { submitShowcase, uploadShowcaseMedia } from "@/lib/showcase/submitActions";

// Fragebogen des Showcase (/showcase/mitmachen/<token>). Fragen nach Anhang B
// der Uebergabe, Du-Form. Regeln und Pruefung: src/lib/showcase/questionnaire.ts.
//
// Der Zwischenstand liegt im localStorage dieses Browsers (Schluessel mit
// dem Anfang des Tokens), damit zwanzig Minuten Arbeit einen geschlossenen
// Tab ueberstehen. Nach dem Abschicken wird er geloescht.
//
// Gestaltung: eine Spalte, Abschnitte mit Nummer und Linie, keine Karten.

type Props = {
  token: string;
  company: string;
  profile: ProfileValues;
  inviteeName: string;
  inviteeEmail: string;
  // «19. Dezember 2026» oder leer
  replyBy: string;
};

type Media = { path: string; url: string } | null;

type FormState = {
  contactName: string;
  contactRole: string;
  contactEmail: string;
  mode: "questions" | "own_text";
  answers: Record<AnswerKey, string>;
  quote: string;
  quoteBy: string;
  ownText: string;
  links: [string, string];
  logo: Media;
  image: Media;
  profile: Record<keyof ProfileValues, string | boolean>;
  consentData: boolean;
  consentLabelling: boolean;
  consentMediaRights: boolean;
  contactForwarding: boolean;
  contactForwardingEmail: string;
};

function initialState(p: Props): FormState {
  return {
    contactName: p.inviteeName,
    contactRole: "",
    contactEmail: p.inviteeEmail,
    mode: "questions",
    answers: { problem: "", solution: "", usecase: "", learnings: "", trust: "", outlook: "" },
    quote: "",
    quoteBy: "",
    ownText: "",
    links: ["", ""],
    logo: null,
    image: null,
    profile: {
      name: p.profile.name,
      tagline: p.profile.tagline,
      city: p.profile.city,
      industry: p.profile.industry,
      founded_year: String(p.profile.founded_year),
      employee_range: p.profile.employee_range,
      swiss_status: p.profile.swiss_status,
      funding_stage: p.profile.funding_stage ?? "",
      last_round_month: p.profile.last_round_month,
      open_to_investment: p.profile.open_to_investment,
    },
    consentData: false,
    consentLabelling: false,
    consentMediaRights: false,
    contactForwarding: false,
    contactForwardingEmail: "",
  };
}

function toInput(s: FormState, website: string, openedAt: number): SubmissionInput {
  return {
    contactName: s.contactName,
    contactRole: s.contactRole,
    contactEmail: s.contactEmail,
    mode: s.mode,
    answers: s.answers,
    quote: s.quote,
    quoteBy: s.quoteBy,
    ownText: s.ownText,
    links: s.links,
    logoPath: s.logo?.path ?? null,
    imagePath: s.image?.path ?? null,
    profile: s.profile,
    consentData: s.consentData,
    consentLabelling: s.consentLabelling,
    consentMediaRights: s.consentMediaRights,
    contactForwarding: s.contactForwarding,
    contactForwardingEmail: s.contactForwardingEmail,
    website,
    openedAt,
  };
}

// Bild fuer den Upload vorbereiten: PNG und WebP in passender Groesse gehen
// unveraendert durch. Alles andere (JPEG, SVG, zu grosse Dateien) wird im
// Browser neu gezeichnet und als WebP gespeichert; ein SVG wird dabei zum
// Rasterbild. Der Server nimmt nur PNG und WebP an.
async function prepareImage(file: File, kind: MediaKind): Promise<Blob> {
  const direct = (file.type === "image/png" || file.type === "image/webp") && file.size <= MEDIA_MAX_BYTES;
  if (direct) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Bild nicht lesbar"));
      el.src = url;
    });
    const natW = img.naturalWidth || 800;
    const natH = img.naturalHeight || 800;
    let max = kind === "logo" ? 800 : 1600;
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, max / Math.max(natW, natH));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(natW * scale));
      canvas.height = Math.max(1, Math.round(natH * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Kein Canvas");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
      if (blob && blob.size <= MEDIA_MAX_BYTES && (blob.type === "image/webp" || blob.type === "image/png")) return blob;
      max = Math.round(max * 0.72);
    }
    throw new Error("Bild zu gross");
  } finally {
    URL.revokeObjectURL(url);
  }
}

const storageKey = (token: string) => `da-showcase-${token.slice(0, 12)}`;

// Startzustand im Browser: Vorgaben aus der Einladung, darueber ein
// gespeicherter Zwischenstand, falls es einen gibt.
function bootState(props: Props): { state: FormState; restored: boolean } {
  const base = initialState(props);
  try {
    const raw = window.localStorage.getItem(storageKey(props.token));
    if (!raw) return { state: base, restored: false };
    const saved = JSON.parse(raw) as Partial<FormState> | null;
    if (!saved || typeof saved !== "object") return { state: base, restored: false };
    return {
      state: {
        ...base,
        ...saved,
        answers: { ...base.answers, ...(saved.answers ?? {}) },
        profile: { ...base.profile, ...(saved.profile ?? {}) },
      },
      restored: true,
    };
  } catch {
    return { state: base, restored: false };
  }
}

const noSubscribe = () => () => {};

// Kopf sofort (auch ohne JavaScript lesbar), das Formular erst im Browser:
// So kann es seinen Zwischenstand beim ersten Rendern aus dem localStorage
// lesen, ohne dass Server- und Browser-Ausgabe auseinanderlaufen.
export default function ShowcaseQuestionnaire(props: Props) {
  const inBrowser = useSyncExternalStore(noSubscribe, () => true, () => false);
  return inBrowser ? (
    <QuestionnaireForm {...props} />
  ) : (
    <div className="sq">
      <Intro company={props.company} replyBy={props.replyBy} restored={false} />
      <p className="sq-meta">Der Fragebogen wird geladen …</p>
    </div>
  );
}

function Intro({ company, replyBy, restored }: { company: string; replyBy: string; restored: boolean }) {
  return (
    <header className="sq-head">
      <h1 className="sq-title">Euer Beitrag im Showcase</h1>
      <p className="sq-lead">
        Schön, dass {company} dabei ist. Der Fragebogen dauert rund 20 Minuten. Aus euren Antworten machen wir einen Entwurf, den ihr freigebt, bevor etwas erscheint.
      </p>
      <p className="sq-meta">
        {replyBy ? `Antwort bis ${replyBy}. ` : ""}Dein Zwischenstand bleibt in diesem Browser gespeichert, bis du abschickst.
        {restored ? " Wir haben deinen letzten Stand wiederhergestellt." : ""}
      </p>
    </header>
  );
}

function QuestionnaireForm(props: Props) {
  const { token, company, profile, replyBy } = props;
  const [boot] = useState(() => bootState(props));
  const [s, setS] = useState<FormState>(boot.state);
  const restored = boot.restored;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [uploading, setUploading] = useState<MediaKind | null>(null);
  const [uploadError, setUploadError] = useState<Partial<Record<MediaKind, string>>>({});
  const [pending, startTransition] = useTransition();
  const [website, setWebsite] = useState("");
  // Zeitpunkt des Oeffnens (Bot-Signal: zu schnell ausgefuellt).
  const [openedAt] = useState(() => Date.now());
  const rootRef = useRef<HTMLFormElement>(null);

  // Zwischenstand bei jeder Aenderung sichern.
  useEffect(() => {
    if (done) return;
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey(token), JSON.stringify(s));
      } catch {
        // voller oder gesperrter Speicher: nicht schlimm
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [s, token, done]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setS((cur) => ({ ...cur, [key]: value }));
  const setProfile = (key: keyof ProfileValues, value: string | boolean) =>
    setS((cur) => ({ ...cur, profile: { ...cur.profile, [key]: value } }));
  const clearError = (key: string) => setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));

  const changed = (key: keyof ProfileValues): boolean => {
    const now = s.profile[key];
    const before = key === "founded_year" ? String(profile.founded_year) : key === "funding_stage" ? profile.funding_stage ?? "" : profile[key];
    return typeof now === "string" && typeof before === "string" ? now.trim() !== before : now !== before;
  };

  async function onFile(kind: MediaKind, file: File | undefined) {
    if (!file) return;
    setUploadError((e) => ({ ...e, [kind]: "" }));
    setUploading(kind);
    try {
      const blob = await prepareImage(file, kind);
      const data = new FormData();
      data.set("file", new File([blob], blob.type === "image/png" ? "datei.png" : "datei.webp", { type: blob.type }));
      const res = await uploadShowcaseMedia(token, kind, data);
      if (!res.ok) setUploadError((e) => ({ ...e, [kind]: res.message }));
      else set(kind === "logo" ? "logo" : "image", { path: res.path, url: res.url });
    } catch {
      setUploadError((e) => ({
        ...e,
        [kind]: "Diese Datei liess sich nicht lesen. Bitte ein PNG, WebP oder JPEG wählen.",
      }));
    } finally {
      setUploading(null);
    }
  }

  function showErrors(fieldErrors: Record<string, string>, text: string) {
    setErrors(fieldErrors);
    setMessage(text);
    window.requestAnimationFrame(() => {
      const first = rootRef.current?.querySelector<HTMLElement>("[data-error='true']");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const input = toInput(s, website, openedAt);
    const local = validateSubmission(input);
    if (!local.ok) {
      showErrors(local.fieldErrors, "Bitte prüf die markierten Felder.");
      return;
    }
    startTransition(async () => {
      const res = await submitShowcase(token, input);
      if (res.ok) {
        try {
          window.localStorage.removeItem(storageKey(token));
        } catch {
          // egal
        }
        setDone(true);
        window.scrollTo({ top: 0 });
        return;
      }
      showErrors(res.fieldErrors ?? {}, res.message);
    });
  }

  if (done) {
    return (
      <div className="sq-done" role="status">
        <h1 className="sq-title">Danke, das ist angekommen</h1>
        <p className="sq-lead">
          Wir machen aus euren Angaben einen Entwurf und schicken ihn dir zur Freigabe. Ohne eure Freigabe erscheint nichts. Eine Bestätigung ist unterwegs an {s.contactEmail.trim()}.
        </p>
      </div>
    );
  }

  const err = (key: string) => (errors[key] ? <p className="sq-err">{errors[key]}</p> : null);
  const bad = (key: string) => (errors[key] ? { "data-error": "true", "aria-invalid": true } : {});
  const ownWords = countWords(s.ownText);
  const hasMedia = !!(s.logo || s.image);

  return (
    <form className="sq" onSubmit={onSubmit} ref={rootRef} noValidate>
      <Intro company={company} replyBy={replyBy} restored={restored} />

      {/* Bot-Falle: fuer Menschen unsichtbar. */}
      <div className="sq-hp" aria-hidden>
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      <section className="sq-sec">
        <h2 className="sq-h2"><span>1</span>Wer füllt aus?</h2>
        <div className="sq-grid">
          <label className="sq-field">
            <span className="sq-label">Dein Name</span>
            <input className="da-input" value={s.contactName} autoComplete="name" {...bad("contactName")} onChange={(e) => { set("contactName", e.target.value); clearError("contactName"); }} />
            {err("contactName")}
          </label>
          <label className="sq-field">
            <span className="sq-label">Deine Funktion</span>
            <input className="da-input" value={s.contactRole} autoComplete="organization-title" placeholder="z. B. Mitgründerin, CEO" {...bad("contactRole")} onChange={(e) => { set("contactRole", e.target.value); clearError("contactRole"); }} />
            {err("contactRole")}
          </label>
          <label className="sq-field sq-field--wide">
            <span className="sq-label">Deine E-Mail-Adresse</span>
            <input className="da-input" type="email" value={s.contactEmail} autoComplete="email" {...bad("contactEmail")} onChange={(e) => { set("contactEmail", e.target.value); clearError("contactEmail"); }} />
            <span className="sq-hint">An diese Adresse schicken wir den Entwurf zur Freigabe.</span>
            {err("contactEmail")}
          </label>
        </div>
      </section>

      <section className="sq-sec">
        <h2 className="sq-h2"><span>2</span>Euer Beitrag</h2>
        <fieldset className="sq-mode">
          <legend className="sq-label">Wie wollt ihr den Text liefern?</legend>
          <label>
            <input type="radio" name="mode" checked={s.mode === "questions"} onChange={() => set("mode", "questions")} />
            <span>
              <strong>Fragen beantworten.</strong> Wir schreiben daraus den Entwurf.
            </span>
          </label>
          <label>
            <input type="radio" name="mode" checked={s.mode === "own_text"} onChange={() => set("mode", "own_text")} />
            <span>
              <strong>Eigenen Text einfügen.</strong> {OWN_TEXT_TARGET}, wir redigieren behutsam.
            </span>
          </label>
        </fieldset>

        {s.mode === "questions" ? (
          QUESTIONS.map((q) => {
            const value = s.answers[q.key];
            const len = value.trim().length;
            return (
              <label className="sq-field sq-field--q" key={q.key}>
                <span className="sq-label">{q.label}</span>
                {q.hint && <span className="sq-hint">{q.hint}</span>}
                <textarea
                  className="da-input sq-area"
                  rows={5}
                  value={value}
                  {...bad(`answer_${q.key}`)}
                  onChange={(e) => {
                    setS((cur) => ({ ...cur, answers: { ...cur.answers, [q.key]: e.target.value } }));
                    clearError(`answer_${q.key}`);
                  }}
                />
                <span className={`sq-count${len > ANSWER_MAX ? " sq-count--over" : ""}`}>
                  {len < ANSWER_MIN ? `noch ${ANSWER_MIN - len} Zeichen bis zum Minimum` : `${len} von höchstens ${ANSWER_MAX} Zeichen`}
                </span>
                {err(`answer_${q.key}`)}
              </label>
            );
          })
        ) : (
          <label className="sq-field sq-field--q">
            <span className="sq-label">Euer Text</span>
            <span className="sq-hint">
              Ein konkreter Anwendungsfall statt Werbetext: welches Problem, wie ihr es löst, was ihr gelernt habt. Keine Aufrufe zum Investieren.
            </span>
            <textarea
              className="da-input sq-area"
              rows={16}
              value={s.ownText}
              {...bad("ownText")}
              onChange={(e) => { set("ownText", e.target.value); clearError("ownText"); }}
            />
            <span className={`sq-count${ownWords > OWN_TEXT_MAX_WORDS ? " sq-count--over" : ""}`}>
              {ownWords} {ownWords === 1 ? "Wort" : "Wörter"}
              {ownWords < OWN_TEXT_MIN_WORDS ? `, Ziel sind ${OWN_TEXT_TARGET}` : ""}
            </span>
            {err("ownText")}
          </label>
        )}

        <label className="sq-field sq-field--q">
          <span className="sq-label">Ein Zitat der Gründerin oder des Gründers</span>
          <span className="sq-hint">Freiwillig. Ein bis zwei Sätze.</span>
          <textarea className="da-input sq-area" rows={3} value={s.quote} maxLength={QUOTE_MAX + 100} {...bad("quote")} onChange={(e) => { set("quote", e.target.value); clearError("quote"); }} />
          {err("quote")}
        </label>
        <label className="sq-field">
          <span className="sq-label">Name und Funktion zum Zitat</span>
          <input className="da-input" value={s.quoteBy} placeholder="z. B. Anna Muster, Mitgründerin" {...bad("quoteBy")} onChange={(e) => { set("quoteBy", e.target.value); clearError("quoteBy"); }} />
          {err("quoteBy")}
        </label>
      </section>

      <section className="sq-sec">
        <h2 className="sq-h2"><span>3</span>Links</h2>
        <p className="sq-intro">Bis zu zwei Adressen, auf die der Beitrag verweisen soll, etwa eure Website und die Produktseite.</p>
        <div className="sq-grid">
          {[0, 1].map((i) => (
            <label className="sq-field" key={i}>
              <span className="sq-label">Link {i + 1}</span>
              <input
                className="da-input"
                type="url"
                inputMode="url"
                placeholder="https://"
                value={s.links[i]}
                {...bad(`link_${i}`)}
                onChange={(e) => {
                  const next: [string, string] = [...s.links];
                  next[i] = e.target.value;
                  set("links", next);
                  clearError(`link_${i}`);
                }}
              />
              {err(`link_${i}`)}
            </label>
          ))}
        </div>
      </section>

      <section className="sq-sec">
        <h2 className="sq-h2"><span>4</span>Logo und Bild</h2>
        <p className="sq-intro">
          Das Logo zeigen wir im Beitrag und in eurem Verzeichnisprofil. Ein Produkt- oder Teambild ist freiwillig. PNG, WebP oder JPEG; ein SVG wandeln wir beim Hochladen in ein Bild um.
        </p>
        <div className="sq-grid">
          {(["logo", "bild"] as MediaKind[]).map((kind) => {
            const media = kind === "logo" ? s.logo : s.image;
            return (
              <div className="sq-field" key={kind}>
                <span className="sq-label">{kind === "logo" ? "Logo" : "Bild (freiwillig)"}</span>
                {media ? (
                  <div className="sq-media">
                    <span className={`sq-media__thumb${kind === "logo" ? " sq-media__thumb--logo" : ""}`}>
                      <Image src={media.url} alt="" fill sizes="160px" style={{ objectFit: kind === "logo" ? "contain" : "cover" }} unoptimized />
                    </span>
                    <button type="button" className="sq-link" onClick={() => set(kind === "logo" ? "logo" : "image", null)}>
                      Entfernen
                    </button>
                  </div>
                ) : (
                  <label className="sq-file">
                    <input
                      type="file"
                      accept="image/png,image/webp,image/jpeg,image/svg+xml"
                      disabled={uploading !== null}
                      onChange={(e) => {
                        void onFile(kind, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <span>{uploading === kind ? "Lädt hoch …" : "Datei wählen"}</span>
                  </label>
                )}
                {uploadError[kind] ? <p className="sq-err">{uploadError[kind]}</p> : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="sq-sec">
        <h2 className="sq-h2"><span>5</span>Euer Profil im Verzeichnis</h2>
        <p className="sq-intro">
          So steht {company} heute im Swiss-AI-Verzeichnis. Bitte prüfen und korrigieren, was nicht mehr stimmt. Änderungen übernimmt die Redaktion.
        </p>
        <div className="sq-grid">
          <label className="sq-field">
            <span className="sq-label">{PROFILE_LABELS.name}{changed("name") && <em>geändert</em>}</span>
            <input className="da-input" value={String(s.profile.name)} {...bad("profile_name")} onChange={(e) => { setProfile("name", e.target.value); clearError("profile_name"); }} />
            {err("profile_name")}
          </label>
          <label className="sq-field">
            <span className="sq-label">{PROFILE_LABELS.city}{changed("city") && <em>geändert</em>}</span>
            <input className="da-input" value={String(s.profile.city)} {...bad("profile_city")} onChange={(e) => { setProfile("city", e.target.value); clearError("profile_city"); }} />
            {err("profile_city")}
          </label>
          <label className="sq-field sq-field--wide">
            <span className="sq-label">{PROFILE_LABELS.tagline}{changed("tagline") && <em>geändert</em>}</span>
            <input className="da-input" value={String(s.profile.tagline)} maxLength={100} {...bad("profile_tagline")} onChange={(e) => { setProfile("tagline", e.target.value); clearError("profile_tagline"); }} />
            <span className="sq-hint">Ein Satz, höchstens 100 Zeichen.</span>
            {err("profile_tagline")}
          </label>
          <label className="sq-field">
            <span className="sq-label">{PROFILE_LABELS.industry}{changed("industry") && <em>geändert</em>}</span>
            <select className="da-input" value={String(s.profile.industry)} {...bad("profile_industry")} onChange={(e) => { setProfile("industry", e.target.value); clearError("profile_industry"); }}>
              {!INDUSTRIES.includes(String(s.profile.industry)) && <option value={String(s.profile.industry)}>{String(s.profile.industry)}</option>}
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            {err("profile_industry")}
          </label>
          <label className="sq-field">
            <span className="sq-label">{PROFILE_LABELS.founded_year}{changed("founded_year") && <em>geändert</em>}</span>
            <input className="da-input" inputMode="numeric" value={String(s.profile.founded_year)} {...bad("profile_founded_year")} onChange={(e) => { setProfile("founded_year", e.target.value); clearError("profile_founded_year"); }} />
            {err("profile_founded_year")}
          </label>
          <label className="sq-field">
            <span className="sq-label">{PROFILE_LABELS.employee_range} (Mitarbeitende){changed("employee_range") && <em>geändert</em>}</span>
            <select className="da-input" value={String(s.profile.employee_range)} {...bad("profile_employee_range")} onChange={(e) => { setProfile("employee_range", e.target.value); clearError("profile_employee_range"); }}>
              {EMPLOYEE_RANGES.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
            {err("profile_employee_range")}
          </label>
          <label className="sq-field">
            <span className="sq-label">{PROFILE_LABELS.swiss_status}{changed("swiss_status") && <em>geändert</em>}</span>
            <select className="da-input" value={String(s.profile.swiss_status)} {...bad("profile_swiss_status")} onChange={(e) => { setProfile("swiss_status", e.target.value); clearError("profile_swiss_status"); }}>
              {SWISS_STATUSES.map((st) => <option key={st.code} value={st.code}>{st.label}: {st.description}</option>)}
            </select>
            {err("profile_swiss_status")}
          </label>
          <label className="sq-field">
            <span className="sq-label">{PROFILE_LABELS.funding_stage}{changed("funding_stage") && <em>geändert</em>}</span>
            <select className="da-input" value={String(s.profile.funding_stage)} {...bad("profile_funding_stage")} onChange={(e) => { setProfile("funding_stage", e.target.value); clearError("profile_funding_stage"); }}>
              <option value="">keine Angabe</option>
              {FUNDING_STAGES.map((f) => <option key={f.code} value={f.code}>{f.label}</option>)}
            </select>
            {err("profile_funding_stage")}
          </label>
          <label className="sq-field">
            <span className="sq-label">{PROFILE_LABELS.last_round_month}{changed("last_round_month") && <em>geändert</em>}</span>
            <input className="da-input" type="month" placeholder="JJJJ-MM" value={String(s.profile.last_round_month)} {...bad("profile_last_round_month")} onChange={(e) => { setProfile("last_round_month", e.target.value); clearError("profile_last_round_month"); }} />
            <span className="sq-hint">Monat und Jahr, oder leer lassen.</span>
            {err("profile_last_round_month")}
          </label>
          <label className="sq-check sq-field--wide">
            <input type="checkbox" checked={s.profile.open_to_investment === true} onChange={(e) => setProfile("open_to_investment", e.target.checked)} />
            <span>
              {PROFILE_LABELS.open_to_investment}
              {changed("open_to_investment") && <em>geändert</em>}
              <small>Erscheint als Angabe im Profil. Im Beitrag selbst steht kein Aufruf zum Investieren.</small>
            </span>
          </label>
        </div>
      </section>

      <section className="sq-sec">
        <h2 className="sq-h2"><span>6</span>Einverständnis</h2>
        <div className="sq-consent">
          <label className="sq-check" {...bad("consentData")}>
            <input type="checkbox" checked={s.consentData} onChange={(e) => { set("consentData", e.target.checked); clearError("consentData"); }} />
            <span>Die Profildaten oben stimmen. digital age darf sie im Verzeichnis so zeigen.</span>
          </label>
          {err("consentData")}
        </div>
        <div className="sq-consent">
          <label className="sq-check" {...bad("consentLabelling")}>
            <input type="checkbox" checked={s.consentLabelling} onChange={(e) => { set("consentLabelling", e.target.checked); clearError("consentLabelling"); }} />
            <span>
              Mir ist klar: Der Beitrag erscheint als Unternehmensbeitrag gekennzeichnet und enthält keine Aufrufe zum Investieren.{" "}
              <a href="/swiss-ai/regeln#showcase" target="_blank" rel="noopener noreferrer">Regeln ansehen</a>
            </span>
          </label>
          {err("consentLabelling")}
        </div>
        {hasMedia && (
          <div className="sq-consent">
            <label className="sq-check" {...bad("consentMediaRights")}>
              <input type="checkbox" checked={s.consentMediaRights} onChange={(e) => { set("consentMediaRights", e.target.checked); clearError("consentMediaRights"); }} />
              <span>Wir haben die Rechte an Logo und Bild. digital age darf sie im Beitrag und im Verzeichnis zeigen.</span>
            </label>
            {err("consentMediaRights")}
          </div>
        )}
        <div className="sq-consent">
          <label className="sq-check">
            <input type="checkbox" checked={s.contactForwarding} onChange={(e) => { set("contactForwarding", e.target.checked); clearError("contactForwardingEmail"); }} />
            <span>
              Freiwillig: Kontaktanfragen über unser Profil an uns weiterleiten.
              <small>
                Auf eurem Profil erscheint dann der Knopf «Kontakt aufnehmen». Anfragen gehen per Mail direkt an euch, wir speichern ihren Inhalt nicht. Ihr könnt das jederzeit beenden.
              </small>
            </span>
          </label>
        </div>
        {(s.contactForwarding || s.contactForwardingEmail !== "") && (
          <label className="sq-field sq-field--indent">
            <span className="sq-label">Adresse für Kontaktanfragen</span>
            <input className="da-input" type="email" value={s.contactForwardingEmail} placeholder="z. B. hallo@firma.ch" {...bad("contactForwardingEmail")} onChange={(e) => { set("contactForwardingEmail", e.target.value); clearError("contactForwardingEmail"); }} />
            {err("contactForwardingEmail")}
          </label>
        )}
      </section>

      <div className="sq-send">
        {message && <p className="sq-alert" role="alert">{message}</p>}
        <button type="submit" className="da-btn da-btn--primary sq-submit" disabled={pending || uploading !== null}>
          {pending ? "Wird abgeschickt …" : "Fragebogen abschicken"}
        </button>
        <p className="sq-meta">
          Was mit euren Angaben geschieht, steht in der <a href="/datenschutzerklaerung" target="_blank" rel="noopener noreferrer">Datenschutzerklärung</a>.
        </p>
      </div>
    </form>
  );
}
