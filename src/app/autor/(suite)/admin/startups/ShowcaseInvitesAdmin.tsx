"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { unwrapAction } from "@/lib/actionResult";
import { formatDecisionTime } from "@/lib/articles/preview";
import {
  applyShowcaseLogo,
  applyShowcaseProfile,
  inviteToShowcase,
  sendShowcaseInvite,
  withdrawShowcaseInvite,
} from "@/lib/showcase/adminActions";
import { createShowcaseDraft, sendShowcaseDraftReady } from "@/lib/showcase/draftActions";
import type { AdminSubmission, InvitableStartup } from "@/lib/showcase/inviteApi";
import { KIT_PATH } from "@/lib/showcase/kit";
import {
  PROFILE_LABELS,
  QUESTIONS,
  SHOWCASE_INVITE_PATH,
  formatLongDate,
  profileFromStartup,
  profileValueLabel,
  type ProfileValues,
} from "@/lib/showcase/questionnaire";

// Verwaltung der Showcase-Einladungen (S3a): einladen, Link weitergeben,
// erinnern, zurueckziehen; eingereichte Frageboegen ansehen, Profil und Logo
// uebernehmen. Seit S3b: Entwurf des Beitrags erzeugen (KI), dem Unternehmen
// zur Freigabe schicken und die Rueckmeldung lesen.
//
// Gestaltung: Liste mit Linien, keine Karten. Eine Einreichung klappt auf.

type Props = {
  submissions: AdminSubmission[];
  startups: InvitableStartup[];
  siteUrl: string;
};

function dayTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("de-CH", {
    timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function stateText(s: AdminSubmission): string {
  if (s.state === "submitted") return `Eingereicht am ${dayTime(s.submitted_at)}`;
  if (s.state === "withdrawn") return "Zurückgezogen";
  if (s.state === "expired") return `Abgelaufen am ${formatLongDate(s.expires_at)}`;
  return s.reply_by ? `Offen, Antwort bis ${formatLongDate(s.reply_by)}` : "Offen";
}

const ARTICLE_STATUS: Record<string, string> = { draft: "Entwurf", in_review: "In Review", published: "Publiziert", archived: "Archiviert" };

// Eine Zeile zum Stand des Beitrags, fuer die Liste.
function draftSummary(s: AdminSubmission): string {
  const d = s.draft;
  if (!d) return "Beitrag: noch kein Entwurf";
  if (d.status === "published") return `Beitrag publiziert am ${dayTime(d.publishedAt)}`;
  if (d.approval.kind === "approved") return d.approval.stale ? "Beitrag: freigegeben, seither geändert" : "Beitrag: vom Unternehmen freigegeben";
  if (d.approval.kind === "changes") return "Beitrag: Unternehmen wünscht Änderungen";
  if (s.draft_ready_sent_at) return `Beitrag: zur Freigabe gesendet am ${dayTime(s.draft_ready_sent_at)}`;
  return "Beitrag: Entwurf erstellt, noch nicht gesendet";
}

function mailText(s: AdminSubmission): string {
  if (!s.invite_sent_at) return "Mail noch nicht gesendet";
  const sent = `Mail gesendet am ${dayTime(s.invite_sent_at)}`;
  return s.reminded_at ? `${sent}, erinnert am ${dayTime(s.reminded_at)}` : sent;
}

export default function ShowcaseInvitesAdmin({ submissions, startups, siteUrl }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [startupId, setStartupId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [replyBy, setReplyBy] = useState("");
  const [sendMail, setSendMail] = useState(false);

  const openInvites = new Set(submissions.filter((s) => s.state === "open").map((s) => s.startup_id));

  function run(work: () => Promise<string | null>) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const text = await work();
        if (text) setNotice(text);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Das hat nicht geklappt.");
      }
    });
  }

  function onInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!startupId) {
      setError("Bitte ein Unternehmen wählen.");
      return;
    }
    run(async () => {
      const res = unwrapAction(await inviteToShowcase(startupId, { name, email, replyBy, sendMail }));
      setStartupId("");
      setName("");
      setEmail("");
      setSendMail(false);
      if (res.mailSent === true) return "Einladung angelegt und Mail gesendet.";
      if (res.mailSent === false) return "Einladung angelegt. Die Mail liess sich nicht senden, bitte nochmals versuchen.";
      return "Einladung angelegt. Den Link kannst du kopieren oder die Mail senden.";
    });
  }

  async function copyLink(s: AdminSubmission) {
    try {
      await navigator.clipboard.writeText(`${siteUrl}${SHOWCASE_INVITE_PATH}/${s.token}`);
      setCopied(s.id);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Der Link liess sich nicht kopieren.");
    }
  }

  return (
    <section id="showcase" className="sia">
      <style>{`
        .sia { margin-top: 56px; border-top: 1px solid var(--da-border); padding-top: 28px; }
        .sia-h2 { color: var(--da-text); font-family: var(--da-font-display); font-size: 22px; font-weight: 700; margin: 0 0 6px; }
        .sia-sub { color: var(--da-muted); font-size: 14px; line-height: 1.55; margin: 0 0 24px; max-width: 76ch; }
        .sia-form { display: grid; grid-template-columns: 1.3fr 1fr 1.2fr 0.9fr; gap: 12px 14px; align-items: end; margin-bottom: 10px; }
        .sia-form label { display: grid; gap: 5px; color: var(--da-muted); font-size: 12.5px; min-width: 0; }
        .sia-form input, .sia-form select {
          background: var(--da-dark); color: var(--da-text); border: 1px solid var(--da-border);
          border-radius: 4px; padding: 0 11px; height: 40px; font-size: 14px; min-width: 0; width: 100%;
        }
        .sia-row2 { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-bottom: 26px; }
        .sia-check { display: inline-flex; align-items: center; gap: 8px; color: var(--da-text-strong); font-size: 14px; cursor: pointer; }
        .sia-check input { accent-color: var(--da-green); width: 16px; height: 16px; }
        .sia-btn {
          background: transparent; color: var(--da-text); border: 1px solid var(--da-border);
          padding: 8px 14px; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap;
        }
        .sia-btn:hover:not(:disabled) { border-color: var(--da-muted); }
        .sia-btn:disabled { opacity: 0.5; cursor: default; }
        .sia-btn--primary { background: var(--da-green); color: var(--da-dark); border-color: var(--da-green); }
        .sia-btn--quiet { border-color: transparent; color: var(--da-muted); padding-left: 0; padding-right: 0; text-decoration: underline; text-underline-offset: 3px; }
        .sia-btn--quiet:hover:not(:disabled) { color: var(--da-text); border-color: transparent; }
        .sia-msg { font-size: 14px; margin: 0 0 16px; }
        .sia-msg--err { color: #ff8e8e; }
        .sia-msg--ok { color: var(--da-green); }
        .sia-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--da-border); }
        .sia-item { border-bottom: 1px solid var(--da-border-soft); padding: 16px 0; }
        .sia-item:last-child { border-bottom-color: var(--da-border); }
        .sia-top { display: grid; grid-template-columns: 280px minmax(0, 1fr) auto; gap: 8px 24px; align-items: start; }
        .sia-name { color: var(--da-text); font-size: 15px; font-weight: 600; }
        .sia-who { color: var(--da-muted); font-size: 13px; margin-top: 2px; overflow-wrap: anywhere; }
        .sia-state { color: var(--da-text-strong); font-size: 14px; }
        .sia-state--done { color: var(--da-green); }
        .sia-state--off { color: var(--da-muted-soft); }
        .sia-mail { color: var(--da-muted-soft); font-size: 12.5px; margin-top: 2px; }
        .sia-actions { display: flex; gap: 0 18px; flex-wrap: wrap; justify-content: flex-end; }
        .sia-actions .sia-btn--quiet { padding-top: 2px; padding-bottom: 2px; }
        .sia-detail { margin-top: 18px; padding: 4px 0 6px 18px; border-left: 2px solid var(--da-border); display: grid; gap: 22px; }
        .sia-h3 { color: var(--da-text); font-size: 14px; font-weight: 700; margin: 0 0 8px; }
        .sia-qa { margin: 0 0 14px; }
        .sia-qa dt { color: var(--da-muted); font-size: 13px; margin-bottom: 3px; }
        .sia-qa dd { color: var(--da-text-strong); font-size: 14.5px; line-height: 1.6; margin: 0; white-space: pre-wrap; max-width: 78ch; }
        .sia-changes { border-collapse: collapse; font-size: 14px; margin-bottom: 12px; }
        .sia-changes th { color: var(--da-muted-soft); font-weight: 400; font-size: 12.5px; text-align: left; padding: 0 24px 6px 0; }
        .sia-changes td { padding: 5px 24px 5px 0; color: var(--da-text-strong); vertical-align: top; }
        .sia-changes td:first-child { color: var(--da-muted); }
        .sia-changes s { color: var(--da-muted-soft); }
        .sia-media { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
        .sia-thumb { position: relative; width: 150px; height: 96px; border: 1px solid var(--da-border); background: var(--da-darker); overflow: hidden; display: block; }
        .sia-thumb--logo { width: 96px; background: #fff; }
        .sia-note { color: var(--da-muted); font-size: 13px; line-height: 1.5; margin: 6px 0 0; }
        .sia-empty { color: var(--da-muted); font-size: 14px; margin: 0; padding: 16px 0; }
        .sia-line { color: var(--da-text-strong); font-size: 14.5px; line-height: 1.6; margin: 0 0 8px; max-width: 78ch; }
        .sia-line a { color: var(--da-green); text-decoration: underline; text-underline-offset: 3px; }
        .sia-line strong { color: var(--da-text); font-weight: 600; }
        .sia-state-line { margin: 0 0 12px; padding: 2px 0 2px 14px; border-left: 2px solid var(--da-border); color: var(--da-text-strong); font-size: 14px; line-height: 1.55; max-width: 78ch; }
        .sia-state-line--ok { border-left-color: var(--da-green); }
        .sia-state-line--warn { border-left-color: var(--da-orange); }
        .sia-state-line span { display: block; white-space: pre-wrap; color: var(--da-muted); margin-top: 4px; }
        .sia-hints { margin: 0 0 14px; padding: 0 0 0 18px; list-style: disc; color: var(--da-text-strong); font-size: 13.5px; line-height: 1.55; max-width: 78ch; }
        .sia-hints li::marker { color: var(--da-muted-soft); }
        .sia-hints li { margin-bottom: 4px; }
        .sia-btns { display: flex; gap: 10px 18px; flex-wrap: wrap; align-items: center; }
        .sia-posts { margin-top: 14px; }
        .sia-posts summary { color: var(--da-muted); font-size: 13px; cursor: pointer; }
        .sia-posts p { color: var(--da-text-strong); font-size: 14px; line-height: 1.6; margin: 12px 0 0; white-space: pre-wrap; max-width: 78ch; padding-left: 14px; border-left: 2px solid var(--da-border); }
        @media (max-width: 1100px) {
          .sia-form { grid-template-columns: 1fr 1fr; }
          .sia-top { grid-template-columns: minmax(0, 1fr); }
          .sia-actions { justify-content: flex-start; }
        }
      `}</style>

      <h2 className="sia-h2">Showcase: Einladungen und Fragebögen</h2>
      <p className="sia-sub">
        Ein eingeladenes Unternehmen bekommt einen Link zum Fragebogen, ohne Login. Es beantwortet die Fragen, lädt Logo und Bild hoch und bestätigt seine Profildaten. Die Mail folgt dem Text der Gründungsrunde; mit «Test an mich» siehst du sie vorher.
      </p>

      <form onSubmit={onInvite}>
        <div className="sia-form">
          <label>
            Unternehmen
            <select value={startupId} onChange={(e) => setStartupId(e.target.value)}>
              <option value="">Bitte wählen</option>
              {startups.map((s) => (
                <option key={s.id} value={s.id} disabled={openInvites.has(s.id)}>
                  {s.name}
                  {s.hasOwnInterest ? " (eigene Interessenbindung)" : ""}
                  {openInvites.has(s.id) ? " (schon eingeladen)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Name der Kontaktperson
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vorname Nachname" />
          </label>
          <label>
            E-Mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@firma.ch" />
          </label>
          <label>
            Antwort bis
            <input type="date" value={replyBy} onChange={(e) => setReplyBy(e.target.value)} />
          </label>
        </div>
        <div className="sia-row2">
          <label className="sia-check">
            <input type="checkbox" checked={sendMail} onChange={(e) => setSendMail(e.target.checked)} />
            Mail gleich senden
          </label>
          <button type="submit" className="sia-btn sia-btn--primary" disabled={pending}>
            Einladen
          </button>
        </div>
      </form>

      {error && <p className="sia-msg sia-msg--err" role="alert">{error}</p>}
      {notice && <p className="sia-msg sia-msg--ok" role="status">{notice}</p>}

      {submissions.length === 0 ? (
        <p className="sia-empty">Noch keine Einladungen.</p>
      ) : (
        <ul className="sia-list">
          {submissions.map((s) => {
            const company = s.startup?.name ?? "Unbekanntes Unternehmen";
            const open = s.state === "open";
            const submitted = s.state === "submitted";
            const canMail = open && !!s.invitee_email && !!s.invitee_name && !!s.reply_by;
            return (
              <li key={s.id} className="sia-item">
                <div className="sia-top">
                  <div>
                    <div className="sia-name">{company}</div>
                    <div className="sia-who">
                      {[s.contact_name ?? s.invitee_name, s.contact_email ?? s.invitee_email].filter(Boolean).join(", ") || "ohne Kontaktperson"}
                    </div>
                  </div>
                  <div>
                    <div className={`sia-state${submitted ? " sia-state--done" : open ? "" : " sia-state--off"}`}>{stateText(s)}</div>
                    {!submitted && s.state !== "withdrawn" && <div className="sia-mail">{mailText(s)}</div>}
                    {submitted && <div className="sia-mail">{draftSummary(s)}</div>}
                  </div>
                  <div className="sia-actions">
                    {open && (
                      <>
                        <button type="button" className="sia-btn sia-btn--quiet" onClick={() => copyLink(s)}>
                          {copied === s.id ? "Kopiert" : "Link kopieren"}
                        </button>
                        <button
                          type="button"
                          className="sia-btn sia-btn--quiet"
                          disabled={pending || !canMail}
                          title={canMail ? undefined : "Dafür braucht es Name, E-Mail und «Antwort bis»."}
                          onClick={() =>
                            run(async () => {
                              const res = unwrapAction(await sendShowcaseInvite(s.id, s.invite_sent_at ? "reminder" : "invite"));
                              return `${s.invite_sent_at ? "Erinnerung" : "Einladung"} gesendet an ${res.to}.`;
                            })
                          }
                        >
                          {s.invite_sent_at ? "Erinnern" : "Einladung senden"}
                        </button>
                        <button
                          type="button"
                          className="sia-btn sia-btn--quiet"
                          disabled={pending || !s.invitee_name || !s.reply_by}
                          title={s.invitee_name && s.reply_by ? undefined : "Dafür braucht es Name und «Antwort bis»."}
                          onClick={() =>
                            run(async () => {
                              const res = unwrapAction(await sendShowcaseInvite(s.id, "test"));
                              return `Test gesendet an ${res.to}.`;
                            })
                          }
                        >
                          Test an mich
                        </button>
                        <button
                          type="button"
                          className="sia-btn sia-btn--quiet"
                          disabled={pending}
                          onClick={() => {
                            if (!confirm(`Einladung für ${company} zurückziehen? Der Link funktioniert danach nicht mehr.`)) return;
                            run(async () => {
                              unwrapAction(await withdrawShowcaseInvite(s.id));
                              return "Einladung zurückgezogen.";
                            });
                          }}
                        >
                          Zurückziehen
                        </button>
                      </>
                    )}
                    {submitted && (
                      <button type="button" className="sia-btn" onClick={() => setOpenId(openId === s.id ? null : s.id)}>
                        {openId === s.id ? "Schliessen" : "Ansehen"}
                      </button>
                    )}
                  </div>
                </div>
                {submitted && openId === s.id && <Detail s={s} pending={pending} run={run} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Detail({
  s,
  pending,
  run,
}: {
  s: AdminSubmission;
  pending: boolean;
  run: (work: () => Promise<string | null>) => void;
}) {
  const answers = (s.answers ?? {}) as Record<string, string>;
  const links = Array.isArray(s.links) ? (s.links as string[]) : [];
  const changes = (s.profile_changes ?? {}) as Partial<Record<keyof ProfileValues, unknown>>;
  const changeKeys = (Object.keys(changes) as (keyof ProfileValues)[]).filter((k) => k in PROFILE_LABELS);
  const current = s.startup ? profileFromStartup(s.startup) : null;

  return (
    <div className="sia-detail">
      <DraftBlock s={s} pending={pending} run={run} />

      <div>
        <h3 className="sia-h3">Kontakt</h3>
        <p className="sia-note" style={{ margin: 0, color: "var(--da-text-strong)" }}>
          {s.contact_name}, {s.contact_role} · {s.contact_email}
        </p>
      </div>

      <div>
        <h3 className="sia-h3">{s.own_text ? "Eigener Text" : "Antworten"}</h3>
        {s.own_text ? (
          <dl className="sia-qa">
            <dd>{s.own_text}</dd>
          </dl>
        ) : (
          QUESTIONS.map((q) => (
            <dl className="sia-qa" key={q.key}>
              <dt>{q.label}</dt>
              <dd>{answers[q.key] ?? "–"}</dd>
            </dl>
          ))
        )}
        {answers.quote && (
          <dl className="sia-qa">
            <dt>Zitat</dt>
            <dd>
              «{answers.quote}» {answers.quote_by}
            </dd>
          </dl>
        )}
        {links.length > 0 && (
          <dl className="sia-qa">
            <dt>Links</dt>
            <dd>{links.join("\n")}</dd>
          </dl>
        )}
      </div>

      {(s.logoUrl || s.imageUrl) && (
        <div>
          <h3 className="sia-h3">Logo und Bild</h3>
          <div className="sia-media">
            {s.logoUrl && (
              <div>
                <a className="sia-thumb sia-thumb--logo" href={s.logoUrl} target="_blank" rel="noopener noreferrer">
                  <Image src={s.logoUrl} alt="Logo" fill sizes="96px" style={{ objectFit: "contain" }} unoptimized />
                </a>
                <p className="sia-note">
                  {s.logo_applied_at ? `Als Profil-Logo übernommen am ${dayTime(s.logo_applied_at)}.` : "Noch nicht im Profil."}
                </p>
                <button
                  type="button"
                  className="sia-btn"
                  style={{ marginTop: 8 }}
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      unwrapAction(await applyShowcaseLogo(s.id));
                      return "Logo ins Profil übernommen.";
                    })
                  }
                >
                  {s.logo_applied_at ? "Logo nochmals übernehmen" : "Logo ins Profil übernehmen"}
                </button>
              </div>
            )}
            {s.imageUrl && (
              <div>
                <a className="sia-thumb" href={s.imageUrl} target="_blank" rel="noopener noreferrer">
                  <Image src={s.imageUrl} alt="Bild" fill sizes="150px" style={{ objectFit: "cover" }} unoptimized />
                </a>
                <p className="sia-note">Bild für den Beitrag.</p>
              </div>
            )}
          </div>
          <p className="sia-note">{s.consent_media_rights ? "Rechte an Logo und Bild bestätigt." : "Rechte nicht bestätigt."}</p>
        </div>
      )}

      <div>
        <h3 className="sia-h3">Profildaten</h3>
        {changeKeys.length === 0 ? (
          <p className="sia-note" style={{ margin: "0 0 12px" }}>Das Unternehmen hat die Profildaten ohne Änderung bestätigt.</p>
        ) : (
          <table className="sia-changes">
            <thead>
              <tr>
                <th>Feld</th>
                <th>Heute</th>
                <th>Vorschlag</th>
              </tr>
            </thead>
            <tbody>
              {changeKeys.map((k) => (
                <tr key={k}>
                  <td>{PROFILE_LABELS[k]}</td>
                  <td>
                    <s>{current ? profileValueLabel(k, current[k]) : "–"}</s>
                  </td>
                  <td>{profileValueLabel(k, changes[k])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button
          type="button"
          className="sia-btn"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const res = unwrapAction(await applyShowcaseProfile(s.id));
              const parts = [res.applied.length > 0 ? `Übernommen: ${res.applied.join(", ")}.` : "Daten als bestätigt markiert."];
              if (res.rejected.length > 0) parts.push(`Nicht übernommen (ungültig): ${res.rejected.join(", ")}.`);
              return parts.join(" ");
            })
          }
        >
          {changeKeys.length > 0 ? "Änderungen übernehmen und als bestätigt markieren" : "Als bestätigt markieren"}
        </button>
        <p className="sia-note">
          {s.profile_applied_at
            ? `Übernommen am ${dayTime(s.profile_applied_at)}. Nach dem Übernehmen zeigt die Tabelle nur noch, was vom heutigen Stand abweicht.`
            : "Setzt im Verzeichnis «Daten bestätigt» auf heute."}
        </p>
      </div>

      <div>
        <h3 className="sia-h3">Einverständnis</h3>
        <p className="sia-note" style={{ margin: 0 }}>
          Profildaten bestätigt, Kennzeichnung als Unternehmensbeitrag zur Kenntnis genommen.{" "}
          {s.consent_contact_email
            ? `Kontaktanfragen werden an ${s.consent_contact_email} weitergeleitet (im Profil aktiv).`
            : "Keine Kontaktweiterleitung gewünscht."}
        </p>
      </div>
    </div>
  );
}

// Beitrag zur Einreichung (S3b): Entwurf erzeugen, Hinweise lesen, zur
// Freigabe schicken, Rueckmeldung sehen. Publiziert wird im Editor.
function DraftBlock({
  s,
  pending,
  run,
}: {
  s: AdminSubmission;
  pending: boolean;
  run: (work: () => Promise<string | null>) => void;
}) {
  const d = s.draft;
  const notes = Array.isArray(s.draft_notes) ? (s.draft_notes as unknown[]).filter((n): n is string => typeof n === "string") : [];
  const posts = Array.isArray(s.linkedin_texts) ? (s.linkedin_texts as unknown[]).filter((n): n is string => typeof n === "string") : [];

  if (!d) {
    return (
      <div>
        <h3 className="sia-h3">Beitrag</h3>
        <p className="sia-line">
          Noch kein Entwurf.{" "}
          {s.own_text
            ? "Der eigene Text des Unternehmens wird unverändert übernommen. Die KI schlägt dazu Titel, Abstract und drei LinkedIn-Texte vor."
            : "Die KI schreibt aus den Antworten einen Beitrag mit Titel, Abstract und drei LinkedIn-Texten. Sie verwendet nur, was in den Antworten steht."}
        </p>
        <button
          type="button"
          className="sia-btn sia-btn--primary"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const res = unwrapAction(await createShowcaseDraft(s.id));
              if (!res.created) return "Es gibt schon einen Entwurf zu dieser Einreichung.";
              const parts = [res.aiOk ? "Entwurf erstellt." : "Entwurf ohne KI erstellt (siehe Hinweise)."];
              if (res.authorCreated) parts.push(`${s.contact_name ?? "Die Kontaktperson"} ist als Autorin oder Autor angelegt.`);
              if (res.notes.length > 0) parts.push(`${res.notes.length} ${res.notes.length === 1 ? "Hinweis" : "Hinweise"} zum Durchsehen.`);
              return parts.join(" ");
            })
          }
        >
          {pending ? "Bitte warten …" : "Entwurf erzeugen"}
        </button>
        <p className="sia-note">
          Das dauert bis zu zwei Minuten. {s.contact_name ?? "Die Kontaktperson"} wird als Autorin oder Autor des Beitrags geführt
          {s.imageUrl && s.consent_media_rights ? ", das Bild des Unternehmens als Titelbild gesetzt" : ""}.
        </p>
      </div>
    );
  }

  const published = d.status === "published";
  const a = d.approval;
  return (
    <div>
      <h3 className="sia-h3">Beitrag</h3>
      <p className="sia-line">
        <strong>«{d.title}»</strong> · {ARTICLE_STATUS[d.status] ?? d.status} ·{" "}
        <a href={`/autor/artikel/${d.articleId}`}>Im Editor öffnen</a>
        {d.path && (
          <>
            {" · "}
            <a href={d.path} target="_blank" rel="noopener">Ansehen</a>
          </>
        )}
      </p>

      {published ? (
        <p className="sia-state-line sia-state-line--ok">
          Publiziert am {dayTime(d.publishedAt)}.{" "}
          {s.online_sent_at
            ? `«Beitrag ist online» mit den Texten zum Teilen ging am ${dayTime(s.online_sent_at)} an ${s.contact_email}.`
            : "Die Mail «Beitrag ist online» ist nicht verschickt worden."}{" "}
          <a href={`${KIT_PATH}/${s.kit_token}`} target="_blank" rel="noopener">Teilen-Paket öffnen</a>
          {s.report_sent_at ? ` · Bericht nach 30 Tagen versandt am ${dayTime(s.report_sent_at)}.` : ""}
        </p>
      ) : a.kind === "approved" ? (
        <p className={`sia-state-line ${a.stale ? "sia-state-line--warn" : "sia-state-line--ok"}`}>
          Freigegeben am {formatDecisionTime(a.at)} von {a.by}.{" "}
          {a.stale
            ? "Der Beitrag wurde seither geändert. Nochmals senden, oder im Editor im Tab «Vorschau» die Freigabe für diese Fassung bestätigen (nur bei Kleinigkeiten)."
            : "Du kannst den Beitrag im Editor publizieren."}
          {a.note && <span>{a.note}</span>}
        </p>
      ) : a.kind === "changes" ? (
        <p className="sia-state-line sia-state-line--warn">
          Änderungen gewünscht am {formatDecisionTime(a.at)} von {a.by}.{" "}
          {a.stale ? "Seither überarbeitet: bitte nochmals senden." : "Im Editor überarbeiten, dann nochmals senden."}
          {a.note && <span>{a.note}</span>}
        </p>
      ) : (
        <p className="sia-state-line">
          {s.draft_ready_sent_at
            ? `Zur Freigabe gesendet am ${dayTime(s.draft_ready_sent_at)} an ${s.contact_email}. Noch keine Rückmeldung.`
            : "Noch nicht beim Unternehmen. Bitte zuerst im Editor durchsehen. Publizieren geht erst nach der Freigabe."}
        </p>
      )}

      {!published && notes.length > 0 && (
        <>
          <p className="sia-note" style={{ margin: "0 0 6px" }}>Hinweise zum Entwurf:</p>
          <ul className="sia-hints">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </>
      )}

      {!published && (
        <>
          <div className="sia-btns">
            <button
              type="button"
              className={`sia-btn${a.kind === "approved" && !a.stale ? "" : " sia-btn--primary"}`}
              disabled={pending || d.missing.length > 0}
              title={d.missing.length > 0 ? `Fehlt noch im Editor: ${d.missing.join(", ")}` : undefined}
              onClick={() => {
                if (!confirm(`Entwurf «${d.title}» an ${s.contact_email} zur Freigabe senden?`)) return;
                run(async () => {
                  const res = unwrapAction(await sendShowcaseDraftReady(s.id, "send"));
                  return `Entwurf zur Freigabe gesendet an ${res.to}.`;
                });
              }}
            >
              {s.draft_ready_sent_at ? "Nochmals zur Freigabe senden" : "Zur Freigabe senden"}
            </button>
            <button
              type="button"
              className="sia-btn sia-btn--quiet"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const res = unwrapAction(await sendShowcaseDraftReady(s.id, "test"));
                  return `Test gesendet an ${res.to}.`;
                })
              }
            >
              Test an mich
            </button>
          </div>
          {d.missing.length > 0 && (
            <p className="sia-note">
              Vor dem Senden im Editor ergänzen: {d.missing.join(", ")}. {d.missing.length === 1 ? "Das gehört" : "Beides gehört"} zur Fassung, die das Unternehmen freigibt.
            </p>
          )}
          {d.linkExpired && <p className="sia-note">Der bisherige Vorschau-Link ist abgelaufen. Beim Senden entsteht ein neuer.</p>}
        </>
      )}

      {posts.length > 0 && (
        <details className="sia-posts">
          <summary>
            {posts.length === 1 ? "Ein LinkedIn-Text" : `${posts.length} LinkedIn-Texte`} für das Unternehmen (gehen mit «Beitrag ist online» mit)
          </summary>
          {posts.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </details>
      )}
    </div>
  );
}
