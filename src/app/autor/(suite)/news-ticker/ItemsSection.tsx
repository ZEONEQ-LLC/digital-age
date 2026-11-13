"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { unwrapAction } from "@/lib/actionResult";
import { resetNewsItemAssessment, saveNewsItemReview, setNewsItemStatus } from "@/lib/newsTickerActions";
import { ASSESSMENT_DIMENSIONS, IMPORTANCE_LABEL, LEVEL_LABEL, type AssessmentKey, type Importance, type Level } from "@/lib/newsTicker/assessment";

// Abschnitt «Meldungen und Einordnung» (PR 199): die letzten Meldungen mit
// der Einordnung der KI. Die Redaktion kann sie korrigieren (gilt dann als
// «Redaktion»), neu einordnen lassen oder die Meldung ausblenden.

export type AdminNewsItem = {
  id: string;
  title: string;
  summary: string;
  sourceName: string | null;
  sourceUrl: string;
  timeLabel: string;
  hidden: boolean;
  assessment: { wirtschaft: Level; gesellschaft: Level; umwelt: Level; dringlichkeit: Level; warum: string; by: "ai" | "editor" } | null;
  importance: Importance | null;
};

type Draft = Record<AssessmentKey, number> & { importance: number; warum: string };

const LEVELS: Level[] = [0, 1, 2, 3];
const IMPORTANCES: Importance[] = [1, 2, 3];

function draftOf(it: AdminNewsItem): Draft {
  const a = it.assessment;
  return {
    wirtschaft: a?.wirtschaft ?? 1, gesellschaft: a?.gesellschaft ?? 1, umwelt: a?.umwelt ?? 0, dringlichkeit: a?.dringlichkeit ?? 1,
    importance: it.importance ?? 2, warum: a?.warum ?? "",
  };
}

function shortLine(it: AdminNewsItem): string {
  const a = it.assessment;
  if (!a) return "noch keine Einordnung (folgt im nächsten Lauf)";
  return ASSESSMENT_DIMENSIONS.map((d) => `${d.label} ${a[d.key] === 0 ? "–" : LEVEL_LABEL[a[d.key]]}`).join(" · ");
}

export default function ItemsSection({ items }: { items: AdminNewsItem[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Das hat nicht geklappt.");
    } finally {
      setBusy(null);
    }
  }

  function toggle(it: AdminNewsItem) {
    if (openId === it.id) { setOpenId(null); setDraft(null); return; }
    setOpenId(it.id);
    setDraft(draftOf(it));
  }

  return (
    <section className="ni">
      <style>{`
        .ni-head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; margin-bottom: 6px; }
        .ni-h { color: var(--da-text); font-size: 18px; font-weight: 700; margin: 0; }
        .ni-sub { color: var(--da-muted); font-size: 13px; margin: 0 0 14px; max-width: 760px; line-height: 1.5; }
        .ni-err { border: 1px solid #ff6b6b; background: rgba(255,107,107,0.08); color: #ff8e8e; border-radius: 4px; padding: 8px 12px; font-size: 13px; margin-bottom: 12px; }
        .ni-box { background: var(--da-card); border: 1px solid var(--da-border); border-radius: 6px; overflow: hidden; }
        .ni-row { display: grid; grid-template-columns: 92px minmax(0, 1fr) auto; gap: 14px; padding: 12px 16px; border-top: 1px solid var(--da-border); align-items: start; }
        .ni-row:first-child { border-top: none; }
        .ni-row--hidden { opacity: 0.55; }
        .ni-time { color: var(--da-muted); font-size: 12px; font-variant-numeric: tabular-nums; padding-top: 2px; }
        .ni-title { color: var(--da-text); font-size: 14px; font-weight: 600; line-height: 1.4; margin: 0; }
        .ni-badge { display: inline-block; font-size: 11px; font-weight: 700; border-radius: 3px; padding: 1px 6px; margin-right: 6px; vertical-align: 1px; }
        .ni-badge--imp { color: var(--da-dark); background: var(--da-green); }
        .ni-badge--off { color: var(--da-muted); border: 1px solid var(--da-border); }
        .ni-badge--ed { color: var(--da-orange); border: 1px solid rgba(255,140,66,0.5); }
        .ni-line { color: var(--da-muted); font-size: 12px; margin: 4px 0 0; }
        .ni-why { color: var(--da-text-strong); font-size: 13px; margin: 4px 0 0; line-height: 1.45; }
        .ni-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
        .ni-link { background: none; border: none; padding: 0; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 600; color: var(--da-green); white-space: nowrap; }
        .ni-link--muted { color: var(--da-muted); }
        .ni-link:disabled { opacity: 0.5; cursor: wait; }
        .ni-form { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; padding: 4px 0 6px; }
        .ni-form label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--da-muted); font-weight: 600; }
        .ni-form .ni-wide { grid-column: 1 / -1; }
        .ni-input { background: var(--da-dark); color: var(--da-text); border: 1px solid var(--da-border); border-radius: 4px; padding: 7px 9px; font-size: 13px; font-family: var(--da-font-body); }
        .ni-form__actions { grid-column: 1 / -1; display: flex; gap: 14px; align-items: center; }
        .ni-btn { background: var(--da-green); color: var(--da-dark); border: none; border-radius: 4px; padding: 8px 14px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .ni-btn:disabled { opacity: 0.6; cursor: wait; }
        @media (max-width: 900px) {
          .ni-row { grid-template-columns: minmax(0, 1fr); }
          .ni-actions { flex-direction: row; flex-wrap: wrap; align-items: center; }
          .ni-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>
      <div className="ni-head">
        <h2 className="ni-h">Meldungen und Einordnung</h2>
      </div>
      <p className="ni-sub">
        Die KI schätzt jede Meldung beim Anlegen ein (Wirtschaft, Gesellschaft, Umwelt, Dringlichkeit, Wichtigkeit und ein Satz «Warum wichtig»).
        Fehlende Einordnungen (letzte 30 Tage) trägt der Cron stündlich nach, «Jetzt aktualisieren» oben sofort. Korrigierte Werte gelten als «Redaktion». «Wichtig» erscheint auf der Startseite und unter /news.
      </p>
      {err && <div className="ni-err" role="alert">{err}</div>}
      <div className="ni-box">
        {items.length === 0 && <p className="ni-line" style={{ padding: 16 }}>Noch keine Meldungen.</p>}
        {items.map((it) => (
          <Fragment key={it.id}>
            <div className={`ni-row${it.hidden ? " ni-row--hidden" : ""}`}>
              <div className="ni-time">{it.timeLabel}</div>
              <div style={{ minWidth: 0 }}>
                <p className="ni-title">
                  {it.importance === 3 && <span className="ni-badge ni-badge--imp">Wichtig</span>}
                  {it.hidden && <span className="ni-badge ni-badge--off">Ausgeblendet</span>}
                  {it.assessment?.by === "editor" && <span className="ni-badge ni-badge--ed">Redaktion</span>}
                  {it.title}
                </p>
                <p className="ni-line">{it.sourceName ?? "Quelle"} · {shortLine(it)}</p>
                {it.assessment && <p className="ni-why">{it.assessment.warum}</p>}
              </div>
              <div className="ni-actions">
                <button type="button" className="ni-link" onClick={() => toggle(it)}>
                  {openId === it.id ? "Schliessen" : "Einordnung bearbeiten"}
                </button>
                {it.assessment && (
                  <button type="button" className="ni-link ni-link--muted" disabled={busy !== null}
                    onClick={() => act(`r-${it.id}`, async () => unwrapAction(await resetNewsItemAssessment(it.id)))}>
                    {busy === `r-${it.id}` ? "…" : "Neu einordnen lassen"}
                  </button>
                )}
                <button type="button" className="ni-link ni-link--muted" disabled={busy !== null}
                  onClick={() => act(`s-${it.id}`, async () => unwrapAction(await setNewsItemStatus(it.id, it.hidden ? "approved" : "rejected")))}>
                  {busy === `s-${it.id}` ? "…" : it.hidden ? "Einblenden" : "Ausblenden"}
                </button>
              </div>
              {openId === it.id && draft && (
                <form
                  className="ni-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(`e-${it.id}`, async () => {
                      unwrapAction(await saveNewsItemReview(it.id, { status: it.hidden ? "rejected" : "approved", ...draft }));
                      setOpenId(null);
                      setDraft(null);
                    });
                  }}
                >
                  {ASSESSMENT_DIMENSIONS.map((d) => (
                    <label key={d.key}>
                      {d.label}
                      <select className="ni-input" value={draft[d.key]} onChange={(e) => setDraft({ ...draft, [d.key]: Number(e.target.value) })}>
                        {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                      </select>
                    </label>
                  ))}
                  <label>
                    Wichtigkeit
                    <select className="ni-input" value={draft.importance} onChange={(e) => setDraft({ ...draft, importance: Number(e.target.value) })}>
                      {IMPORTANCES.map((l) => <option key={l} value={l}>{IMPORTANCE_LABEL[l]}</option>)}
                    </select>
                  </label>
                  <label className="ni-wide">
                    Warum wichtig (ein Satz, höchstens 220 Zeichen)
                    <input className="ni-input" value={draft.warum} maxLength={220} onChange={(e) => setDraft({ ...draft, warum: e.target.value })} />
                  </label>
                  <div className="ni-form__actions">
                    <button type="submit" className="ni-btn" disabled={busy !== null}>{busy === `e-${it.id}` ? "Speichere…" : "Speichern"}</button>
                    <a href={it.sourceUrl} target="_blank" rel="noopener noreferrer" className="ni-link ni-link--muted">Quelle öffnen ↗</a>
                  </div>
                </form>
              )}
            </div>
          </Fragment>
        ))}
      </div>
    </section>
  );
}
