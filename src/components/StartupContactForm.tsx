"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { sendStartupContact } from "@/lib/startupContact/actions";
import { CONTACT_PURPOSES, MESSAGE_MAX } from "@/lib/startupContact/validate";

// «Kontakt aufnehmen» auf der Startup-Seite. Erscheint nur, wenn das Startup
// der Weiterleitung zugestimmt hat (startup_contacts). Knopf in der CTA-Zeile,
// das Formular klappt darunter auf (volle Breite).

type Props = { startupSlug: string; startupName: string };

type Fields = { name: string; email: string; organization: string; purpose: string; message: string; consent: boolean };

const EMPTY: Fields = { name: "", email: "", organization: "", purpose: "", message: "", consent: false };

export default function StartupContactForm({ startupSlug, startupName }: Props) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(0);
  const [f, setF] = useState<Fields>(EMPTY);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const id = useId();

  function toggle() {
    if (!open) setOpenedAt(Date.now());
    setOpen((o) => !o);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setErrors({});
    start(async () => {
      const res = await sendStartupContact({ startupSlug, ...f, website, openedAt });
      if (res.ok) {
        setDone(true);
        setF(EMPTY);
      } else {
        setErrors(res.fieldErrors ?? {});
        setMessage(res.message);
      }
    });
  }

  const err = (k: string) =>
    errors[k] ? <p id={`${id}-${k}-err`} className="sc-err">{errors[k]}</p> : null;
  const aria = (k: string) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${id}-${k}-err` } : {});

  return (
    <>
      <style>{`
        .sc-toggle {
          background: none; color: var(--da-text); border: 1px solid var(--da-border);
          font-size: 14px; font-weight: 700; padding: 13px 28px; border-radius: var(--r-sm);
          cursor: pointer; font-family: inherit;
        }
        .sc-toggle:hover, .sc-toggle[aria-expanded="true"] { border-color: var(--da-green); color: var(--da-green); }
        .sc-panel {
          flex-basis: 100%; margin-top: 8px; background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: var(--r-lg); padding: 24px;
        }
        .sc-title { color: var(--da-text); font-family: var(--da-font-display); font-size: 18px; font-weight: 700; margin: 0 0 6px; }
        .sc-lead { color: var(--da-muted); font-size: 14px; line-height: 1.6; margin: 0 0 18px; }
        .sc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; }
        .sc-full { grid-column: 1 / -1; }
        .sc-label { display: block; color: var(--da-muted); font-size: 12px; font-weight: 600; margin-bottom: 6px; }
        .sc-input, .sc-select, .sc-textarea {
          width: 100%; box-sizing: border-box; background: var(--da-dark); color: var(--da-text);
          border: 1px solid var(--da-border); border-radius: 6px; padding: 11px 12px; font-size: 15px; font-family: inherit;
        }
        .sc-input:focus, .sc-select:focus, .sc-textarea:focus { outline: none; border-color: var(--da-green); }
        .sc-input[aria-invalid="true"], .sc-select[aria-invalid="true"], .sc-textarea[aria-invalid="true"] { border-color: #ff6b6b; }
        .sc-textarea { min-height: 140px; resize: vertical; line-height: 1.55; }
        .sc-count { color: var(--da-faint); font-size: 11px; font-family: var(--da-font-mono); text-align: right; margin-top: 4px; }
        .sc-check { display: flex; gap: 10px; align-items: flex-start; color: var(--da-muted); font-size: 13px; line-height: 1.55; }
        .sc-check input { margin-top: 3px; accent-color: var(--da-green); width: 16px; height: 16px; flex-shrink: 0; }
        .sc-check a { color: var(--da-green); }
        .sc-err { color: #ff8e8e; font-size: 12px; margin: 4px 0 0; }
        .sc-alert { color: #ff8e8e; font-size: 13px; margin: 0; }
        .sc-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 18px; }
        .sc-submit {
          background: var(--da-green); color: var(--da-dark); border: none; border-radius: var(--r-sm);
          padding: 12px 24px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit;
        }
        .sc-submit:disabled { opacity: 0.6; cursor: wait; }
        .sc-hp { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
        .sc-done { color: var(--da-text); font-size: 15px; line-height: 1.6; margin: 0; }
        .sc-done strong { color: var(--da-green); }
        @media (max-width: 640px) {
          .sc-grid { grid-template-columns: 1fr; }
          .sc-panel { padding: 18px; }
        }
      `}</style>

      <button type="button" className="sc-toggle" aria-expanded={open} aria-controls={`${id}-panel`} onClick={toggle}>
        Kontakt aufnehmen
      </button>

      {open && (
        <div id={`${id}-panel`} className="sc-panel">
          {done ? (
            <p className="sc-done" role="status">
              <strong>Danke!</strong> Deine Nachricht ist unterwegs zu {startupName}. Die Antwort kommt direkt von dort an
              deine E-Mail-Adresse.
            </p>
          ) : (
            <form onSubmit={submit} noValidate>
              <p className="sc-title">Nachricht an {startupName}</p>
              <p className="sc-lead">
                Wir leiten deine Nachricht per E-Mail an {startupName} weiter, das Startup antwortet dir direkt.
                digital age speichert den Inhalt nicht.
              </p>
              <div className="sc-grid">
                <div>
                  <label className="sc-label" htmlFor={`${id}-name`}>Name *</label>
                  <input id={`${id}-name`} className="sc-input" autoComplete="name" maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} {...aria("name")} />
                  {err("name")}
                </div>
                <div>
                  <label className="sc-label" htmlFor={`${id}-email`}>E-Mail *</label>
                  <input id={`${id}-email`} className="sc-input" type="email" autoComplete="email" maxLength={255} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} {...aria("email")} />
                  {err("email")}
                </div>
                <div>
                  <label className="sc-label" htmlFor={`${id}-org`}>Organisation</label>
                  <input id={`${id}-org`} className="sc-input" autoComplete="organization" maxLength={200} value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} {...aria("organization")} />
                  {err("organization")}
                </div>
                <div>
                  <label className="sc-label" htmlFor={`${id}-purpose`}>Anliegen *</label>
                  <select id={`${id}-purpose`} className="sc-select" value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} {...aria("purpose")}>
                    <option value="">Bitte wählen</option>
                    {CONTACT_PURPOSES.map((p) => (
                      <option key={p.code} value={p.code}>{p.label}</option>
                    ))}
                  </select>
                  {err("purpose")}
                </div>
                <div className="sc-full">
                  <label className="sc-label" htmlFor={`${id}-msg`}>Nachricht *</label>
                  <textarea id={`${id}-msg`} className="sc-textarea" maxLength={MESSAGE_MAX} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} {...aria("message")} />
                  <p className="sc-count">{f.message.length} / {MESSAGE_MAX}</p>
                  {err("message")}
                </div>
                <div className="sc-full">
                  <label className="sc-check">
                    <input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} {...aria("consent")} />
                    <span>
                      Ich bin einverstanden, dass digital age meinen Namen, meine E-Mail-Adresse, meine Organisation und
                      meine Nachricht an {startupName} weiterleitet. Mehr in der{" "}
                      <Link href="/datenschutzerklaerung">Datenschutzerklärung</Link>.
                    </span>
                  </label>
                  {err("consent")}
                </div>
              </div>
              {/* Honeypot: fuer Menschen unsichtbar, Bots fuellen es aus. */}
              <div className="sc-hp" aria-hidden="true">
                <label>
                  Website
                  <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </label>
              </div>
              <div className="sc-actions">
                <button type="submit" className="sc-submit" disabled={pending}>
                  {pending ? "Senden…" : "Nachricht senden"}
                </button>
                {message && <p className="sc-alert" role="alert">{message}</p>}
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}
