"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unwrapAction } from "@/lib/actionResult";
import { switchTaskModel } from "@/lib/ai/configActions";
import { runModelCheckNow, saveCatalogModel } from "@/lib/ai/modelCheckActions";

export type RecView = {
  kind: "pflicht" | "upgrade" | "qualitaet" | "sparen";
  kindLabel: string;
  targetModel: string;
  targetLabel: string;
  reason: string;
  delta: string | null;
  needsComparison: boolean;
};

export type TaskRowView = {
  task: string;
  label: string;
  currentModel: string | null;
  currentLabel: string;
  callsPerMonth: number;
  avgInput: number | null;
  avgOutput: number | null;
  measured: boolean;
  costPerMonth: number | null;
  recs: RecView[];
};

export type FindingView = { key: string; level: "warn" | "info"; message: string };

export type CatalogView = {
  modelId: string;
  label: string;
  modelClass: string;
  inputPerMTok: number | null;
  outputPerMTok: number | null;
  longTier: string | null;
  status: string;
  retirementDate: string;
  releasedLabel: string;
  seenLabel: string;
  selectable: boolean;
  inUse: boolean;
  // Erschienen im letzten Jahr (oder Datum unbekannt).
  recent: boolean;
};

type Props = {
  rows: TaskRowView[];
  findings: FindingView[];
  catalog: CatalogView[];
  runInfo: { label: string; errors: string[] } | null;
  loadError: string | null;
  windowDays: number;
};

function usd(v: number | null): string {
  if (v === null) return "–";
  if (v === 0) return "0.00";
  return v < 0.01 ? "< 0.01" : v.toFixed(2);
}

function calls(v: number): string {
  if (v === 0) return "0";
  return v < 1 ? "< 1" : v < 10 ? v.toFixed(1) : String(Math.round(v));
}

export default function ModelCheckClient({ rows, findings, catalog, runInfo, loadError, windowDays }: Props) {
  const router = useRouter();
  const [running, startRun] = useTransition();
  const [runMsg, setRunMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showOld, setShowOld] = useState(false);

  function runNow() {
    setRunMsg(null);
    startRun(async () => {
      try {
        const res = unwrapAction(await runModelCheckNow());
        setRunMsg(
          res.errors.length > 0
            ? { ok: false, text: `Prüflauf mit Fehlern: ${res.errors.join(" · ")}` }
            : { ok: true, text: `Prüflauf fertig, ${res.items} offene Punkte.` },
        );
        router.refresh();
      } catch (e) {
        setRunMsg({ ok: false, text: e instanceof Error ? e.message : "Prüflauf fehlgeschlagen." });
      }
    });
  }

  const total = rows.reduce((a, r) => a + (r.costPerMonth ?? 0), 0);
  // Aufgaben ohne Aufrufe und ohne Empfehlung nur als kurze Liste.
  const active = rows.filter((r) => r.callsPerMonth > 0 || r.recs.length > 0);
  const idle = rows.filter((r) => r.callsPerMonth === 0 && r.recs.length === 0);
  // Katalog: alte Modelle ohne Preis (z.B. aus dem ersten API-Abgleich) eingeklappt.
  const isMain = (c: CatalogView) => c.inputPerMTok !== null || c.selectable || c.inUse || c.recent;
  const mainCatalog = catalog.filter(isMain);
  const oldCatalog = catalog.filter((c) => !isMain(c));
  const catalogKey = (c: CatalogView) => `${c.modelId}|${c.inputPerMTok}|${c.outputPerMTok}|${c.status}|${c.retirementDate}`;

  return (
    <div className="mc">
      <style>{`
        .mc { display: flex; flex-direction: column; gap: 28px; }
        .mc-bar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .mc-meta { color: var(--da-muted); font-size: 12px; font-family: var(--da-font-mono); }
        .mc-btn {
          background: var(--da-green); color: var(--da-dark); border: none; border-radius: 4px;
          padding: 9px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
        }
        .mc-btn:disabled { opacity: 0.6; cursor: wait; }
        .mc-btn--ghost {
          background: transparent; color: var(--da-green); border: 1px solid var(--da-green);
          padding: 6px 12px; font-size: 12px;
        }
        .mc-h2 {
          color: var(--da-muted); font-family: var(--da-font-mono); font-size: 11px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 10px;
        }
        .mc-card { background: var(--da-card); border: 1px solid var(--da-border); border-radius: 8px; padding: 18px 20px; }
        .mc-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
        .mc-item { font-size: 13px; line-height: 1.5; padding: 8px 12px; border-radius: 4px; border: 1px solid var(--da-border); color: var(--da-text); }
        .mc-item--warn { border-color: rgba(255,140,66,0.45); background: rgba(255,140,66,0.07); }
        .mc-item--err { border-color: #ff6b6b; background: rgba(255,107,107,0.08); color: #ff8e8e; }
        .mc-ok { color: var(--da-green); font-size: 13px; }
        .mc-scroll { overflow-x: auto; }
        .mc-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 760px; }
        .mc-table th {
          text-align: left; color: var(--da-muted); font-family: var(--da-font-mono); font-size: 10px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase; padding: 0 10px 8px 0; border-bottom: 1px solid var(--da-border);
          white-space: nowrap;
        }
        .mc-table td { padding: 10px 10px 10px 0; border-bottom: 1px solid var(--da-border); vertical-align: top; color: var(--da-text); }
        .mc-num { font-family: var(--da-font-mono); text-align: right; white-space: nowrap; }
        .mc-table th.mc-num { text-align: right; }
        .mc-sub { color: var(--da-muted-soft); font-size: 11px; margin-top: 2px; }
        .mc-model { font-family: var(--da-font-mono); font-size: 12px; white-space: nowrap; }
        .mc-chip {
          display: inline-block; font-family: var(--da-font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; padding: 2px 6px; border-radius: 3px; margin-right: 6px;
          color: var(--da-green); background: rgba(50,255,126,0.12);
        }
        .mc-chip--pflicht { color: #ff8e8e; background: rgba(255,107,107,0.12); }
        .mc-chip--qualitaet { color: var(--da-orange); background: rgba(255,140,66,0.12); }
        .mc-rec + .mc-rec { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--da-border); }
        .mc-rec-line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .mc-muted { color: var(--da-muted); }
        .mc-input, .mc-select {
          background: var(--da-dark); color: var(--da-text); border: 1px solid var(--da-border); border-radius: 4px;
          padding: 6px 8px; font-size: 12px; font-family: var(--da-font-mono); box-sizing: border-box;
        }
        .mc-input { width: 76px; }
        .mc-input--date { width: 132px; }
        .mc-input--missing { border-color: var(--da-orange); }
        .mc-err { color: #ff8e8e; font-size: 12px; margin-top: 4px; }
        .mc-toggle {
          background: none; border: none; padding: 0; cursor: pointer; font-family: inherit;
          color: var(--da-muted); font-size: 12px;
        }
      `}</style>

      <div className="mc-bar">
        <button type="button" className="mc-btn" onClick={runNow} disabled={running}>
          {running ? "Prüfe…" : "Jetzt prüfen"}
        </button>
        <span className="mc-meta">
          Letzter Prüflauf: {runInfo ? runInfo.label : "noch keiner"}
        </span>
        {runMsg && (
          <span role={runMsg.ok ? "status" : "alert"} className={runMsg.ok ? "mc-ok" : "mc-err"}>{runMsg.text}</span>
        )}
      </div>

      {loadError && <div className="mc-item mc-item--err" role="alert">{loadError}</div>}

      {runInfo && runInfo.errors.length > 0 && (
        <section>
          <h2 className="mc-h2">Fehler im letzten Prüflauf</h2>
          <ul className="mc-list">
            {runInfo.errors.map((e, i) => <li key={i} className="mc-item mc-item--err">{e}</li>)}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mc-h2">Hinweise</h2>
        {findings.length === 0 ? (
          <p className="mc-ok">Keine offenen Hinweise.</p>
        ) : (
          <ul className="mc-list">
            {findings.map((f) => (
              <li key={f.key} className={`mc-item${f.level === "warn" ? " mc-item--warn" : ""}`}>{f.message}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mc-h2">Aufgaben · letzte {windowDays} Tage, hochgerechnet auf einen Monat</h2>
        <div className="mc-card mc-scroll">
          <table className="mc-table">
            <thead>
              <tr>
                <th>Aufgabe</th>
                <th>Modell</th>
                <th className="mc-num">Aufrufe/Monat</th>
                <th className="mc-num">Ø Tokens in/out</th>
                <th className="mc-num">USD/Monat</th>
                <th>Empfehlung</th>
              </tr>
            </thead>
            <tbody>
              {active.map((r) => (
                <TaskRow key={r.task} row={r} />
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="mc-muted">Summe (ca., ohne Preis-fehlt-Modelle)</td>
                <td className="mc-num">{usd(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
          {idle.length > 0 && (
            <p className="mc-sub" style={{ marginTop: 10 }}>
              Ohne Aufrufe in den letzten {windowDays} Tagen:{" "}
              {idle.map((r) => `${r.label} (${r.currentLabel})`).join(", ")}.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mc-h2">Katalog · USD pro Million Tokens</h2>
        <div className="mc-card mc-scroll">
          <table className="mc-table">
            <thead>
              <tr>
                <th>Modell</th>
                <th className="mc-num">Input</th>
                <th className="mc-num">Output</th>
                <th>Status</th>
                <th>Abschaltung</th>
                <th>Erschienen</th>
                <th>In API</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {mainCatalog.map((c) => (
                // Key mit den Werten: nach Speichern und Refresh neu aufbauen,
                // damit die Felder den gespeicherten Stand zeigen.
                <CatalogRow key={catalogKey(c)} model={c} />
              ))}
              {oldCatalog.length > 0 && (
                <tr>
                  <td colSpan={8}>
                    <button
                      type="button"
                      className="mc-toggle"
                      aria-expanded={showOld}
                      onClick={() => setShowOld((x) => !x)}
                    >
                      {showOld ? "▾" : "▸"} Ältere Modelle ohne Preis ({oldCatalog.length})
                    </button>
                  </td>
                </tr>
              )}
              {showOld && oldCatalog.map((c) => <CatalogRow key={catalogKey(c)} model={c} />)}
            </tbody>
          </table>
          <p className="mc-sub" style={{ marginTop: 10 }}>
            Die Models API liefert keine Preise. Neue Modelle erscheinen nach dem Prüflauf hier mit leerem Preis.
            Wählbar sind nur Modelle aus src/lib/ai/models.ts.
          </p>
        </div>
      </section>
    </div>
  );
}

function TaskRow({ row }: { row: TaskRowView }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function switchTo(rec: RecView) {
    const note = rec.needsComparison ? "\n\nEmpfohlen: vorher an ein paar echten Beispielen testen." : "";
    if (!window.confirm(`${row.label}: auf ${rec.targetLabel} wechseln?${note}`)) return;
    setError(null);
    start(async () => {
      try {
        unwrapAction(await switchTaskModel(row.task, rec.targetModel));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Wechsel fehlgeschlagen.");
      }
    });
  }

  return (
    <tr>
      <td>
        {row.label}
        <div className="mc-sub mc-model">{row.task}</div>
      </td>
      <td className="mc-model">{row.currentLabel}</td>
      <td className="mc-num">{calls(row.callsPerMonth)}</td>
      <td className="mc-num">
        {row.avgInput === null ? "–" : `${row.avgInput} / ${row.avgOutput}`}
        {row.avgInput !== null && !row.measured && <div className="mc-sub">Prognose</div>}
      </td>
      <td className="mc-num">{usd(row.costPerMonth)}</td>
      <td>
        {row.recs.length === 0 ? (
          <span className="mc-muted">–</span>
        ) : (
          row.recs.map((rec) => (
            <div key={rec.kind + rec.targetModel} className="mc-rec">
              <div className="mc-rec-line">
                <span className={`mc-chip mc-chip--${rec.kind}`}>{rec.kindLabel}</span>
                <span className="mc-model">→ {rec.targetLabel}</span>
                {rec.delta && <span className="mc-model mc-muted">{rec.delta}</span>}
                <button type="button" className="mc-btn mc-btn--ghost" disabled={pending} onClick={() => switchTo(rec)}>
                  {pending ? "…" : "Wechseln"}
                </button>
              </div>
              <div className="mc-sub">
                {rec.reason}
                {rec.needsComparison ? " Vor dem Wechsel an echten Beispielen testen." : ""}
              </div>
            </div>
          ))
        )}
        {error && <div role="alert" className="mc-err">{error}</div>}
      </td>
    </tr>
  );
}

function CatalogRow({ model }: { model: CatalogView }) {
  const router = useRouter();
  const init = {
    inputPerMTok: model.inputPerMTok === null ? "" : String(model.inputPerMTok),
    outputPerMTok: model.outputPerMTok === null ? "" : String(model.outputPerMTok),
    status: model.status,
    retirementDate: model.retirementDate,
  };
  const [v, setV] = useState(init);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(v) !== JSON.stringify(init);
  // Orange nur, wo der Preis zaehlt (waehlbar, im Einsatz oder neu).
  const missing = (model.inputPerMTok === null || model.outputPerMTok === null) && (model.selectable || model.inUse || model.recent);

  function save() {
    setError(null);
    start(async () => {
      try {
        unwrapAction(await saveCatalogModel(model.modelId, v));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <tr>
      <td>
        <span className="mc-model">{model.label}</span>
        <div className="mc-sub">
          {model.modelId}
          {model.selectable ? " · wählbar" : ""}
          {model.inUse ? " · im Einsatz" : ""}
        </div>
        {model.longTier && <div className="mc-sub">{model.longTier}</div>}
      </td>
      <td className="mc-num">
        <input
          className={`mc-input${missing ? " mc-input--missing" : ""}`}
          inputMode="decimal"
          aria-label={`Input-Preis ${model.label}`}
          value={v.inputPerMTok}
          placeholder="fehlt"
          onChange={(e) => setV({ ...v, inputPerMTok: e.target.value })}
        />
      </td>
      <td className="mc-num">
        <input
          className={`mc-input${missing ? " mc-input--missing" : ""}`}
          inputMode="decimal"
          aria-label={`Output-Preis ${model.label}`}
          value={v.outputPerMTok}
          placeholder="fehlt"
          onChange={(e) => setV({ ...v, outputPerMTok: e.target.value })}
        />
      </td>
      <td>
        <select
          className="mc-select"
          aria-label={`Status ${model.label}`}
          value={v.status}
          onChange={(e) => setV({ ...v, status: e.target.value })}
        >
          <option value="active">aktiv</option>
          <option value="deprecated">abgekündigt</option>
          <option value="retired">abgeschaltet</option>
        </select>
      </td>
      <td>
        <input
          type="date"
          className="mc-input mc-input--date"
          aria-label={`Abschaltdatum ${model.label}`}
          value={v.retirementDate}
          onChange={(e) => setV({ ...v, retirementDate: e.target.value })}
        />
      </td>
      <td className="mc-model">{model.releasedLabel}</td>
      <td className="mc-model">{model.seenLabel}</td>
      <td>
        {dirty && (
          <button type="button" className="mc-btn mc-btn--ghost" onClick={save} disabled={pending}>
            {pending ? "…" : "Speichern"}
          </button>
        )}
        {error && <div role="alert" className="mc-err">{error}</div>}
      </td>
    </tr>
  );
}
