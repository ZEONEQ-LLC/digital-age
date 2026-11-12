"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unwrapAction } from "@/lib/actionResult";
import {
  ISSUE_STATUS_LABEL,
  INTRO_MAX,
  MAX_ITEMS,
  SUBJECT_MAX,
  TEASER_MAX,
  formatIssueDate,
  type IssueItem,
  type IssueStatus,
} from "@/lib/newsletter/issue";
import {
  createIssueNow,
  discardIssue,
  renderIssuePreview,
  saveIssue,
  sendIssueNow,
  sendTestIssue,
} from "@/lib/newsletter/issueActions";

// Admin «Newsletter-Ausgaben» (PR 195): offener Entwurf bearbeiten, Vorschau,
// Test an sich selbst, Freigabe; darunter der Verlauf.

export type IssueView = {
  id: string;
  status: IssueStatus;
  subject: string;
  intro: string;
  items: IssueItem[];
  periodFrom: string;
  periodTo: string;
  source: "cron" | "manual";
  aiNote: string | null;
  editedAt: string | null;
  testSentAt: string | null;
  sendStartedAt: string | null;
  sentAt: string | null;
  recipients: number | null;
  delivered: number;
  failed: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = { issues: IssueView[]; confirmedCount: number; candidates: IssueItem[] };

type Notice = { kind: "ok" | "err"; text: string } | null;

function dateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-CH", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich",
  });
}

const CSS = `
  .nl { display: flex; flex-direction: column; gap: 28px; }
  .nl-h2 { color: var(--da-muted); font-family: var(--da-font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 10px; }
  .nl-card { background: var(--da-card); border: 1px solid var(--da-border); border-radius: 8px; padding: 20px 22px; display: flex; flex-direction: column; gap: 18px; }
  .nl-meta { display: flex; gap: 8px 16px; flex-wrap: wrap; align-items: center; color: var(--da-muted); font-size: 12px; font-family: var(--da-font-mono); }
  .nl-chip { display: inline-block; font-family: var(--da-font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 7px; border-radius: 3px; color: var(--da-green); background: rgba(50,255,126,0.12); }
  .nl-chip--sending { color: var(--da-orange); background: rgba(255,140,66,0.12); }
  .nl-chip--sent { color: var(--da-muted); background: rgba(255,255,255,0.06); }
  .nl-field { display: flex; flex-direction: column; gap: 6px; }
  .nl-label { color: var(--da-text-strong); font-size: 13px; font-weight: 600; display: flex; justify-content: space-between; gap: 12px; }
  .nl-count { color: var(--da-muted-soft); font-family: var(--da-font-mono); font-size: 11px; font-weight: 400; }
  .nl-count--over { color: #ff8e8e; }
  .nl-input, .nl-textarea, .nl-select {
    background: var(--da-dark); color: var(--da-text); border: 1px solid var(--da-border); border-radius: 4px;
    padding: 9px 11px; font-size: 14px; font-family: inherit; box-sizing: border-box; width: 100%;
  }
  .nl-textarea { resize: vertical; line-height: 1.5; }
  .nl-input:focus, .nl-textarea:focus, .nl-select:focus { outline: none; border-color: var(--da-green); }
  .nl-input:disabled, .nl-textarea:disabled { opacity: 0.7; }
  .nl-items { display: flex; flex-direction: column; gap: 12px; }
  .nl-item { display: grid; grid-template-columns: 84px 1fr auto; gap: 14px; padding: 14px; border: 1px solid var(--da-border); border-radius: 6px; background: var(--da-dark); }
  .nl-item img { width: 84px; height: 56px; object-fit: cover; border-radius: 4px; display: block; }
  .nl-item-cat { color: var(--da-green); font-family: var(--da-font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
  .nl-item-title { color: var(--da-text); font-size: 15px; font-weight: 600; line-height: 1.35; margin: 2px 0 8px; text-decoration: none; display: block; }
  .nl-item-title:hover { color: var(--da-green); }
  .nl-tools { display: flex; flex-direction: column; gap: 6px; }
  .nl-icon { background: transparent; border: 1px solid var(--da-border); color: var(--da-muted); border-radius: 4px; width: 30px; height: 30px; cursor: pointer; font-size: 14px; line-height: 1; }
  .nl-icon:hover:not(:disabled) { border-color: var(--da-green); color: var(--da-green); }
  .nl-icon:disabled { opacity: 0.35; cursor: default; }
  .nl-add { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .nl-add .nl-select { flex: 1 1 320px; width: auto; }
  .nl-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .nl-btn { background: var(--da-green); color: var(--da-dark); border: none; border-radius: 4px; padding: 9px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; white-space: nowrap; }
  .nl-btn--ghost { background: transparent; color: var(--da-green); border: 1px solid var(--da-green); }
  .nl-btn--quiet { background: transparent; color: var(--da-muted); border: 1px solid var(--da-border); }
  .nl-btn--danger { background: transparent; color: #ff8e8e; border: 1px solid rgba(255,107,107,0.5); }
  .nl-btn:disabled { opacity: 0.55; cursor: default; }
  .nl-spacer { flex: 1; }
  .nl-note { font-size: 13px; line-height: 1.5; padding: 9px 12px; border-radius: 4px; border: 1px solid var(--da-border); color: var(--da-text); }
  .nl-note--warn { border-color: rgba(255,140,66,0.45); background: rgba(255,140,66,0.07); }
  .nl-note--ok { border-color: rgba(50,255,126,0.4); background: rgba(50,255,126,0.06); }
  .nl-note--err { border-color: #ff6b6b; background: rgba(255,107,107,0.08); color: #ff8e8e; }
  .nl-empty { color: var(--da-muted); font-size: 14px; line-height: 1.6; margin: 0; }
  .nl-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 720px; }
  .nl-table th { text-align: left; color: var(--da-muted); font-family: var(--da-font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 0 10px 8px 0; border-bottom: 1px solid var(--da-border); white-space: nowrap; }
  .nl-table td { padding: 10px 10px 10px 0; border-bottom: 1px solid var(--da-border); color: var(--da-text); vertical-align: top; }
  .nl-num { font-family: var(--da-font-mono); text-align: right; white-space: nowrap; }
  .nl-table th.nl-num { text-align: right; }
  .nl-scroll { overflow-x: auto; }
  .nl-link { background: none; border: none; padding: 0; color: var(--da-green); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
  .nl-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .nl-modal-box { background: var(--da-card); border: 1px solid var(--da-border); border-radius: 8px; width: min(720px, 100%); height: min(88vh, 1000px); display: flex; flex-direction: column; overflow: hidden; }
  .nl-modal-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--da-border); color: var(--da-text); font-size: 14px; font-weight: 600; }
  .nl-modal iframe { border: 0; width: 100%; flex: 1; background: #f4f4f5; }
`;

function Counter({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return <span className={over ? "nl-count nl-count--over" : "nl-count"}>{value.length}/{max}</span>;
}

function PreviewModal({ html, title, onClose }: { html: string; title: string; onClose: () => void }) {
  return (
    <div className="nl-modal" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="nl-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="nl-modal-head">
          <span>{title}</span>
          <button type="button" className="nl-btn nl-btn--quiet" onClick={onClose}>Schliessen</button>
        </div>
        <iframe title={title} srcDoc={html} sandbox="" />
      </div>
    </div>
  );
}

function Editor({ issue, confirmedCount, candidates, onPreview }: {
  issue: IssueView;
  confirmedCount: number;
  candidates: IssueItem[];
  onPreview: (html: string, title: string) => void;
}) {
  const router = useRouter();
  const ids = { subject: useId(), intro: useId(), add: useId() };
  const [subject, setSubject] = useState(issue.subject);
  const [intro, setIntro] = useState(issue.intro);
  const [items, setItems] = useState<IssueItem[]>(issue.items);
  const [pick, setPick] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const sending = issue.status === "sending";
  const locked = sending || pending;

  const saved = useMemo(() => JSON.stringify({ s: issue.subject, i: issue.intro, it: issue.items }), [issue]);
  const dirty = JSON.stringify({ s: subject, i: intro, it: items }) !== saved;
  const available = candidates.filter((c) => !items.some((i) => i.articleId === c.articleId));

  function run(fn: () => Promise<string | null>) {
    setNotice(null);
    startTransition(async () => {
      try {
        const text = await fn();
        if (text) setNotice({ kind: "ok", text });
        router.refresh();
      } catch (e) {
        setNotice({ kind: "err", text: e instanceof Error ? e.message : String(e) });
      }
    });
  }

  async function saveIfDirty(): Promise<void> {
    if (!dirty) return;
    unwrapAction(await saveIssue(issue.id, { subject, intro, items }));
  }

  function move(index: number, delta: -1 | 1) {
    setItems((list) => {
      const next = [...list];
      const target = index + delta;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function setTeaser(index: number, teaser: string) {
    setItems((list) => list.map((it, i) => (i === index ? { ...it, teaser } : it)));
  }

  function addPicked() {
    const c = candidates.find((x) => x.articleId === pick);
    if (!c || items.length >= MAX_ITEMS) return;
    setItems((list) => [...list, c]);
    setPick("");
  }

  const statusClass = sending ? "nl-chip nl-chip--sending" : "nl-chip";

  return (
    <section className="nl-card" aria-label="Offene Ausgabe">
      <div className="nl-meta">
        <span className={statusClass}>{ISSUE_STATUS_LABEL[issue.status]}</span>
        <span>Artikel seit {formatIssueDate(issue.periodFrom)}</span>
        <span>{issue.source === "cron" ? "automatisch erstellt" : "von Hand erstellt"} {dateTime(issue.createdAt)}</span>
        {issue.editedAt && <span>bearbeitet {dateTime(issue.editedAt)}</span>}
        <span>Test: {issue.testSentAt ? dateTime(issue.testSentAt) : "noch keiner"}</span>
      </div>

      {issue.aiNote && <div className="nl-note nl-note--warn">{issue.aiNote}</div>}
      {sending && (
        <div className="nl-note nl-note--warn">
          Versand läuft seit {dateTime(issue.sendStartedAt)}: {issue.delivered} von {issue.recipients ?? "?"} zugestellt
          {issue.failed > 0 ? `, ${issue.failed} mit Fehler` : ""}.{issue.lastError ? ` Letzter Fehler: ${issue.lastError}` : ""}
        </div>
      )}

      <div className="nl-field">
        <label className="nl-label" htmlFor={ids.subject}>
          Betreff <Counter value={subject} max={SUBJECT_MAX} />
        </label>
        <input id={ids.subject} className="nl-input" value={subject} disabled={locked} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="nl-field">
        <label className="nl-label" htmlFor={ids.intro}>
          Einleitung <Counter value={intro} max={INTRO_MAX} />
        </label>
        <textarea id={ids.intro} className="nl-textarea" rows={4} value={intro} disabled={locked} onChange={(e) => setIntro(e.target.value)} />
      </div>

      <div className="nl-field">
        <span className="nl-label">Artikel ({items.length}/{MAX_ITEMS}) · Reihenfolge wie im Newsletter</span>
        <div className="nl-items">
          {items.length === 0 && <p className="nl-empty">Noch kein Artikel. Unten einen hinzufügen.</p>}
          {items.map((it, i) => (
            <div key={it.articleId} className="nl-item">
              {it.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Vorschaubild aus Storage/Site, kein LCP
                <img src={it.coverUrl} alt="" />
              ) : <span />}
              <div>
                {it.category && <div className="nl-item-cat">{it.category}</div>}
                <a className="nl-item-title" href={`/artikel/${it.slug}`} target="_blank" rel="noopener">{it.title}</a>
                <label className="nl-label" style={{ fontWeight: 400, fontSize: 12, color: "var(--da-muted)" }}>
                  <span>Kurztext</span>
                  <Counter value={it.teaser} max={TEASER_MAX} />
                </label>
                <textarea
                  className="nl-textarea"
                  rows={2}
                  aria-label={`Kurztext zu ${it.title}`}
                  value={it.teaser}
                  disabled={locked}
                  onChange={(e) => setTeaser(i, e.target.value)}
                />
              </div>
              <div className="nl-tools">
                <button type="button" className="nl-icon" aria-label="Nach oben" disabled={locked || i === 0} onClick={() => move(i, -1)}>↑</button>
                <button type="button" className="nl-icon" aria-label="Nach unten" disabled={locked || i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button type="button" className="nl-icon" aria-label={`«${it.title}» entfernen`} disabled={locked} onClick={() => setItems((l) => l.filter((x) => x.articleId !== it.articleId))}>×</button>
              </div>
            </div>
          ))}
        </div>
        {!sending && (
          <div className="nl-add">
            <label htmlFor={ids.add} style={{ position: "absolute", left: -9999 }}>Artikel hinzufügen</label>
            <select id={ids.add} className="nl-select" value={pick} disabled={locked || items.length >= MAX_ITEMS || available.length === 0} onChange={(e) => setPick(e.target.value)}>
              <option value="">{available.length === 0 ? "Keine weiteren Artikel der letzten 60 Tage" : "Artikel der letzten 60 Tage hinzufügen …"}</option>
              {available.map((c) => <option key={c.articleId} value={c.articleId}>{c.title}</option>)}
            </select>
            <button type="button" className="nl-btn nl-btn--ghost" disabled={locked || !pick || items.length >= MAX_ITEMS} onClick={addPicked}>Hinzufügen</button>
          </div>
        )}
      </div>

      {notice && <div className={notice.kind === "ok" ? "nl-note nl-note--ok" : "nl-note nl-note--err"} role={notice.kind === "err" ? "alert" : "status"}>{notice.text}</div>}

      <div className="nl-bar">
        {sending ? (
          <button type="button" className="nl-btn" disabled={pending} onClick={() => run(async () => unwrapAction(await sendIssueNow(issue.id)).message)}>
            {pending ? "Sende …" : "Versand fortsetzen"}
          </button>
        ) : (
          <>
            <button type="button" className="nl-btn" disabled={locked || !dirty} onClick={() => run(async () => { unwrapAction(await saveIssue(issue.id, { subject, intro, items })); return "Gespeichert."; })}>
              {dirty ? "Speichern" : "Gespeichert"}
            </button>
            <button
              type="button"
              className="nl-btn nl-btn--ghost"
              disabled={locked}
              onClick={() => run(async () => { onPreview(unwrapAction(await renderIssuePreview({ subject, intro, items })), subject || "Vorschau"); return null; })}
            >
              Vorschau
            </button>
            <button type="button" className="nl-btn nl-btn--ghost" disabled={locked} onClick={() => run(async () => { await saveIfDirty(); return `Test an ${unwrapAction(await sendTestIssue(issue.id)).to} verschickt.`; })}>
              Test an mich
            </button>
            <span className="nl-spacer" />
            <button
              type="button"
              className="nl-btn nl-btn--quiet"
              disabled={locked}
              onClick={() => {
                const text = issue.editedAt || dirty
                  ? "Neuen Entwurf mit KI erstellen? Deine Änderungen an diesem Entwurf gehen verloren."
                  : "Neuen Entwurf mit KI erstellen? Dieser Entwurf wird ersetzt.";
                if (!confirm(text)) return;
                run(async () => unwrapAction(await createIssueNow(true)).message);
              }}
            >
              Neu erstellen (KI)
            </button>
            <button type="button" className="nl-btn nl-btn--danger" disabled={locked} onClick={() => { if (confirm("Entwurf verwerfen? Er wird nicht versendet.")) run(async () => { unwrapAction(await discardIssue(issue.id)); return "Entwurf verworfen."; }); }}>
              Verwerfen
            </button>
            <button
              type="button"
              className="nl-btn"
              disabled={locked || items.length === 0 || confirmedCount === 0}
              onClick={() => {
                const missing = items.find((it) => it.teaser.trim() === "");
                if (subject.trim() === "" || missing) {
                  setNotice({ kind: "err", text: subject.trim() === "" ? "Betreff fehlt." : `Kurztext fehlt bei «${missing?.title}».` });
                  return;
                }
                const noTest = issue.testSentAt ? "" : "\n\nHinweis: Für diesen Entwurf wurde noch kein Test verschickt.";
                if (!confirm(`Newsletter «${subject.trim()}» jetzt an ${confirmedCount} bestätigte Abonnent:innen senden? Das lässt sich nicht zurücknehmen.${noTest}`)) return;
                run(async () => { await saveIfDirty(); return unwrapAction(await sendIssueNow(issue.id)).message; });
              }}
            >
              Freigeben und senden
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export default function NewsletterIssuesClient({ issues, confirmedCount, candidates }: Props) {
  const router = useRouter();
  const [preview, setPreview] = useState<{ html: string; title: string } | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const open = issues.find((i) => i.status === "draft" || i.status === "sending") ?? null;
  const history = issues.filter((i) => i.status === "sent");

  function createNow() {
    setNotice(null);
    startTransition(async () => {
      try {
        const res = unwrapAction(await createIssueNow(false));
        setNotice({ kind: "ok", text: res.message });
        router.refresh();
      } catch (e) {
        setNotice({ kind: "err", text: e instanceof Error ? e.message : String(e) });
      }
    });
  }

  function showSent(i: IssueView) {
    startTransition(async () => {
      try {
        setPreview({ html: unwrapAction(await renderIssuePreview({ subject: i.subject, intro: i.intro, items: i.items })), title: i.subject });
      } catch (e) {
        setNotice({ kind: "err", text: e instanceof Error ? e.message : String(e) });
      }
    });
  }

  return (
    <div className="nl">
      <style>{CSS}</style>

      <div>
        <h2 className="nl-h2">Offene Ausgabe</h2>
        {open ? (
          <Editor
            key={`${open.id}:${open.updatedAt}`}
            issue={open}
            confirmedCount={confirmedCount}
            candidates={candidates}
            onPreview={(html, title) => setPreview({ html, title })}
          />
        ) : (
          <section className="nl-card">
            <p className="nl-empty">
              Kein offener Entwurf. Montags um 06:30 entsteht automatisch einer, wenn seit der letzten Ausgabe neue Artikel
              erschienen sind; du bekommst dann eine Mail.
            </p>
            {notice && <div className={notice.kind === "ok" ? "nl-note nl-note--ok" : "nl-note nl-note--err"} role={notice.kind === "err" ? "alert" : "status"}>{notice.text}</div>}
            <div className="nl-bar">
              <button type="button" className="nl-btn" disabled={pending} onClick={createNow}>{pending ? "Erstelle …" : "Entwurf jetzt erstellen"}</button>
            </div>
          </section>
        )}
      </div>

      <div>
        <h2 className="nl-h2">Versendet</h2>
        {history.length === 0 ? (
          <p className="nl-empty">Noch keine Ausgabe versendet.</p>
        ) : (
          <div className="nl-card nl-scroll">
            <table className="nl-table">
              <thead>
                <tr>
                  <th>Versendet</th>
                  <th>Betreff</th>
                  <th className="nl-num">Artikel</th>
                  <th className="nl-num">Empfänger</th>
                  <th className="nl-num">Zugestellt</th>
                  <th className="nl-num">Fehler</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {history.map((i) => (
                  <tr key={i.id}>
                    <td className="nl-num" style={{ textAlign: "left" }}>{dateTime(i.sentAt)}</td>
                    <td>{i.subject}</td>
                    <td className="nl-num">{i.items.length}</td>
                    <td className="nl-num">{i.recipients ?? "—"}</td>
                    <td className="nl-num">{i.delivered}</td>
                    <td className="nl-num">{i.failed}</td>
                    <td><button type="button" className="nl-link" onClick={() => showSent(i)}>Ansehen</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {preview && <PreviewModal html={preview.html} title={preview.title} onClose={() => setPreview(null)} />}
    </div>
  );
}
