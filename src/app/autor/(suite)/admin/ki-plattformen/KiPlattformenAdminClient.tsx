"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unwrapAction } from "@/lib/actionResult";
import { runPlatformResearchNow } from "@/lib/aiJobs/actions";
import {
  createPlatform,
  revertPlatformChange,
  savePlatform,
  setPlatformFlags,
  type PlatformInput,
} from "@/lib/platforms/adminActions";
import { PLATFORM_CATEGORIES, PLATFORM_HOSTINGS } from "@/lib/platforms/research";

export type PlatformAdminView = {
  id: string;
  name: string;
  category: string;
  tagline: string;
  hosting: string;
  pricing: string;
  url: string | null;
  pricingUrl: string | null;
  pageStatus: string | null;
  featured: boolean;
  active: boolean;
  locked: boolean;
  source: string;
  aiNote: string | null;
  verifiedLabel: string;
};

export type RunView = { id: string; label: string; status: string; summary: string; errors: string[] };

export type ChangeView = {
  id: string;
  action: "add" | "update" | "archive";
  platformName: string;
  dateLabel: string;
  reason: string;
  sources: string[];
  diffs: { field: string; before: string; after: string }[];
  addedSummary: string | null;
  revertedLabel: string | null;
  canRevert: boolean;
};

type Props = { platforms: PlatformAdminView[]; runs: RunView[]; changes: ChangeView[]; loadError: string | null };

const ACTION_LABEL = { add: "Neu", update: "Aktualisiert", archive: "Archiviert" } as const;
const SOURCE_LABEL: Record<string, string> = { seed: "Startbestand", ai: "zuletzt von KI", editor: "zuletzt von Redaktion" };
const RUN_STATUS: Record<string, string> = { running: "läuft", ok: "ok", partial: "mit Fehlern", error: "fehlgeschlagen" };
const EMPTY: PlatformInput = { name: "", category: "LLM", tagline: "", hosting: "EU", pricing: "", url: "", pricingUrl: "" };

// Ergebnis des letzten Abrufs der Preisseite (PR 206).
const PAGE_STATUS: Record<string, string> = { blocked: "Preisseite sperrt Bots", script: "Preisseite nur per JavaScript", missing: "Preisseite nicht gefunden", error: "Preisseite nicht erreichbar" };

function host(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export default function KiPlattformenAdminClient({ platforms, runs, changes, loadError }: Props) {
  const router = useRouter();
  const [running, startRunning] = useTransition();
  const [runMsg, setRunMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [editId, setEditId] = useState<string | "new" | null>(null);
  const [allChanges, setAllChanges] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function runNow() {
    setRunMsg(null);
    startRunning(async () => {
      try {
        const r = unwrapAction(await runPlatformResearchNow());
        const changed = r.updates + r.additions + r.archived;
        const text = changed > 0
          ? `Fertig: ${r.additions} neu, ${r.updates} aktualisiert, ${r.archived} archiviert, ${r.checked} bestätigt.`
          : `Fertig: keine Änderung, ${r.checked} Einträge bestätigt.`;
        setRunMsg(r.errors.length > 0 ? { ok: false, text: `${text} Fehler: ${r.errors.join(" · ")}` } : { ok: true, text });
        router.refresh();
      } catch (e) {
        setRunMsg({ ok: false, text: e instanceof Error ? e.message : "Prüfung fehlgeschlagen." });
      }
    });
  }

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

  const shown = platforms.filter((p) => (tab === "active" ? p.active : !p.active));
  const activeCount = platforms.filter((p) => p.active).length;
  const visibleChanges = allChanges ? changes : changes.slice(0, 8);
  const lastRun = runs[0] ?? null;

  return (
    <div className="kp">
      <style>{`
        .kp { display: flex; flex-direction: column; gap: 28px; }
        .kp-bar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .kp-meta { color: var(--da-muted); font-size: 12px; font-family: var(--da-font-mono); }
        .kp-btn {
          background: var(--da-green); color: var(--da-dark); border: none; border-radius: 4px;
          padding: 9px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
        }
        .kp-btn:disabled { opacity: 0.6; cursor: wait; }
        .kp-btn--ghost { background: transparent; color: var(--da-green); border: 1px solid var(--da-green); padding: 6px 12px; font-size: 12px; }
        .kp-link {
          background: none; border: none; padding: 0; cursor: pointer; font-family: inherit;
          color: var(--da-green); font-size: 12px; font-weight: 600; white-space: nowrap;
        }
        .kp-link:disabled { opacity: 0.5; cursor: wait; }
        .kp-link--muted { color: var(--da-muted); }
        .kp-h2 {
          color: var(--da-muted); font-family: var(--da-font-mono); font-size: 11px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase; margin: 0;
        }
        .kp-head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 10px; min-height: 30px; }
        .kp-head__end { margin-left: auto; }
        .kp-card { background: var(--da-card); border: 1px solid var(--da-border); border-radius: 8px; padding: 18px 20px; }
        .kp-ok { color: var(--da-green); font-size: 13px; }
        .kp-err { color: #ff8e8e; font-size: 13px; }
        .kp-item--err { border: 1px solid #ff6b6b; background: rgba(255,107,107,0.08); color: #ff8e8e; border-radius: 4px; padding: 8px 12px; font-size: 13px; }
        .kp-changes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
        .kp-change { display: grid; grid-template-columns: 1fr auto; gap: 6px 16px; padding: 14px 0; border-bottom: 1px solid var(--da-border); }
        .kp-change:first-child { padding-top: 0; }
        .kp-change:last-child { border-bottom: none; padding-bottom: 0; }
        .kp-change__head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
        .kp-change__name { color: var(--da-text); font-weight: 700; font-size: 14px; }
        .kp-change__date { color: var(--da-muted-soft); font-size: 11px; font-family: var(--da-font-mono); }
        .kp-change__body { grid-column: 1 / 2; color: var(--da-text); font-size: 13px; line-height: 1.5; }
        .kp-change__side { grid-row: 1 / span 2; grid-column: 2; align-self: start; text-align: right; }
        .kp-diff { margin: 2px 0; }
        .kp-diff__field { color: var(--da-muted); font-size: 12px; margin-right: 6px; }
        .kp-diff__old { color: var(--da-muted-soft); text-decoration: line-through; }
        .kp-reason { color: var(--da-muted); font-size: 12px; margin-top: 4px; }
        .kp-sources { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px; }
        .kp-sources a { color: var(--da-green); font-size: 11px; font-family: var(--da-font-mono); text-decoration: none; }
        .kp-reverted { color: var(--da-muted-soft); font-size: 11px; font-family: var(--da-font-mono); }
        .kp-chip {
          display: inline-block; font-family: var(--da-font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; padding: 2px 6px; border-radius: 3px;
          color: var(--da-green); background: rgba(50,255,126,0.12);
        }
        .kp-chip--update { color: var(--da-orange); background: rgba(255,140,66,0.12); }
        .kp-chip--archive { color: var(--da-muted); background: rgba(255,255,255,0.06); }
        .kp-tabs { display: flex; gap: 4px; }
        .kp-tab {
          background: none; border: 1px solid var(--da-border); color: var(--da-muted); border-radius: 4px;
          padding: 5px 10px; font-size: 12px; cursor: pointer; font-family: inherit;
        }
        .kp-tab--on { color: var(--da-text); border-color: var(--da-green); }
        .kp-scroll { overflow-x: auto; }
        .kp-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 640px; }
        .kp-table th {
          text-align: left; color: var(--da-muted); font-family: var(--da-font-mono); font-size: 10px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase; padding: 0 10px 8px 0; border-bottom: 1px solid var(--da-border);
          white-space: nowrap;
        }
        .kp-table td { padding: 10px 10px 10px 0; border-bottom: 1px solid var(--da-border); vertical-align: top; color: var(--da-text); }
        .kp-name { font-weight: 700; }
        .kp-sub { color: var(--da-muted-soft); font-size: 12px; margin-top: 2px; line-height: 1.45; max-width: 380px; }
        .kp-sub a { color: var(--da-muted); }
        .kp-mono { font-family: var(--da-font-mono); font-size: 12px; white-space: nowrap; }
        .kp-check { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--da-muted); cursor: pointer; white-space: nowrap; }
        .kp-actions { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
        .kp-opts { display: flex; flex-direction: column; gap: 6px; }
        .kp-form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding: 14px 0 6px; }
        .kp-form label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--da-muted); font-family: var(--da-font-mono); text-transform: uppercase; letter-spacing: 0.06em; }
        .kp-form .kp-wide { grid-column: 1 / -1; }
        .kp-input {
          background: var(--da-dark); color: var(--da-text); border: 1px solid var(--da-border); border-radius: 4px;
          padding: 8px 10px; font-size: 13px; font-family: var(--da-font-body); text-transform: none; letter-spacing: 0;
        }
        .kp-form__actions { grid-column: 1 / -1; display: flex; gap: 12px; align-items: center; }
        .kp-runs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
        .kp-runs li { color: var(--da-muted); }
        .kp-runs b { color: var(--da-text); font-weight: 600; }
      `}</style>

      <div className="kp-bar">
        <button type="button" className="kp-btn" onClick={runNow} disabled={running}>
          {running ? "Prüfe… (1 bis 4 Minuten)" : "Jetzt prüfen"}
        </button>
        <span className="kp-meta">
          Letzter Lauf: {lastRun ? `${lastRun.label}, ${RUN_STATUS[lastRun.status] ?? lastRun.status}` : "noch keiner"}
        </span>
        {runMsg && <span role={runMsg.ok ? "status" : "alert"} className={runMsg.ok ? "kp-ok" : "kp-err"}>{runMsg.text}</span>}
      </div>

      {loadError && <div className="kp-item--err" role="alert">{loadError}</div>}
      {err && <div className="kp-item--err" role="alert">{err}</div>}

      <section>
        <div className="kp-head">
          <h2 className="kp-h2">Änderungen der KI</h2>
          {changes.length > 8 && (
            <button type="button" className="kp-link kp-link--muted" onClick={() => setAllChanges((v) => !v)}>
              {allChanges ? "Weniger anzeigen" : `Alle ${changes.length} anzeigen`}
            </button>
          )}
        </div>
        <div className="kp-card">
          {changes.length === 0 ? (
            <p className="kp-meta" style={{ margin: 0 }}>Noch keine. Der erste Lauf ist am Dienstag früh, oder jetzt mit «Jetzt prüfen».</p>
          ) : (
            <ul className="kp-changes">
              {visibleChanges.map((c) => (
                <li key={c.id} className="kp-change">
                  <div className="kp-change__head">
                    <span className={`kp-chip kp-chip--${c.action}`}>{ACTION_LABEL[c.action]}</span>
                    <span className="kp-change__name">{c.platformName}</span>
                    <span className="kp-change__date">{c.dateLabel}</span>
                  </div>
                  <div className="kp-change__side">
                    {c.revertedLabel ? (
                      <span className="kp-reverted">Zurückgenommen {c.revertedLabel}</span>
                    ) : c.canRevert ? (
                      <button
                        type="button"
                        className="kp-link"
                        disabled={busy !== null}
                        onClick={() => act(`rev-${c.id}`, async () => unwrapAction(await revertPlatformChange(c.id)))}
                        title="Stellt den vorherigen Stand her und sperrt den Eintrag für die KI"
                      >
                        {busy === `rev-${c.id}` ? "…" : "Rückgängig"}
                      </button>
                    ) : null}
                  </div>
                  <div className="kp-change__body">
                    {c.diffs.map((d) => (
                      <div key={d.field} className="kp-diff">
                        <span className="kp-diff__field">{d.field}</span>
                        <span className="kp-diff__old">{d.before}</span> → {d.after}
                      </div>
                    ))}
                    {c.addedSummary && <div className="kp-diff">{c.addedSummary}</div>}
                    {c.reason && <div className="kp-reason">{c.reason}</div>}
                    {c.sources.length > 0 && (
                      <div className="kp-sources">
                        {c.sources.map((s) => <a key={s} href={s} target="_blank" rel="noreferrer">{host(s)} ↗</a>)}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <div className="kp-head">
          <h2 className="kp-h2">Verzeichnis</h2>
          <span className="kp-tabs">
            <button type="button" className={`kp-tab${tab === "active" ? " kp-tab--on" : ""}`} onClick={() => setTab("active")}>
              Aktiv {activeCount}
            </button>
            <button type="button" className={`kp-tab${tab === "archived" ? " kp-tab--on" : ""}`} onClick={() => setTab("archived")}>
              Archiviert {platforms.length - activeCount}
            </button>
          </span>
          <button type="button" className="kp-btn kp-btn--ghost kp-head__end" onClick={() => setEditId(editId === "new" ? null : "new")}>
            + Plattform hinzufügen
          </button>
        </div>
        <div className="kp-card">
          {editId === "new" && (
            <PlatformForm
              initial={EMPTY}
              submitLabel="Hinzufügen"
              busy={busy === "new"}
              onCancel={() => setEditId(null)}
              onSubmit={(v) => act("new", async () => { unwrapAction(await createPlatform(v)); setEditId(null); })}
            />
          )}
          <div className="kp-scroll">
            <table className="kp-table">
              <thead>
                <tr>
                  <th>Plattform</th>
                  <th>Angaben</th>
                  <th>Geprüft</th>
                  <th>Optionen</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <Fragment key={p.id}>
                    <tr>
                      <td>
                        <div className="kp-name">{p.name}</div>
                        <div className="kp-sub">
                          {p.tagline}
                          {p.url ? <> · <a href={p.url} target="_blank" rel="noreferrer">{host(p.url)}</a></> : " · kein Link"}
                        </div>
                      </td>
                      <td>
                        <div className="kp-mono">{p.category} · {p.hosting}</div>
                        <div className="kp-sub">{p.pricing}</div>
                        {p.pageStatus && PAGE_STATUS[p.pageStatus] && <div className="kp-sub" style={{ color: "var(--da-orange)" }}>{PAGE_STATUS[p.pageStatus]}</div>}
                      </td>
                      <td>
                        <div className="kp-mono">{p.verifiedLabel}</div>
                        <div className="kp-sub">{SOURCE_LABEL[p.source] ?? p.source}</div>
                      </td>
                      <td>
                        <div className="kp-opts">
                          <label className="kp-check">
                            <input
                              type="checkbox"
                              checked={p.featured}
                              disabled={busy !== null}
                              onChange={(e) => { const v = e.target.checked; act(`f-${p.id}`, async () => unwrapAction(await setPlatformFlags(p.id, { featured: v }))); }}
                            />
                            Top Pick
                          </label>
                          <label className="kp-check" title="Die KI ändert gesperrte Einträge nicht">
                            <input
                              type="checkbox"
                              checked={p.locked}
                              disabled={busy !== null}
                              onChange={(e) => { const v = e.target.checked; act(`l-${p.id}`, async () => unwrapAction(await setPlatformFlags(p.id, { locked: v }))); }}
                            />
                            Für KI gesperrt
                          </label>
                        </div>
                      </td>
                      <td>
                        <div className="kp-actions">
                          <button type="button" className="kp-link" onClick={() => setEditId(editId === p.id ? null : p.id)}>
                            {editId === p.id ? "Schliessen" : "Bearbeiten"}
                          </button>
                          <button
                            type="button"
                            className="kp-link kp-link--muted"
                            disabled={busy !== null}
                            onClick={() => act(`s-${p.id}`, async () => unwrapAction(await setPlatformFlags(p.id, { status: p.active ? "archived" : "active" })))}
                          >
                            {p.active ? "Archivieren" : "Aktivieren"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editId === p.id && (
                      <tr>
                        <td colSpan={5}>
                          <PlatformForm
                            initial={{ name: p.name, category: p.category, tagline: p.tagline, hosting: p.hosting, pricing: p.pricing, url: p.url ?? "", pricingUrl: p.pricingUrl ?? "" }}
                            submitLabel="Speichern"
                            busy={busy === `e-${p.id}`}
                            note={p.locked ? null : "Tipp: Nach dem Bearbeiten «Für KI gesperrt» setzen, wenn die KI den Eintrag nicht mehr ändern soll."}
                            onCancel={() => setEditId(null)}
                            onSubmit={(v) => act(`e-${p.id}`, async () => { unwrapAction(await savePlatform(p.id, v)); setEditId(null); })}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {runs.length > 0 && (
        <section>
          <h2 className="kp-h2" style={{ marginBottom: 10 }}>Letzte Läufe</h2>
          <ul className="kp-runs">
            {runs.map((r) => (
              <li key={r.id}>
                <b>{r.label}</b> · {RUN_STATUS[r.status] ?? r.status} · {r.summary}
                {r.errors.length > 0 && <span className="kp-err"> · {r.errors.join(" · ")}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PlatformForm({
  initial, submitLabel, busy, note, onCancel, onSubmit,
}: {
  initial: PlatformInput;
  submitLabel: string;
  busy: boolean;
  note?: string | null;
  onCancel: () => void;
  onSubmit: (v: PlatformInput) => void;
}) {
  const [v, setV] = useState<PlatformInput>(initial);
  const set = (k: keyof PlatformInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form className="kp-form" onSubmit={(e) => { e.preventDefault(); onSubmit(v); }}>
      <label>Name<input className="kp-input" value={v.name} onChange={set("name")} maxLength={60} required /></label>
      <label>Kategorie
        <select className="kp-input" value={v.category} onChange={set("category")}>
          {PLATFORM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label>Hosting
        <select className="kp-input" value={v.hosting} onChange={set("hosting")}>
          {PLATFORM_HOSTINGS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
      </label>
      <label className="kp-wide">Beschreibung (ein Satz)<input className="kp-input" value={v.tagline} onChange={set("tagline")} maxLength={200} required /></label>
      <label>Preis<input className="kp-input" value={v.pricing} onChange={set("pricing")} maxLength={40} required /></label>
      <label style={{ gridColumn: "span 2" }}>Link (https://, leer = kein Link)<input className="kp-input" value={v.url} onChange={set("url")} type="url" /></label>
      <label className="kp-wide">Preisseite (https://, prüft der Job wöchentlich; leer = Link)<input className="kp-input" value={v.pricingUrl} onChange={set("pricingUrl")} type="url" /></label>
      <div className="kp-form__actions">
        <button type="submit" className="kp-btn" disabled={busy}>{busy ? "Speichere…" : submitLabel}</button>
        <button type="button" className="kp-link kp-link--muted" onClick={onCancel}>Abbrechen</button>
        {note && <span className="kp-meta">{note}</span>}
      </div>
    </form>
  );
}
