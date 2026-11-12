"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unwrapAction } from "@/lib/actionResult";
import { endStartupContact, saveStartupContact } from "@/lib/startupContact/actions";
import { purposeLabel, isContactPurpose } from "@/lib/startupContact/validate";

// Admin: Kontakt fuer Anfragen pflegen (nur mit Einverstaendnis des Startups)
// und die Anfragen sehen — nur Metadaten, nie den Inhalt (Entscheid Ali).

export type ContactView = {
  startupId: string;
  email: string;
  consentAt: string;
  consentSource: "submission" | "editor";
  consentNote: string | null;
  revokedAt: string | null;
};

export type RequestView = {
  id: string;
  startupId: string;
  startupName: string;
  purpose: string;
  delivered: boolean;
  createdAt: string;
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("de-CH", {
    timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function label(code: string): string {
  return isContactPurpose(code) ? purposeLabel(code) : code;
}

export function contactBadge(c: ContactView | undefined): string | null {
  if (!c) return null;
  return c.revokedAt ? "Kontakt beendet" : "Kontakt aktiv";
}

export function ContactModal({
  startup,
  contact,
  requests,
  onClose,
}: {
  startup: { id: string; name: string };
  contact: ContactView | undefined;
  requests: RequestView[];
  onClose: () => void;
}) {
  const router = useRouter();
  const active = contact && !contact.revokedAt;
  const [email, setEmail] = useState(contact?.email ?? "");
  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      try {
        unwrapAction(await saveStartupContact(startup.id, { email, consentConfirmed: consent, note }));
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function end() {
    if (!window.confirm(`Weiterleitung für «${startup.name}» beenden? Das Formular verschwindet von der Startup-Seite.`)) return;
    setError(null);
    start(async () => {
      try {
        unwrapAction(await endStartupContact(startup.id));
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Beenden fehlgeschlagen.");
      }
    });
  }

  const own = requests.filter((r) => r.startupId === startup.id);

  return (
    <div className="as-overlay" onClick={onClose}>
      <div className="as-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Kontakt für Anfragen: ${startup.name}`}>
        <h3>Kontakt für Anfragen</h3>
        <p className="meta">{startup.name}</p>

        <div className="as-modal__block">
          <p className="as-modal__label">Status</p>
          <div className="as-modal__body">
            {!contact && "Kein Kontakt hinterlegt. Das Formular «Kontakt aufnehmen» erscheint nicht."}
            {contact && active && (
              <>
                Aktiv: Anfragen gehen an {contact.email}. Einverständnis vom {fmt(contact.consentAt)} (
                {contact.consentSource === "submission" ? "Einreichformular" : "von der Redaktion eingetragen"}
                {contact.consentNote ? `: ${contact.consentNote}` : ""}).
              </>
            )}
            {contact && !active && contact.revokedAt && <>Beendet am {fmt(contact.revokedAt)}. Das Formular ist ausgeblendet.</>}
          </div>
        </div>

        <div className="as-modal__block">
          <label className="as-field-label" htmlFor="sca-email">Kontakt-E-Mail des Startups</label>
          <input id="sca-email" className="as-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@startup.ch" />
        </div>
        <div className="as-modal__block">
          <label className="as-field-label" htmlFor="sca-note">Woher das Einverständnis stammt (optional)</label>
          <input id="sca-note" className="as-input" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="z.B. Mail von Anna Muster vom 12.11.2026" />
        </div>
        <div className="as-modal__block">
          <label className="as-check-row">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            Das Startup hat ausdrücklich zugestimmt, dass wir Anfragen an diese Adresse weiterleiten.
          </label>
        </div>

        <div className="as-modal__block">
          <p className="as-modal__label">Anfragen ({own.length})</p>
          {own.length === 0 ? (
            <div className="as-modal__body">Noch keine.</div>
          ) : (
            <div className="as-modal__body">
              {own.slice(0, 20).map((r) => (
                <div key={r.id}>
                  {fmt(r.createdAt)} · {label(r.purpose)} · {r.delivered ? "zugestellt" : "nicht zugestellt"}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p role="alert" style={{ color: "#ff8e8e", fontSize: 13, margin: "0 0 8px" }}>{error}</p>}

        <div className="as-modal__actions">
          {active && (
            <button className="as-btn as-btn--danger" disabled={pending} onClick={end}>Weiterleitung beenden</button>
          )}
          <button className="as-btn" onClick={onClose}>Abbrechen</button>
          <button className="as-btn as-btn--ok" disabled={pending || !consent || email.trim() === ""} onClick={save}>
            {active ? "Adresse ändern" : "Weiterleitung einschalten"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContactRequestsSection({ requests }: { requests: RequestView[] }) {
  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ color: "var(--da-muted)", fontFamily: "var(--da-font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 10px" }}>
        Kontaktanfragen · ohne Inhalt
      </h2>
      {requests.length === 0 ? (
        <p style={{ color: "var(--da-muted)", fontSize: 13 }}>Noch keine Anfragen über «Kontakt aufnehmen».</p>
      ) : (
        <div className="as-table">
          <div className="as-req as-req--head">
            <span>Datum</span><span>Startup</span><span>Anliegen</span><span>Zustellung</span>
          </div>
          {requests.slice(0, 50).map((r) => (
            <div key={r.id} className="as-req">
              <span style={{ fontFamily: "var(--da-font-mono)", fontSize: 12 }}>{fmt(r.createdAt)}</span>
              <span>{r.startupName}</span>
              <span>{label(r.purpose)}</span>
              <span style={{ color: r.delivered ? "var(--da-green)" : "#ff8e8e" }}>{r.delivered ? "zugestellt" : "fehlgeschlagen"}</span>
            </div>
          ))}
        </div>
      )}
      <p style={{ color: "var(--da-muted-soft)", fontSize: 12, marginTop: 8 }}>
        Name, E-Mail und Nachricht der Absender werden nicht gespeichert, sie gehen nur per Mail ans Startup.
      </p>
    </section>
  );
}
